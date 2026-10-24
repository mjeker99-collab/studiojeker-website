import {
  prepareDriveImages,
  readDriveImages,
  driveId,
  type DriveSelection,
} from "../drive/service";
import { campaignConcept } from "../concepts/service";
import { conceptInput } from "../concepts/input";
import { customerKnowledgeContext } from "../customer-knowledge";
import { assistantContext } from "./context";
import { brandDefaults } from "../library/input";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { db } from "../db";
import { contentInput, type ContentInput } from "../hub/input";
import { saveContentInTx, hubActor } from "../hub/workflow";
import { audit } from "../workflow";
import { PolicyError } from "../policy";
import {
  briefingSchema,
  ORG,
  generatedPostSchema,
  type StudioSnapshot,
} from "./input";
import { publicConfig, studioConfig, logoHash } from "./config";
import { readAsset, storeAsset } from "./assets";
import { openAIProvider, ProviderFailure, type AIProvider } from "./provider";
import type { ObjectStore } from "./storage";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export async function studioState(actor: string, selectedSeriesId?: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const [series, assets, brand, jobs, campaigns, users, customers] =
    await Promise.all([
      db.studioSeries.findMany({
        where: {
          organizationId: ORG,
          concept: { is: null },
          ...(selectedSeriesId ? { id: selectedSeriesId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          contents: {
            orderBy: { createdAt: "asc" },
            include: {
              versions: { orderBy: { version: "desc" }, take: 1 },
              approvals: {
                orderBy: { createdAt: "desc" },
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      }),
      db.studioAsset.findMany({
        where: {
          organizationId: ORG,
          deletedAt: null,
          libraryItem: { is: { archivedAt: null } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          id: true,
          name: true,
          mime: true,
          size: true,
          sha256: true,
          kind: true,
          width: true,
          height: true,
        },
      }),
      db.studioOrganization.findUniqueOrThrow({ where: { id: ORG } }),
      db.studioJob.findMany({
        where: {
          organizationId: ORG,
          series: { concept: { is: null } },
          ...(selectedSeriesId ? { seriesId: selectedSeriesId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: selectedSeriesId ? undefined : 100,
        select: {
          id: true,
          seriesId: true,
          kind: true,
          status: true,
          model: true,
          reserveUsd: true,
          error: true,
          usage: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          providerRequestId: true,
          result: true,
          input: true,
        },
      }),
      db.campaign.findMany({
        where: { organizationId: ORG },
        select: {
          id: true,
          title: true,
          customerId: true,
          goal: true,
          audience: true,
        },
      }),
      db.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
      }),
      db.customer.findMany({
        where: { organizationId: ORG, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  return {
    assistantUser: await db.user.findUniqueOrThrow({
      where: { id: actor },
      select: {
        id: true,
        name: true,
        studioContext: true,
        studioContextRevision: true,
      },
    }),
    organization: { name: brand.name, revision: brand.brandRevision },
    series,
    assets,
    brand: brand.brand,
    jobs,
    campaigns,
    users,
    customers,
    config: publicConfig(),
  };
}
export async function createSeries(actor: string, raw: unknown) {
  const brief = briefingSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      await hubActor(tx, actor);
      if (
        brief.campaignId &&
        !(await tx.campaign.findFirst({
          where: {
            id: brief.campaignId,
            organizationId: ORG,
            customerId: brief.customerId,
          },
        }))
      )
        throw new PolicyError(
          "Kampagne gehört nicht zum gewählten Kunden.",
          403,
        );
      if (
        brief.customerId &&
        !(await tx.customer.findFirst({
          where: {
            id: brief.customerId,
            organizationId: ORG,
            status: "ACTIVE",
          },
        }))
      )
        throw new PolicyError("Kunde nicht zugänglich.", 403);
      if (
        (await tx.studioAsset.count({
          where: {
            id: { in: brief.referenceAssetIds },
            organizationId: ORG,
            deletedAt: null,
            mime: { startsWith: "image/" },
            libraryItem: { is: { archivedAt: null } },
          },
        })) !== new Set(brief.referenceAssetIds).size
      )
        throw new PolicyError("Referenz nicht zugänglich.", 403);
      const brandRecord = await tx.studioOrganization.findUniqueOrThrow({
        where: { id: ORG },
      });
      const brandProfile = brandDefaults(brandRecord.brand);
      const brandLogo = brandProfile.logoAssetId
        ? await tx.studioAsset.findFirst({
            where: {
              id: brandProfile.logoAssetId,
              organizationId: ORG,
              deletedAt: null,
            },
          })
        : null;
      const brandFont = brandProfile.fontAssetId
        ? await tx.studioAsset.findFirst({
            where: {
              id: brandProfile.fontAssetId,
              organizationId: ORG,
              deletedAt: null,
              kind: "FONT",
            },
          })
        : null;
      if (
        (brief.libraryReferenceIds?.length || 0) !==
        (await tx.libraryItem.count({
          where: {
            id: { in: brief.libraryReferenceIds || [] },
            organizationId: ORG,
            archivedAt: null,
          },
        }))
      )
        throw new PolicyError("Bibliotheksreferenz nicht zugänglich.", 403);
      const series = await tx.studioSeries.create({
        data: {
          title: brief.title,
          customerId: brief.customerId,
          briefing: json(brief),
          ownerId: actor,
          organizationId: ORG,
        },
      });
      for (let i = 0; i < brief.count; i++) {
        const studio: StudioSnapshot = {
          organizationId: ORG,
          seriesId: series.id,
          brandVersion: "studio-v1",
          brandProfile,
          brandRevision: brandRecord.brandRevision,
          ...(brandLogo ? { brandLogoSha256: brandLogo.sha256 } : {}),
          imageIdea: "",
          headline: "",
          hashtags: "",
          motifAssetId: null,
          motifSha256: "",
          fontAssetId: brandFont?.id || null,
          fontSha256: brandFont?.sha256 || "",
          logoSha256: logoHash(),
          template: "PANEL",
          formats: brief.formats,
          cropX: 0.5,
          cropY: 0.5,
          zoom: 1,
          showLogo: true,
          showClaim: false,
          showHeadline: false,
          source: "OWN",
        };
        await saveContentInTx(
          tx,
          actor,
          contentInput.parse({
            kind: "SOCIAL",
            title: `${brief.title} · ${i + 1}`,
            ownerId: actor,
            campaignId: brief.campaignId,
            scheduledAt: null,
            subject: "",
            preheader: "",
            body: "",
            audience: brief.audience,
            studio,
            variants: brief.channels.map((channel) => ({
              channel,
              text: brief.topic,
              link: "",
              cta: "",
              mediaType: "NONE",
              mediaUrl: "",
              mediaReference: "",
              scheduledAt: null,
            })),
          }),
        );
      }
      await audit(tx, actor, "STUDIO_SERIES_CREATED", series.id, {
        count: brief.count,
      });
      return series;
    },
    { timeout: 15000 },
  );
}
const requestSchema = z
  .object({
    seriesId: z.string().min(1),
    kind: z.enum(["TEXT", "IMAGE", "CHAT"]),
    message: z.string().trim().min(1).max(4000).optional(),
    conceptVersion: z.number().int().positive().optional(),
    mediaIntent: z.enum(["IMAGE", "VIDEO"]).optional(),
    photoEdit: z.literal(true).optional(),
    replyToJobId: z.string().min(1).max(100).optional(),
    useProjectMemory: z.boolean().default(true),
    contentId: z.string().nullable(),
    requestKey: z.string().uuid(),
    referenceIds: z.array(z.string()).max(4),
    driveReferenceIds: z.array(driveId).max(4).default([]),
    referenceRights: z.boolean(),
    referenceTransfer: z.boolean(),
    confirmedCosts: z.literal(true),
  })
  .strict();
export async function queueJob(actor: string, raw: unknown) {
  const data = requestSchema.parse(raw),
    config = studioConfig();
  if (data.kind === "CHAT" && !data.message)
    throw new PolicyError("Nachricht fehlt.");
  if (data.replyToJobId && data.kind !== "CHAT" && !data.photoEdit)
    throw new PolicyError(
      "Eine Antwort benötigt einen Dialog oder eine Bildbearbeitung.",
    );
  if (
    data.photoEdit &&
    (data.kind !== "IMAGE" ||
      !data.message ||
      data.referenceIds.length + data.driveReferenceIds.length !== 1)
  )
    throw new PolicyError(
      "Bildbearbeitung benötigt einen Bildauftrag, eine Anweisung und genau ein Ausgangsbild.",
    );
  if (data.kind !== "CHAT" && data.mediaIntent)
    throw new PolicyError("Bild- und Videoaufträge gehören in den GPT-Dialog.");
  if (!config.connected)
    throw new PolicyError(
      "KI: Nicht verbunden. API-Schlüssel und CONTENT_AI_ENABLED serverseitig konfigurieren.",
      503,
    );
  if (data.kind === "IMAGE" && config.storage === "DISCONNECTED")
    throw new PolicyError("Privater Bildspeicher: Nicht verbunden.", 503);
  if (data.driveReferenceIds.length && data.kind !== "CHAT" && !data.photoEdit)
    throw new PolicyError("Drive-Bilder sind nur im GPT-Chat verfügbar.");
  if (
    data.referenceIds.length + data.driveReferenceIds.length > 4 ||
    new Set(data.driveReferenceIds).size !== data.driveReferenceIds.length
  )
    throw new PolicyError(
      "Maximal vier unterschiedliche Bildreferenzen auswählen.",
    );
  if (
    data.driveReferenceIds.length &&
    (!data.referenceRights || !data.referenceTransfer)
  )
    throw new PolicyError(
      "Nutzungsrechte und Übermittlung ausdrücklich bestätigen.",
    );
  // Preserve idempotent retries even if Drive was subsequently disconnected.
  const existing = await db.studioJob.findUnique({
    where: { requestKey: data.requestKey },
  });
  if (existing) {
    const old = existing.input as { request: unknown };
    await db.$transaction((tx) => hubActor(tx, actor));
    if (
      existing.organizationId !== ORG ||
      (data.driveReferenceIds.length > 0 && existing.userId !== actor) ||
      digest(requestSchema.parse(old.request)) !== digest(data)
    )
      throw new PolicyError("Auftragsschlüssel bereits anders verwendet.", 409);
    return existing;
  }
  const driveSelection = data.driveReferenceIds.length
    ? await prepareDriveImages(actor, data.driveReferenceIds)
    : undefined;
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-jobs:" + ORG}))`;
    const previous = await tx.studioJob.findUnique({
      where: { requestKey: data.requestKey },
    });
    if (previous) {
      const prev = previous.input as Record<string, unknown>;
      if (
        previous.organizationId !== ORG ||
        (data.driveReferenceIds.length > 0 && previous.userId !== actor) ||
        digest(requestSchema.parse(prev.request)) !== digest(data)
      )
        throw new PolicyError(
          "Auftragsschlüssel bereits anders verwendet.",
          409,
        );
      return previous;
    }
    const conceptLink = await tx.strategyConcept.findUnique({
      where: { seriesId: data.seriesId },
      select: { id: true },
    });
    if (conceptLink)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"concept:" + conceptLink.id}))`;
    const series = await tx.studioSeries.findFirst({
      where: { id: data.seriesId, organizationId: ORG },
      include: {
        concept: {
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        },
        contents: {
          orderBy: { createdAt: "asc" },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    });
    if (!series) throw new PolicyError("Serie nicht zugänglich.", 403);
    let replyTo: { jobId: string; message: string; reply: string } | undefined;
    if (data.replyToJobId) {
      const proposal = await tx.studioJob.findFirst({
        where: {
          id: data.replyToJobId,
          organizationId: ORG,
          seriesId: data.seriesId,
          kind: "CHAT",
          status: "SUCCEEDED",
        },
      });
      const original = proposal?.input as
        { request?: { message?: string; mediaIntent?: string } } | undefined;
      const answer = proposal?.result as { reply?: unknown } | undefined;
      if (
        !proposal ||
        typeof answer?.reply !== "string" ||
        !answer.reply.trim()
      )
        throw new PolicyError(
          "GPT-Vorschlag nicht zugänglich oder noch nicht fertig.",
          403,
        );
      if (data.photoEdit && original?.request?.mediaIntent === "VIDEO")
        throw new PolicyError(
          "Ein Videoauftrag kann nicht als Bildbearbeitung ausgeführt werden.",
        );
      replyTo = {
        jobId: proposal.id,
        message: original?.request?.message || "",
        reply: answer.reply,
      };
    }
    if (
      series.concept &&
      (data.kind !== "CHAT" ||
        data.mediaIntent ||
        data.referenceIds.length ||
        data.driveReferenceIds.length)
    )
      throw new PolicyError(
        "Konzepte verwenden ausschliesslich den Textdialog.",
      );
    if (
      series.concept &&
      (data.conceptVersion !== series.concept.version ||
        !data.referenceTransfer)
    )
      throw new PolicyError(
        "Aktuelle Konzeptversion und Übermittlung bestätigen.",
        409,
      );
    const conceptPayload = series.concept
      ? conceptInput.parse(series.concept.versions[0].payload)
      : null;
    const conceptCustomer = conceptPayload?.customerId
      ? await tx.customer.findFirst({
          where: {
            id: conceptPayload.customerId,
            organizationId: ORG,
            status: "ACTIVE",
          },
          select: {
            name: true,
            website: true,
            notes: true,
            revision: true,
            knowledge: true,
          },
        })
      : null;
    if (conceptPayload?.customerId && !conceptCustomer)
      throw new PolicyError("Kunde nicht zugänglich oder inaktiv.", 403);
    const strategy = conceptPayload
      ? {
          mode: "STRATEGY",
          version: series.concept!.version,
          document: conceptPayload,
          customer: conceptCustomer
            ? customerKnowledgeContext(conceptCustomer)
            : { name: "Studiojeker" },
        }
      : undefined;
    const brief = briefingSchema.parse(series.briefing);
    const content =
      data.photoEdit && !data.contentId
        ? series.contents[0]
        : series.contents.find((c) => c.id === data.contentId);
    if (
      data.kind === "IMAGE" &&
      (!content ||
        (!data.photoEdit &&
          !contentInput.parse(content.versions[0].payload).studio?.imageIdea))
    )
      throw new PolicyError("Beitrag und Bildidee erforderlich.");
    if (
      (data.referenceIds.length || brief.libraryReferenceIds?.length || 0) &&
      (!data.referenceRights || !data.referenceTransfer)
    )
      throw new PolicyError(
        "Nutzungsrechte und Übermittlung ausdrücklich bestätigen.",
      );
    if (
      (data.kind !== "CHAT" &&
        !data.photoEdit &&
        data.referenceIds.some(
          (id) => !brief.referenceAssetIds.includes(id),
        )) ||
      new Set(data.referenceIds).size !== data.referenceIds.length
    )
      throw new PolicyError("Nur ausgewählte Briefing-Referenzen verwenden.");
    if (data.kind === "TEXT" && data.referenceIds.length)
      throw new PolicyError("Textgenerierung übermittelt keine Bilder.");
    if (data.referenceIds.length && config.storage === "DISCONNECTED")
      throw new PolicyError("Privater Bildspeicher: Nicht verbunden.", 503);
    if (
      (await tx.studioAsset.count({
        where: {
          id: { in: data.referenceIds },
          organizationId: ORG,
          deletedAt: null,
          mime: { startsWith: "image/" },
          libraryItem: { is: { archivedAt: null } },
        },
      })) !== data.referenceIds.length
    )
      throw new PolicyError("Referenz nicht zugänglich.", 403);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const jobs = await tx.studioJob.findMany({
      where: { organizationId: ORG, createdAt: { gte: since } },
    });
    const reserveUsd =
      data.kind !== "IMAGE" ? config.textReserve : config.imageReserve;
    if (
      jobs.length >= config.dailyRequests ||
      jobs.reduce((s, j) => s + j.reserveUsd, 0) + reserveUsd >
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
        "Ein Auftrag wartet oder läuft bereits. Zuerst prüfen.",
        409,
      );
    const firstSnapshot = series.contents[0]
      ? contentInput.parse(series.contents[0].versions[0].payload).studio
      : undefined;
    const profile = firstSnapshot?.brandProfile;
    const selectedRules = Object.fromEntries(
      (brief.brandRules || []).map((key) => [key, profile?.[key] || "Offen"]),
    );
    const references = await tx.libraryItem.findMany({
      where: {
        id: { in: brief.libraryReferenceIds || [] },
        organizationId: ORG,
        archivedAt: null,
      },
      select: { id: true, title: true, kind: true, text: true },
    });
    if (references.length !== (brief.libraryReferenceIds || []).length)
      throw new PolicyError(
        "Referenz wurde archiviert. Neues Briefing erforderlich.",
        409,
      );
    if (driveSelection) {
      const connection = await tx.driveConnection.findUnique({
        where: { userId: actor },
      });
      if (
        !connection ||
        connection.folderId !== driveSelection.folderId ||
        connection.updatedAt.toISOString() !== driveSelection.connectionVersion
      )
        throw new PolicyError(
          "Drive-Verbindung wurde geändert. Bilder neu auswählen.",
          409,
        );
    }
    const sourceAssets = data.photoEdit
      ? await tx.studioAsset.findMany({
          where: {
            id: { in: data.referenceIds },
            organizationId: ORG,
            deletedAt: null,
          },
          select: { id: true, sha256: true },
        })
      : undefined;
    const input = {
      strategy,
      campaignStrategy: await campaignConcept(tx, brief.campaignId),
      request: data,
      ...(replyTo ? { replyTo } : {}),
      ...(data.photoEdit ? { editTargetId: content!.id, sourceAssets } : {}),
      ...(driveSelection ? { driveSelection } : {}),
      brief,
      selectedRules,
      references,
      versions: series.contents.map((c) => ({ id: c.id, version: c.version })),
      imageIdea: content
        ? contentInput.parse(content.versions[0].payload).studio?.imageIdea
        : null,
      ...(data.kind === "CHAT"
        ? {
            assistant: series.concept
              ? undefined
              : await assistantContext(
                  tx,
                  actor,
                  series.id,
                  series.customerId,
                  data.useProjectMemory,
                ),
            campaign: brief.campaignId
              ? await tx.campaign.findFirst({
                  where: { id: brief.campaignId, organizationId: ORG },
                  select: { title: true, goal: true, audience: true },
                })
              : null,
            contents: series.contents.map((c) =>
              contentInput.parse(c.versions[0].payload),
            ),
            history: (
              await tx.studioJob.findMany({
                where: {
                  organizationId: ORG,
                  seriesId: series.id,
                  kind: "CHAT",
                  status: "SUCCEEDED",
                },
                orderBy: { createdAt: "desc" },
                take: 12,
              })
            )
              .reverse()
              .flatMap((j) => {
                const old = j.input as { request?: { message?: string } };
                const result = j.result as { reply?: string } | null;
                return old.request?.message && result?.reply
                  ? [
                      { role: "user", content: old.request.message },
                      { role: "assistant", content: result.reply },
                    ]
                  : [];
              }),
          }
        : {}),
    };
    const j = await tx.studioJob.create({
      data: {
        seriesId: series.id,
        organizationId: ORG,
        requestKey: data.requestKey,
        kind: data.kind,
        input: json(input),
        model: data.kind !== "IMAGE" ? config.textModel : config.imageModel,
        reserveUsd,
        userId: actor,
      },
    });
    await audit(tx, actor, "STUDIO_AI_REQUESTED", j.id, {
      kind: j.kind,
      model: j.model,
      reserveUsd,
      referenceIds: data.referenceIds,
      driveReferenceIds: data.driveReferenceIds,
      referenceRights: data.referenceRights,
      referenceTransfer: data.referenceTransfer,
    });
    return j;
  });
}
export async function runJob(
  actor: string,
  id: string,
  provider: AIProvider = openAIProvider,
  store?: ObjectStore,
) {
  const job = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-jobs:" + ORG}))`;
    const j = await tx.studioJob.findFirst({
      where: { id, organizationId: ORG },
    });
    if (!j || !j.seriesId)
      throw new PolicyError("Auftrag nicht zugänglich.", 403);
    const request = (j.input as { request?: { driveReferenceIds?: string[] } })
      .request;
    if (request?.driveReferenceIds?.length && j.userId !== actor)
      throw new PolicyError(
        "Drive-Bilder können nur vom Auftraggeber übermittelt werden.",
        403,
      );
    if (j.status !== "QUEUED")
      throw new PolicyError(
        "Auftrag wurde bereits gestartet. Keine Wiederholung.",
        409,
      );
    if (
      await tx.studioJob.count({
        where: { organizationId: ORG, status: "RUNNING" },
      })
    )
      throw new PolicyError("Ein Auftrag läuft bereits.", 409);
    if (!studioConfig().connected)
      throw new PolicyError("KI: Nicht verbunden.", 503);
    return tx.studioJob.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  });
  const input = job.input as {
    request: z.infer<typeof requestSchema>;
    replyTo?: { jobId: string; message: string; reply: string };
    brief: unknown;
    selectedRules?: unknown;
    references?: unknown;
    imageIdea: string;
    sourceAssets?: { id: string; sha256: string }[];
    versions: { id: string; version: number }[];
    history?: { role: "user" | "assistant"; content: string }[];
    campaign?: unknown;
    contents?: unknown;
    driveSelection?: DriveSelection;
    strategy?: unknown;
    campaignStrategy?: unknown;
    assistant?: unknown;
  };
  let providerStarted = false;
  const currentMessage = input.replyTo
    ? `Bezug auf diesen ausgewählten GPT-Vorschlag:\nUrsprünglicher Auftrag: ${input.replyTo.message}\nVorschlag: ${input.replyTo.reply}\n\nMeine aktuelle Anweisung: ${input.request.message}`
    : input.request.message;
  try {
    let result: unknown, usage: unknown, requestId: string | null;
    if (job.kind === "CHAT") {
      if (!provider.chat)
        throw new ProviderFailure(false, "Chat-Anbieter nicht eingerichtet.");
      const refs = [];
      for (const ref of input.request.referenceIds) {
        if (
          !(await db.libraryItem.findFirst({
            where: { assetId: ref, organizationId: ORG, archivedAt: null },
          }))
        )
          throw new PolicyError("Bildreferenz nicht mehr verfügbar.");
        const a = await readAsset(actor, ref, store);
        if (!["image/jpeg", "image/png", "image/webp"].includes(a.asset.mime))
          throw new PolicyError("Ungültige Bildreferenz.");
        refs.push({ bytes: a.bytes, mime: a.asset.mime });
      }
      if (input.request.driveReferenceIds?.length) {
        if (
          !input.driveSelection ||
          input.driveSelection.ownerId !== job.userId
        )
          throw new PolicyError(
            "Drive-Auswahl fehlt. Neuen Auftrag erstellen.",
          );
        refs.push(...(await readDriveImages(actor, input.driveSelection)));
      }
      providerStarted = true;
      const r = await provider.chat(
        {
          assistant: input.assistant,
          strategy: input.strategy,
          campaignStrategy: input.campaignStrategy,
          briefing: input.brief,
          campaign: input.campaign,
          contents: input.contents,
          rules: input.selectedRules,
          references: input.references,
          driveImages: input.driveSelection?.files.map((file, i) => ({
            imageNumber: input.request.referenceIds.length + i + 1,
            name: file.name,
          })),
        },
        [
          ...(input.history || []),
          {
            role: "user",
            content: input.request.mediaIntent
              ? `Produktionsauftrag ${input.request.mediaIntent === "IMAGE" ? "Bild" : "Video"}: ${currentMessage!}`
              : currentMessage!,
          },
        ],
        job.model,
        refs,
      );
      result = { reply: r.reply };
      usage = r.usage;
      requestId = r.requestId;
    } else if (job.kind === "TEXT") {
      providerStarted = true;
      const r = await provider.text(
        briefingSchema.parse(input.brief),
        job.model,
        {
          rules: input.selectedRules,
          references: input.references,
          campaignStrategy: input.campaignStrategy,
        },
      );
      result = { posts: r.posts };
      usage = r.usage;
      requestId = r.requestId;
    } else {
      const sourceAssetIds: string[] = [];
      const refs = await Promise.all(
        input.request.referenceIds.map(async (ref) => {
          if (
            input.request.photoEdit &&
            !(await db.libraryItem.findFirst({
              where: { assetId: ref, organizationId: ORG, archivedAt: null },
            }))
          )
            throw new PolicyError("Ausgangsbild nicht mehr verfügbar.");
          const a = await readAsset(actor, ref, store);
          if (input.request.photoEdit) {
            if (
              input.sourceAssets?.find((s) => s.id === ref)?.sha256 !==
                a.asset.sha256 ||
              !["image/jpeg", "image/png", "image/webp"].includes(a.asset.mime)
            )
              throw new PolicyError(
                "Ausgangsbild wurde verändert. Neuen Auftrag erstellen.",
              );
            sourceAssetIds.push(a.asset.id);
          }
          return { bytes: a.bytes, mime: a.asset.mime };
        }),
      );
      if (input.request.photoEdit && input.request.driveReferenceIds?.length) {
        if (
          !input.driveSelection ||
          input.driveSelection.ownerId !== job.userId
        )
          throw new PolicyError(
            "Drive-Auswahl fehlt. Neuen Auftrag erstellen.",
          );
        const images = await readDriveImages(actor, input.driveSelection);
        for (const [i, image] of images.entries()) {
          const original = await storeAsset(
            actor,
            image.bytes,
            input.driveSelection.files[i].name,
            "ORIGINAL",
            undefined,
            store,
          );
          sourceAssetIds.push(original.id);
          refs.push(image);
        }
      }
      const imageContext = JSON.stringify({
        imageIdea: input.imageIdea,
        briefing: input.brief,
        selectedRules: input.selectedRules,
        selectedTextReferences: input.references,
      });
      providerStarted = true;
      const r = await provider.image(
        input.request.photoEdit ? currentMessage! : imageContext,
        job.model,
        refs,
        input.request.photoEdit ? { edit: true } : undefined,
      );
      const a = await storeAsset(
        actor,
        r.bytes,
        `${input.request.photoEdit ? "bearbeitung" : "motiv"}-${job.id}.png`,
        "MOTIF",
        undefined,
        store,
      );
      if (!a.reused)
        await db.libraryItem.updateMany({
          where: { assetId: a.id, organizationId: ORG },
          data: {
            source: `KI-Auftrag ${job.id}; Modell ${job.model}`,
            description: input.request.photoEdit
              ? `Bildbearbeitung; Ausgangsbild ${sourceAssetIds.join(", ")}; Auftrag: ${input.request.message}; Serie ${job.seriesId}.`
              : `Motiv für Serie ${job.seriesId}; keine automatische Rechtefreigabe.`,
          },
        });
      result = {
        assetId: a.id,
        sha256: a.sha256,
        ...(input.request.photoEdit ? { sourceAssetIds } : {}),
      };
      usage = r.usage;
      requestId = r.requestId;
    }
    await db.studioJob.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        result: json(result),
        usage: json(usage || {}),
        providerRequestId: requestId,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    const uncertain =
      providerStarted && (!(e instanceof ProviderFailure) || e.uncertain);
    await db.studioJob.updateMany({
      where: { id, status: "RUNNING" },
      data: {
        status: uncertain ? "UNKNOWN" : "FAILED",
        error:
          e instanceof ProviderFailure ||
          (!providerStarted && e instanceof PolicyError)
            ? e.message
            : "Verarbeitung fehlgeschlagen. Ergebnis/Kosten prüfen; keine automatische Wiederholung.",
        completedAt: new Date(),
      },
    });
  }
  return { ok: true };
}
export async function applyJob(actor: string, id: string) {
  return db.$transaction(
    async (tx) => {
      await hubActor(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-job:" + id}))`;
      const job = await tx.studioJob.findFirst({
        where: { id, organizationId: ORG, status: "SUCCEEDED" },
      });
      if (!job || !job.seriesId)
        throw new PolicyError(
          "Erfolgreicher, noch nicht übernommener Auftrag erforderlich.",
          409,
        );
      if (job.kind === "CHAT")
        throw new PolicyError(
          "Chat-Antwort ist bereits im Gespräch gespeichert.",
        );
      const input = job.input as {
        request: z.infer<typeof requestSchema>;
        editTargetId?: string;
        versions: { id: string; version: number }[];
      };
      const result = job.result as {
        posts: unknown[];
        assetId: string;
        sha256: string;
      };
      const targets =
        job.kind === "TEXT"
          ? input.versions
          : input.versions.filter(
              (c) => c.id === (input.editTargetId || input.request.contentId),
            );
      if (!targets.length) throw new PolicyError("Zielbeitrag fehlt.", 409);
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i],
          c = await tx.marketingContent.findFirst({
            where: {
              id: t.id,
              organizationId: ORG,
              studioSeriesId: job.seriesId,
            },
            include: { versions: { orderBy: { version: "desc" }, take: 1 } },
          });
        if (!c || c.version !== t.version)
          throw new PolicyError(
            "Beitrag seit Auftrag geändert. Ergebnis bleibt gespeichert; nicht überschrieben.",
            409,
          );
        const p = contentInput.parse(c.versions[0].payload),
          s = p.studio!;
        let updated: ContentInput;
        if (job.kind === "TEXT") {
          const post = generatedPostSchema.parse(result.posts[i]);
          updated = {
            ...p,
            studio: {
              ...s,
              imageIdea: post.imageIdea,
              headline: post.headline,
              hashtags: post.hashtags,
              source: "AI",
            },
            variants: post.variants.map((v) => ({
              ...p.variants.find((old) => old.channel === v.channel)!,
              ...v,
            })),
          };
        } else
          updated = {
            ...p,
            studio: {
              ...s,
              motifAssetId: result.assetId,
              motifSha256: result.sha256,
              source: "AI",
            },
            variants: p.variants.map((v) => ({
              ...v,
              mediaType: "IMAGE",
              mediaUrl: "",
              mediaReference: `Studio-Asset ${result.assetId} · ${result.sha256}`,
            })),
          };
        await saveContentInTx(
          tx,
          actor,
          contentInput.parse(updated),
          c.id,
          c.version,
        );
      }
      await tx.studioJob.update({ where: { id }, data: { status: "APPLIED" } });
      await audit(tx, actor, "STUDIO_AI_APPLIED", id, {});
      return { ok: true };
    },
    { timeout: 15000 },
  );
}
export async function cancelOrReconcile(actor: string, id: string) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const job = await tx.studioJob.findFirst({
      where: { id, organizationId: ORG },
    });
    if (!job || !job.seriesId)
      throw new PolicyError("Auftrag nicht zugänglich.", 403);
    if (job.status === "QUEUED")
      await tx.studioJob.updateMany({
        where: { id, status: "QUEUED" },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
    else if (
      job.status === "RUNNING" &&
      job.startedAt &&
      Date.now() - job.startedAt.getTime() > 180000
    )
      await tx.studioJob.updateMany({
        where: { id, status: "RUNNING" },
        data: {
          status: "UNKNOWN",
          error:
            "Zeitfenster überschritten. Anbieter/Kosten vor neuem Auftrag prüfen.",
          completedAt: new Date(),
        },
      });
    else
      throw new PolicyError("Auftrag kann aktuell nicht beendet werden.", 409);
    await audit(tx, actor, "STUDIO_JOB_RECONCILED", id, {});
    return { ok: true };
  });
}
