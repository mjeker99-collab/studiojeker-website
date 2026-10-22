import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit, type Tx } from "../workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { studioConfig } from "../studio/config";
import { ProviderFailure } from "../studio/provider";
import { customerKnowledgeContext } from "../customer-knowledge";
import { assistantInput, validatedDocument, suggestionSchema } from "./input";
import { generateWebsite, type WebsiteContext } from "./provider";
import { publicationMutation } from "./publication";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const versionInput = z.object({ version: z.number().int().positive() });
const kind = "WEBSITE_ASSISTANT";
async function project(tx: Tx, actor: string, id: string, version?: number) {
  await hubActor(tx, actor);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"website:" + id}))`;
  const p = await tx.websiteProject.findFirst({
    where: { id, organizationId: ORG },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!p) throw new PolicyError("Website nicht zugänglich.", 404);
  if (version !== undefined && p.version !== version)
    throw new PolicyError(
      "Website wurde inzwischen geändert. Bitte neu laden; eigene Änderungen vorher kopieren.",
      409,
    );
  return p;
}
async function save(
  tx: Tx,
  actor: string,
  id: string,
  version: number,
  payload: unknown,
) {
  const current = await project(tx, actor, id, version);
  const data = validatedDocument.parse(payload);
  await tx.websiteVersion.create({
    data: {
      projectId: id,
      version: version + 1,
      payload: json(data),
      createdBy: actor,
    },
  });
  await tx.websiteProject.update({
    where: { id: current.id },
    data: { version: version + 1, name: data.name },
  });
  await audit(tx, actor, "WEBSITE_SAVED", id, { version: version + 1 });
  return { id, version: version + 1 };
}
export async function websiteList(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const [projects, customers, images] = await Promise.all([
    db.websiteProject.findMany({
      where: { organizationId: ORG },
      orderBy: { updatedAt: "desc" },
    }),
    db.customer.findMany({
      where: { organizationId: ORG, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.studioAsset.findMany({
      where: {
        organizationId: ORG,
        deletedAt: null,
        mime: { in: ["image/jpeg", "image/png", "image/webp"] },
      },
      select: { id: true, name: true, mime: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const c = studioConfig();
  return {
    projects,
    customers,
    images,
    config: {
      connected: c.connected,
      model: c.textModel,
      reserveUsd: c.textReserve * 3,
    },
  };
}
export async function websiteState(actor: string, id: string) {
  return db.$transaction(async (tx) => {
    const p = await project(tx, actor, id);
    const [versions, jobs] = await Promise.all([
      tx.websiteVersion.findMany({
        where: { projectId: id },
        orderBy: { version: "desc" },
        select: { version: true, createdAt: true },
      }),
      tx.studioJob.findMany({
        where: {
          organizationId: ORG,
          kind,
          input: { path: ["projectId"], equals: id },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          error: true,
          input: true,
          result: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      ...p,
      publication: await tx.websitePublication.findUnique({
        where: { projectId: id },
        select: {
          slug: true,
          version: true,
          revision: true,
          active: true,
          publishedAt: true,
        },
      }),
      document: validatedDocument.parse(p.versions[0].payload),
      versions,
      jobs: jobs.map((j) => {
        const i = j.input as { version: number; message: string };
        return {
          id: j.id,
          status: j.status,
          error: j.error,
          version: i.version,
          message: i.message,
          result: j.result ? suggestionSchema.parse(j.result) : null,
          createdAt: j.createdAt,
        };
      }),
    };
  });
}
export async function websiteVersion(
  actor: string,
  id: string,
  version: number,
) {
  await db.$transaction((tx) => project(tx, actor, id));
  const v = await db.websiteVersion.findUnique({
    where: { projectId_version: { projectId: id, version } },
  });
  if (!v) throw new PolicyError("Website-Version fehlt.", 404);
  return validatedDocument.parse(v.payload);
}
export async function websiteMutation(
  actor: string,
  path: string[],
  raw: unknown,
) {
  if (path.length === 1) {
    const input = z
      .object({
        customerId: z.string().min(1).nullable(),
        document: validatedDocument,
      })
      .strict()
      .parse(raw);
    return db.$transaction(async (tx) => {
      await hubActor(tx, actor);
      if (
        input.customerId &&
        !(await tx.customer.findFirst({
          where: {
            id: input.customerId,
            organizationId: ORG,
            status: "ACTIVE",
          },
        }))
      )
        throw new PolicyError("Kunde nicht zugänglich.", 403);
      const p = await tx.websiteProject.create({
        data: {
          organizationId: ORG,
          customerId: input.customerId,
          name: input.document.name,
          createdBy: actor,
          versions: {
            create: {
              version: 1,
              payload: json(input.document),
              createdBy: actor,
            },
          },
        },
      });
      await audit(tx, actor, "WEBSITE_CREATED", p.id, { version: 1 });
      return { id: p.id, version: 1 };
    });
  }
  const id = path[1];
  if (path.length === 3 && ["publish", "unpublish"].includes(path[2]))
    return publicationMutation(actor, id, path[2], raw);
  if (path.length === 2) {
    const input = versionInput
      .extend({ document: validatedDocument })
      .strict()
      .parse(raw);
    return db.$transaction((tx) =>
      save(tx, actor, id, input.version, input.document),
    );
  }
  if (path.length === 3 && path[2] === "restore") {
    const input = versionInput
      .extend({ restoreVersion: z.number().int().positive() })
      .strict()
      .parse(raw);
    return db.$transaction(async (tx) => {
      await project(tx, actor, id, input.version);
      const previous = await tx.websiteVersion.findUnique({
        where: {
          projectId_version: { projectId: id, version: input.restoreVersion },
        },
      });
      if (!previous) throw new PolicyError("Version fehlt.", 404);
      return save(tx, actor, id, input.version, previous.payload);
    });
  }
  if (path.length === 3 && path[2] === "apply") {
    const input = versionInput
      .extend({ jobId: z.string().min(1) })
      .strict()
      .parse(raw);
    return db.$transaction(async (tx) => {
      await project(tx, actor, id, input.version);
      const job = await tx.studioJob.findFirst({
        where: {
          id: input.jobId,
          organizationId: ORG,
          kind,
          status: "SUCCEEDED",
          input: { path: ["projectId"], equals: id },
        },
      });
      if (!job || (job.input as { version: number }).version !== input.version)
        throw new PolicyError(
          "Vorschlag gehört nicht zum aktuellen Website-Stand. Bitte GPT neu beauftragen.",
          409,
        );
      const result = suggestionSchema.parse(job.result);
      if (!result.document)
        throw new PolicyError(
          "Diese Antwort enthält noch keinen Website-Entwurf.",
        );
      return save(tx, actor, id, input.version, result.document);
    });
  }
  if (path.length === 3 && path[2] === "assist")
    return assistWebsite(actor, id, raw);
  throw new PolicyError("Nicht gefunden.", 404);
}
export async function assistWebsite(
  actor: string,
  id: string,
  raw: unknown,
  provider = generateWebsite,
) {
  const input = assistantInput.parse(raw);
  const config = studioConfig();
  const reservation = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-jobs:" + ORG}))`;
    const existing = await tx.studioJob.findUnique({
      where: { requestKey: input.requestKey },
    });
    if (existing) {
      const previous = existing.input as { projectId: string };
      if (
        existing.organizationId !== ORG ||
        existing.userId !== actor ||
        existing.kind !== kind ||
        previous.projectId !== id ||
        JSON.stringify(
          assistantInput.parse(
            Object.fromEntries(
              Object.entries(previous).filter(
                ([k]) => k !== "projectId" && k !== "context",
              ),
            ),
          ),
        ) !== JSON.stringify(input)
      )
        throw new PolicyError(
          "Auftragsschlüssel bereits anders verwendet.",
          409,
        );
      await project(tx, actor, id);
      if (existing.status === "SUCCEEDED")
        return {
          job: existing,
          cached: suggestionSchema.parse(existing.result),
        };
      throw new PolicyError(
        existing.error ||
          "Auftrag wurde bereits gestartet. Keine automatische Wiederholung.",
        409,
      );
    }
    const p = await project(tx, actor, id, input.version);
    if (!config.connected)
      throw new PolicyError(
        "GPT ist nicht verbunden. KI-Verbindung in den Einstellungen prüfen.",
        503,
      );
    const customer = p.customerId
      ? await tx.customer.findFirst({
          where: { id: p.customerId, organizationId: ORG, status: "ACTIVE" },
        })
      : null;
    if (p.customerId && !customer)
      throw new PolicyError(
        "Kunde ist nicht mehr zugänglich oder inaktiv.",
        403,
      );
    await tx.studioJob.updateMany({
      where: {
        organizationId: ORG,
        kind,
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - 180000) },
      },
      data: {
        status: "UNKNOWN",
        error:
          "Auftrag unterbrochen; Ergebnis/Kosten unklar. Keine automatische Wiederholung.",
        completedAt: new Date(),
      },
    });
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const jobs = await tx.studioJob.findMany({
      where: { organizationId: ORG, createdAt: { gte: since } },
      select: { reserveUsd: true },
    });
    const reserveUsd = config.textReserve * 3;
    if (
      jobs.length >= config.dailyRequests ||
      jobs.reduce((s, j) => s + j.reserveUsd, 0) + reserveUsd >
        config.dailyBudget + 1e-9
    )
      throw new PolicyError("Tageslimit für KI-Aufträge/Budget erreicht.", 429);
    if (
      await tx.studioJob.count({
        where: { organizationId: ORG, status: { in: ["QUEUED", "RUNNING"] } },
      })
    )
      throw new PolicyError(
        "Ein KI-Auftrag läuft bereits. Bitte zuerst abschliessen.",
        409,
      );
    const history = await tx.studioJob.findMany({
      where: {
        organizationId: ORG,
        kind,
        status: "SUCCEEDED",
        input: { path: ["projectId"], equals: id },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const context: WebsiteContext = {
      document: validatedDocument.parse(p.versions[0].payload),
      customer: customer
        ? customerKnowledgeContext(customer)
        : { name: "Studiojeker" },
      message: input.message,
      history: history.reverse().map((j) => ({
        message: (j.input as { message: string }).message,
        reply: suggestionSchema.parse(j.result).reply,
      })),
    };
    const job = await tx.studioJob.create({
      data: {
        organizationId: ORG,
        requestKey: input.requestKey,
        kind,
        status: "RUNNING",
        input: json({ ...input, projectId: id, context }),
        model: config.textModel,
        reserveUsd,
        userId: actor,
        startedAt: new Date(),
      },
    });
    await audit(tx, actor, "WEBSITE_ASSISTANT_STARTED", id, {
      version: input.version,
      jobId: job.id,
    });
    return { job, cached: null };
  });
  if (reservation.cached)
    return { jobId: reservation.job.id, ...reservation.cached };
  try {
    const response = await provider(
      (reservation.job.input as unknown as { context: WebsiteContext }).context,
      reservation.job.model,
    );
    const result = suggestionSchema.parse(response.result);
    if (result.document) validatedDocument.parse(result.document);
    await db.studioJob.update({
      where: { id: reservation.job.id },
      data: {
        status: "SUCCEEDED",
        result: json(result),
        usage: json(response.usage),
        providerRequestId: response.requestId,
        completedAt: new Date(),
      },
    });
    return { jobId: reservation.job.id, ...result };
  } catch (e) {
    const uncertain = !(e instanceof ProviderFailure) || e.uncertain;
    const error =
      e instanceof ProviderFailure
        ? e.message
        : "Website-Auftrag unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.";
    await db.studioJob.updateMany({
      where: { id: reservation.job.id, status: "RUNNING" },
      data: {
        status: uncertain ? "UNKNOWN" : "FAILED",
        error,
        completedAt: new Date(),
      },
    });
    throw new PolicyError(error, 502);
  }
}
