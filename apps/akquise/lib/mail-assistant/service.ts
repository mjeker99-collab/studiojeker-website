import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { studioConfig } from "../studio/config";
import { ProviderFailure } from "../studio/provider";
import { audit } from "../workflow";
import {
  mailAssistantInput as assistantInput,
  mailAssistantResult,
} from "./input";
import { z } from "zod";
import {
  isTeamMailbox,
  normalizeEmail,
  personKey,
} from "../contact-identity";
import { contactInput } from "../import";
import { importContacts, editDraft } from "../workflow";
import { blockedAiMessage, qualifyResearchLead } from "./qualify";
import { generateMailAssistant } from "./provider";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const kind = "MAIL_ASSISTANT";
export async function assistMail(
  actor: string,
  raw: unknown,
  provider = generateMailAssistant,
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
      if (
        existing.organizationId !== ORG ||
        existing.userId !== actor ||
        existing.kind !== kind ||
        JSON.stringify(assistantInput.parse(existing.input)) !==
          JSON.stringify(input)
      )
        throw new PolicyError(
          "Auftragsschlüssel bereits anders verwendet.",
          409,
        );
      if (existing.status === "SUCCEEDED")
        return { cached: existing.result, job: existing };
      throw new PolicyError(
        existing.error ||
          "Recherche läuft oder wurde bereits gestartet. Keine automatische Wiederholung.",
        409,
      );
    }
    if (!config.connected) throw new PolicyError(blockedAiMessage, 503);
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
          "Recherche unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.",
        completedAt: new Date(),
      },
    });
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const jobs = await tx.studioJob.findMany({
      where: { organizationId: ORG, createdAt: { gte: since } },
      select: { reserveUsd: true },
    });
    const reserveUsd = config.textReserve * (input.mode === "RESEARCH" ? 3 : 1);
    if (
      jobs.length >= config.dailyRequests ||
      jobs.reduce((sum, job) => sum + job.reserveUsd, 0) + reserveUsd >
        config.dailyBudget + 1e-9
    )
      throw new PolicyError(
        "Tageslimit für Aufträge/Budgetreservierungen erreicht.",
        429,
      );
    if (
      await tx.studioJob.count({
        where: { organizationId: ORG, status: { in: ["QUEUED", "RUNNING"] } },
      })
    )
      throw new PolicyError(
        "Ein KI-Auftrag wartet oder läuft bereits. Bitte zuerst abschliessen.",
        409,
      );
    const job = await tx.studioJob.create({
      data: {
        organizationId: ORG,
        requestKey: input.requestKey,
        kind,
        status: "RUNNING",
        input: json(input),
        model: config.textModel,
        reserveUsd,
        userId: actor,
        startedAt: new Date(),
      },
    });
    await audit(tx, actor, "MAIL_ASSISTANT_STARTED", job.id, {
      mode: input.mode,
    });
    return { cached: null, job };
  });
  if (reservation.cached)
    return { id: reservation.job.id, result: reservation.cached };
  try {
    const known =
      input.mode === "RESEARCH"
        ? await db.contact.findMany({
            where: { organizationId: ORG },
            orderBy: { updatedAt: "desc" },
            take: 500,
            select: {
              organisation: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
        : [];
    let providerFacts: unknown = known;
    if (input.mode === "WRITE") {
      const facts = await db.draft.findMany({
        where: {
          id: { in: input.items.map((i) => i.id) },
          contact: { organizationId: ORG },
        },
        include: {
          contact: true,
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      });
      if (
        facts.length !== input.items.length ||
        facts.some(
          (d) =>
            !input.items.some((i) => i.id === d.id && i.version === d.version),
        )
      )
        throw new ProviderFailure(
          false,
          "Ein Entwurf wurde geändert. Vorschau neu laden.",
        );
      providerFacts = facts.map((d) => ({
        id: d.id,
        version: d.version,
        subject: d.versions[0]?.subject,
        body: d.versions[0]?.body,
        contact: {
          organisation: d.contact.organisation,
          firstName: d.contact.firstName,
          lastName: d.contact.lastName,
          industry: d.contact.industry,
          hook: d.contact.hook,
          service: d.contact.service,
          sourceUrl: d.contact.sourceUrl,
          mailbox: isTeamMailbox(d.contact.email)
            ? "Team-Postfach, Unternehmensadresse"
            : "",
        },
      }));
    }
    const response = await provider(
      input,
      reservation.job.model,
      providerFacts,
    );
    await db.studioJob.update({
      where: { id: reservation.job.id },
      data: {
        status: "SUCCEEDED",
        result: json(response.result),
        usage: json(response.usage),
        providerRequestId: response.requestId,
        completedAt: new Date(),
      },
    });
    return { id: reservation.job.id, result: response.result };
  } catch (e) {
    const uncertain = !(e instanceof ProviderFailure) || e.uncertain;
    const error =
      e instanceof ProviderFailure
        ? e.message
        : "Recherche unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.";
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

export async function mailAssistantHistory(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  return db.studioJob.findMany({
    where: { organizationId: ORG, userId: actor, kind },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      input: true,
      result: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });
}
type MailApplyResult =
  | {
      imported: number;
      duplicates: number;
      excluded: { reason: string; count: number }[];
    }
  | { results: { id: string; ok: boolean; message: string }[] };
export async function applyMailAssistant(
  actor: string,
  raw: unknown,
): Promise<MailApplyResult> {
  const input = z
    .object({
      id: z.string(),
      indices: z.array(z.number().int().min(0).max(19)).max(20).optional(),
    })
    .strict()
    .parse(raw);
  await db.$transaction((tx) => hubActor(tx, actor));
  const job = await db.studioJob.findFirst({
    where: {
      id: input.id,
      userId: actor,
      organizationId: ORG,
      kind,
      status: "SUCCEEDED",
    },
  });
  if (!job)
    throw new PolicyError("Gespeicherter Vorschlag nicht gefunden.", 404);
  const request = assistantInput.parse(job.input);
  const result = mailAssistantResult.parse(job.result);
  if (request.mode === "RESEARCH") {
    const indices = [
      ...new Set(input.indices || result.leads.map((_, i) => i)),
    ];
    if (!indices.length || indices.some((i) => !result.leads[i]))
      throw new PolicyError("Mindestens einen gefundenen Kontakt auswählen.");
    const candidates = indices.map((i) => result.leads[i]);
    const existing = await db.contact.findMany({
      where: {
        organizationId: ORG,
        OR: [
          {
            personKey: {
              in: candidates.map((lead) =>
                personKey(lead.firstName, lead.lastName, lead.organisation),
              ),
            },
          },
          ...candidates
            .map((lead) => normalizeEmail(lead.email))
            .filter((email) => email.includes("@"))
            .map((email) => ({
              email: { equals: email, mode: "insensitive" as const },
            })),
        ],
      },
      select: { email: true, personKey: true },
    });
    const known = {
      emails: new Set(existing.map((c) => normalizeEmail(c.email))),
      keys: new Set(existing.map((c) => c.personKey)),
    };
    const excluded: string[] = [];
    const accepted = candidates.flatMap((lead) => {
      const decision = qualifyResearchLead(lead, known);
      if (!decision.ok) {
        excluded.push(decision.reason);
        return [];
      }
      known.emails.add(decision.email);
      known.keys.add(personKey(lead.firstName, lead.lastName, lead.organisation));
      return [{ lead, decision }];
    });
    const grouped = [...new Set(excluded)].map((reason) => ({
      reason,
      count: excluded.filter((item) => item === reason).length,
    }));
    const duplicates =
      grouped.find((item) => item.reason === "Bereits in der Masterliste.")
        ?.count ?? 0;
    const rejected = grouped.filter(
      (item) => item.reason !== "Bereits in der Masterliste.",
    );
    if (!accepted.length)
      return { imported: 0, duplicates, excluded: rejected };
    const rows = accepted.map(({ lead, decision }) =>
      contactInput.parse({
        ...lead,
        email: decision.email,
        notes: `KI-Recherche vom ${job.createdAt.toISOString()}. Quelle: ${lead.sourceUrl}. ${decision.teamMailbox ? "Postfachart: Team-Postfach. " : ""}Angaben vor Versand gemeinsam bestätigen.`,
      }),
    );
    const imported = await importContacts(actor, rows);
    const freshTeamKeys = accepted
      .filter((item) => item.decision.teamMailbox)
      .map((item) =>
        personKey(
          item.lead.firstName,
          item.lead.lastName,
          item.lead.organisation,
        ),
      )
      .filter((key) => !existing.some((contact) => contact.personKey === key));
    if (freshTeamKeys.length)
      await db.contact.updateMany({
        where: {
          organizationId: ORG,
          personKey: { in: freshTeamKeys },
          confidence: "UNCONFIRMED",
        },
        data: { confidence: "GENERAL" },
      });
    return {
      imported: imported.imported,
      duplicates: imported.duplicates + duplicates,
      excluded: rejected,
    };
  }
  const results = [];
  for (const m of result.mails) {
    try {
      const d = await db.draft.findFirst({
        where: { id: m.id, contact: { organizationId: ORG } },
        include: {
          contact: true,
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      });
      if (!d || !d.versions[0])
        throw new PolicyError("Entwurf nicht gefunden.");
      const current = d.versions[0];
      if (current.contactRevision !== d.contact.revision)
        throw new PolicyError(
          "Kontakt wurde geändert. Mailvorschau aktualisieren.",
          409,
        );
      if (
        d.version === m.version + 1 &&
        current.subject === m.subject &&
        current.body === m.body
      ) {
        results.push({
          id: m.id,
          ok: true,
          message: "Text bereits übernommen",
        });
        continue;
      }
      const preserved =
        current.body.match(
          /!?\[[^\n]*?\]\((?:https?:\/\/|\/api\/studio\/assets\/)[^\s)]+\)/g,
        ) || [];
      const originalUrls = current.body.match(/https?:\/\/[^\s)<>]+/g) || [];
      if (
        preserved.some((token) => !m.body.includes(token)) ||
        originalUrls.some((url) => !m.body.includes(url))
      )
        throw new PolicyError(
          "GPT hat vorhandene Bilder oder Links verändert. Der ursprüngliche Entwurf bleibt erhalten.",
        );
      await editDraft(actor, m.id, m.version, {
        recipient: d.versions[0].recipient,
        subject: m.subject,
        body: m.body,
      });
      results.push({
        id: m.id,
        ok: true,
        message: "Persönlicher Mailtext gespeichert",
      });
    } catch (e) {
      results.push({
        id: m.id,
        ok: false,
        message: e instanceof Error ? e.message : "Text nicht gespeichert",
      });
    }
  }
  return { results };
}
