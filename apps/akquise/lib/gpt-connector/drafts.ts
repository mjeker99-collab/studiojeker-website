import { Prisma } from "@prisma/client";
import { db } from "../db";
import { PolicyError } from "../policy";
import { contentInput, type ContentInput } from "../hub/input";
import { newsletterText } from "../hub/newsletter-template";
import { saveContent } from "../hub/workflow";
import { audit, type Tx } from "../workflow";
import {
  blankWebsite,
  validatedDocument,
  type WebsiteDocument,
} from "../websites/input";
import { sanitizeEditorialPayload } from "./sanitize";
import {
  gptDraftCreateInput,
  gptDraftUpdateInput,
  MAX_DRAFT_BODY_BYTES,
  type GptDraftCreateInput,
  type GptDraftUpdateInput,
} from "./draft-input";
import type { GptWriteEntityType } from "./types";

async function hasWriteGrant(entityType: GptWriteEntityType, entityId: string) {
  const row = await db.gptWriteGrant.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  return Boolean(row);
}

async function assertMarketingWriteTarget(
  campaignId: string | null | undefined,
  seriesId: string | null | undefined,
) {
  if (!campaignId && !seriesId)
    throw new PolicyError(
      "Entwurf benötigt eine freigegebene Kampagne oder ein freigegebenes Projekt.",
      400,
    );

  let allowed = false;
  if (campaignId) {
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, organizationId: "studiojeker" },
      select: { id: true },
    });
    if (!campaign) throw new PolicyError("Kampagne nicht gefunden.", 404);
    if (await hasWriteGrant("CAMPAIGN", campaignId)) allowed = true;
  }
  if (seriesId) {
    const series = await db.studioSeries.findFirst({
      where: { id: seriesId, organizationId: "studiojeker" },
      select: { id: true },
    });
    if (!series) throw new PolicyError("Projekt nicht gefunden.", 404);
    if (await hasWriteGrant("SERIES", seriesId)) allowed = true;
  }
  if (!allowed)
    throw new PolicyError(
      "Schreibzugriff für diese Kampagne oder dieses Projekt ist nicht freigegeben.",
      403,
    );
}

function contentSummary(payload: unknown) {
  const clean = sanitizeEditorialPayload(payload) as Record<
    string,
    unknown
  > | null;
  if (!clean || typeof clean !== "object") return { draft: null };
  const newsletter = clean.newsletter as
    | { templateId?: string; fields?: Record<string, string> }
    | undefined;
  return {
    title: typeof clean.title === "string" ? clean.title : undefined,
    subject: typeof clean.subject === "string" ? clean.subject : undefined,
    preheader: typeof clean.preheader === "string" ? clean.preheader : undefined,
    body: typeof clean.body === "string" ? clean.body : undefined,
    audience: typeof clean.audience === "string" ? clean.audience : undefined,
    variants: Array.isArray(clean.variants) ? clean.variants : undefined,
    newsletter: newsletter
      ? {
          templateId: newsletter.templateId ?? "",
          fields: newsletter.fields ?? {},
        }
      : undefined,
  };
}

function toMarketingPayload(
  actorId: string,
  input: GptDraftCreateInput | GptDraftUpdateInput,
  kind: "NEWSLETTER" | "SOCIAL",
  campaignId: string | null,
  base?: ContentInput,
): ContentInput {
  const title = input.title ?? base?.title ?? "Entwurf";
  const merged: Record<string, unknown> = {
    kind,
    title,
    ownerId: actorId,
    campaignId,
    scheduledAt:
      input.scheduledAt !== undefined
        ? input.scheduledAt
        : (base?.scheduledAt ?? null),
    subject: input.subject ?? base?.subject ?? "",
    preheader: input.preheader ?? base?.preheader ?? "",
    body: input.body ?? base?.body ?? "",
    audience: input.audience ?? base?.audience ?? "",
    variants: input.variants ?? base?.variants ?? [],
  };
  const newsletter =
    input.newsletter !== undefined ? input.newsletter : base?.newsletter;
  if (newsletter) merged.newsletter = newsletter;
  if (base?.studio) merged.studio = base.studio;
  const parsed = contentInput.parse(merged);
  if (parsed.newsletter) parsed.body = newsletterText(parsed.newsletter).trim();
  return parsed;
}

function websiteFromInput(
  input: NonNullable<GptDraftCreateInput["website"]>,
  nameFallback: string,
): WebsiteDocument {
  const doc = {
    ...blankWebsite,
    name: input.name || nameFallback,
    briefing: input.briefing ?? "",
    language: input.language ?? "de-CH",
    accent: input.accent ?? "#00cbdc",
    style: input.style ?? "LIGHT",
    template: input.template ?? "EDITORIAL",
    footer: input.footer ?? "",
    pages: (input.pages ?? []).map((p) => ({
      slug: p.slug || "index",
      title: p.title,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      headline: p.headline ?? "",
      intro: p.intro ?? "",
      sections: (p.sections ?? []).map((s) => ({
        heading: s.heading ?? "",
        body: s.body ?? "",
        layout: s.layout ?? "TEXT",
        imageUrl: s.imageUrl ?? "",
        imageAssetId: s.imageAssetId ?? null,
        imageAlt: s.imageAlt ?? "",
        ctaLabel: s.ctaLabel ?? "",
        ctaUrl: s.ctaUrl ?? "",
      })),
    })),
  };
  return validatedDocument.parse(doc);
}

function mergeWebsiteDocument(
  current: WebsiteDocument,
  patch: NonNullable<GptDraftUpdateInput["website"]>,
  title?: string,
): WebsiteDocument {
  const next = {
    ...current,
    name: patch.name ?? title ?? current.name,
    briefing: patch.briefing ?? current.briefing,
    language: patch.language ?? current.language,
    accent: patch.accent ?? current.accent,
    style: patch.style ?? current.style,
    template: patch.template ?? current.template,
    footer: patch.footer ?? current.footer,
    pages: patch.pages
      ? patch.pages.map((p) => ({
          slug: p.slug || "index",
          title: p.title,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          headline: p.headline ?? "",
          intro: p.intro ?? "",
          sections: (p.sections ?? []).map((s) => ({
            heading: s.heading ?? "",
            body: s.body ?? "",
            layout: s.layout ?? "TEXT",
            imageUrl: s.imageUrl ?? "",
            imageAssetId: s.imageAssetId ?? null,
            imageAlt: s.imageAlt ?? "",
            ctaLabel: s.ctaLabel ?? "",
            ctaUrl: s.ctaUrl ?? "",
          })),
        }))
      : current.pages,
  };
  return validatedDocument.parse(next);
}

export function assertDraftBodySize(req: Request, rawText: string) {
  const headerLen = Number(req.headers.get("content-length") || 0);
  if (headerLen > MAX_DRAFT_BODY_BYTES || Buffer.byteLength(rawText) > MAX_DRAFT_BODY_BYTES)
    throw new PolicyError("Anfrage zu gross.", 413);
}

async function rememberIdempotency(
  tx: Tx,
  key: string,
  draftKind: string,
  draftId: string,
) {
  await tx.gptIdempotency.create({
    data: { key, draftKind, draftId },
  });
}

async function loadIdempotent(key: string) {
  const row = await db.gptIdempotency.findUnique({ where: { key } });
  if (!row) return null;
  return getDraft(row.draftId, row.draftKind as "MARKETING" | "WEBSITE_REVIEW");
}

type DraftResponse = Awaited<ReturnType<typeof getDraft>>;
type CreateDraftResponse = DraftResponse & { idempotentReplay?: boolean };

export async function createDraft(
  actorId: string,
  raw: unknown,
): Promise<CreateDraftResponse> {
  const input = gptDraftCreateInput.parse(raw);

  if (input.idempotencyKey) {
    const existing = await loadIdempotent(input.idempotencyKey);
    if (existing) return { ...existing, idempotentReplay: true };
  }

  if (input.kind === "WEBSITE_REVIEW") {
    if (input.websiteId) {
      if (!(await hasWriteGrant("WEBSITE", input.websiteId)))
        throw new PolicyError(
          "Schreibzugriff für diese Website ist nicht freigegeben.",
          403,
        );
      const project = await db.websiteProject.findFirst({
        where: { id: input.websiteId, organizationId: "studiojeker" },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });
      if (!project) throw new PolicyError("Website nicht gefunden.", 404);
      const current = validatedDocument.parse(project.versions[0].payload);
      const doc = mergeWebsiteDocument(
        current,
        input.website!,
        input.title,
      );
      const result = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"website:" + project.id}))`;
        const fresh = await tx.websiteProject.findUniqueOrThrow({
          where: { id: project.id },
        });
        if (fresh.version !== project.version)
          throw new PolicyError("Website wurde geändert. Neu laden.", 409);
        const version = fresh.version + 1;
        await tx.websiteVersion.create({
          data: {
            projectId: project.id,
            version,
            payload: JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue,
            createdBy: actorId,
          },
        });
        await tx.websiteProject.update({
          where: { id: project.id },
          data: { version, name: doc.name },
        });
        await audit(tx, actorId, "GPT_WEBSITE_DRAFT_SAVED", project.id, {
          version,
          source: "chatgpt",
        });
        if (input.idempotencyKey)
          await rememberIdempotency(
            tx,
            input.idempotencyKey,
            "WEBSITE_REVIEW",
            project.id,
          );
        return { id: project.id, version };
      });
      return getDraft(result.id, "WEBSITE_REVIEW");
    }

    const doc = websiteFromInput(input.website!, input.title);
    const created = await db.$transaction(async (tx) => {
      const p = await tx.websiteProject.create({
        data: {
          organizationId: "studiojeker",
          name: doc.name,
          createdBy: actorId,
          versions: {
            create: {
              version: 1,
              payload: JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue,
              createdBy: actorId,
            },
          },
        },
      });
      await tx.gptWriteGrant.upsert({
        where: {
          entityType_entityId: { entityType: "WEBSITE", entityId: p.id },
        },
        create: {
          entityType: "WEBSITE",
          entityId: p.id,
          grantedBy: actorId,
        },
        update: { grantedBy: actorId, grantedAt: new Date() },
      });
      await audit(tx, actorId, "GPT_WEBSITE_DRAFT_CREATED", p.id, {
        version: 1,
        source: "chatgpt",
      });
      if (input.idempotencyKey)
        await rememberIdempotency(
          tx,
          input.idempotencyKey,
          "WEBSITE_REVIEW",
          p.id,
        );
      return p;
    });
    return getDraft(created.id, "WEBSITE_REVIEW");
  }

  const campaignId = input.campaignId ?? null;
  const seriesId = input.seriesId ?? null;
  await assertMarketingWriteTarget(campaignId, seriesId);

  const payload = toMarketingPayload(actorId, input, input.kind, campaignId);
  const saved = await saveContent(actorId, payload);
  // Link to series without inventing a full studio snapshot (Hub-managed).
  if (seriesId && saved.studioSeriesId !== seriesId) {
    await db.marketingContent.update({
      where: { id: saved.id },
      data: { studioSeriesId: seriesId },
    });
  }
  await db.$transaction(async (tx) => {
    await audit(tx, actorId, "GPT_DRAFT_CREATED", saved.id, {
      version: saved.version,
      kind: saved.kind,
      source: "chatgpt",
      campaignId,
      seriesId,
    });
    if (input.idempotencyKey)
      await rememberIdempotency(tx, input.idempotencyKey, "MARKETING", saved.id);
  });
  return getDraft(saved.id, "MARKETING");
}

export async function updateDraft(
  actorId: string,
  id: string,
  raw: unknown,
  ifMatch?: string | null,
) {
  const input = gptDraftUpdateInput.parse(raw);
  const expectedFromHeader = ifMatch?.trim()
    ? Number(ifMatch.trim())
    : undefined;
  if (
    expectedFromHeader !== undefined &&
    (!Number.isInteger(expectedFromHeader) ||
      expectedFromHeader !== input.expectedVersion)
  )
    throw new PolicyError(
      "If-Match stimmt nicht mit expectedVersion überein.",
      409,
    );

  const marketing = await db.marketingContent.findFirst({
    where: { id, organizationId: "studiojeker" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (marketing) {
    await assertMarketingWriteTarget(
      marketing.campaignId,
      marketing.studioSeriesId,
    );
    if (marketing.status !== "DRAFT" && marketing.status !== "IN_REVIEW")
      throw new PolicyError(
        "Nur Entwürfe im Status DRAFT oder IN_REVIEW dürfen über ChatGPT geändert werden.",
        409,
      );
    if (marketing.version !== input.expectedVersion)
      throw new PolicyError("Inhalt wurde geändert. Neu laden.", 409);

    const base = contentInput.parse(marketing.versions[0].payload);
    const payload = toMarketingPayload(
      actorId,
      input,
      marketing.kind,
      marketing.campaignId,
      base,
    );

    const saved = await saveContent(
      actorId,
      payload,
      marketing.id,
      input.expectedVersion,
    );
    await db.$transaction(async (tx) => {
      await audit(tx, actorId, "GPT_DRAFT_UPDATED", saved.id, {
        version: saved.version,
        previousVersion: input.expectedVersion,
        source: "chatgpt",
      });
    });
    return getDraft(saved.id, "MARKETING");
  }

  const website = await db.websiteProject.findFirst({
    where: { id, organizationId: "studiojeker" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!website) throw new PolicyError("Entwurf nicht gefunden.", 404);
  if (!(await hasWriteGrant("WEBSITE", website.id)))
    throw new PolicyError(
      "Schreibzugriff für diese Website ist nicht freigegeben.",
      403,
    );
  if (website.version !== input.expectedVersion)
    throw new PolicyError("Website wurde geändert. Neu laden.", 409);
  if (!input.website && !input.title)
    throw new PolicyError("Keine erlaubten Felder zum Aktualisieren.", 400);

  const current = validatedDocument.parse(website.versions[0].payload);
  const doc = mergeWebsiteDocument(
    current,
    input.website ?? {},
    input.title,
  );
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"website:" + website.id}))`;
    const fresh = await tx.websiteProject.findUniqueOrThrow({
      where: { id: website.id },
    });
    if (fresh.version !== input.expectedVersion)
      throw new PolicyError("Website wurde geändert. Neu laden.", 409);
    const version = fresh.version + 1;
    await tx.websiteVersion.create({
      data: {
        projectId: website.id,
        version,
        payload: JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue,
        createdBy: actorId,
      },
    });
    await tx.websiteProject.update({
      where: { id: website.id },
      data: { version, name: doc.name },
    });
    await audit(tx, actorId, "GPT_WEBSITE_DRAFT_SAVED", website.id, {
      version,
      previousVersion: input.expectedVersion,
      source: "chatgpt",
    });
  });
  return getDraft(website.id, "WEBSITE_REVIEW");
}

export async function getDraft(
  id: string,
  hint?: "MARKETING" | "WEBSITE_REVIEW",
) {
  if (hint !== "WEBSITE_REVIEW") {
    const content = await db.marketingContent.findFirst({
      where: { id, organizationId: "studiojeker" },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
        approvals: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { status: true, version: true, createdAt: true },
        },
      },
    });
    if (content) {
      const readable =
        (content.campaignId &&
          (await db.gptShare.findUnique({
            where: {
              entityType_entityId: {
                entityType: "CAMPAIGN",
                entityId: content.campaignId,
              },
            },
          }))) ||
        (content.studioSeriesId &&
          (await db.gptShare.findUnique({
            where: {
              entityType_entityId: {
                entityType: "SERIES",
                entityId: content.studioSeriesId,
              },
            },
          }))) ||
        (await db.gptShare.findUnique({
          where: {
            entityType_entityId: { entityType: "CONTENT", entityId: content.id },
          },
        })) ||
        (content.campaignId &&
          (await hasWriteGrant("CAMPAIGN", content.campaignId))) ||
        (content.studioSeriesId &&
          (await hasWriteGrant("SERIES", content.studioSeriesId)));
      if (!readable)
        throw new PolicyError("Entwurf nicht freigegeben.", 404);

      return {
        id: content.id,
        type: "MARKETING" as const,
        kind: content.kind,
        title: content.title,
        status: content.status,
        version: content.version,
        campaignId: content.campaignId,
        seriesId: content.studioSeriesId,
        scheduledAt: content.scheduledAt?.toISOString() ?? null,
        origin: "chatgpt-compatible",
        approvals: content.approvals.map((a) => ({
          status: a.status,
          version: a.version,
          createdAt: a.createdAt.toISOString(),
        })),
        draft: content.versions[0]
          ? contentSummary(content.versions[0].payload)
          : null,
        updatedAt: content.updatedAt.toISOString(),
        createdAt: content.createdAt.toISOString(),
      };
    }
  }

  const website = await db.websiteProject.findFirst({
    where: { id, organizationId: "studiojeker" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!website) throw new PolicyError("Entwurf nicht gefunden.", 404);
  if (!(await hasWriteGrant("WEBSITE", website.id)))
    throw new PolicyError("Entwurf nicht freigegeben.", 404);
  const publication = await db.websitePublication.findUnique({
    where: { projectId: website.id },
    select: { active: true, slug: true, version: true },
  });
  return {
    id: website.id,
    type: "WEBSITE_REVIEW" as const,
    kind: "WEBSITE_REVIEW" as const,
    title: website.name,
    status: "DRAFT" as const,
    version: website.version,
    campaignId: null,
    seriesId: null,
    origin: "chatgpt",
    published: Boolean(publication?.active),
    draft: {
      document: sanitizeEditorialPayload(
        validatedDocument.parse(website.versions[0].payload),
      ),
    },
    updatedAt: website.updatedAt.toISOString(),
    createdAt: website.createdAt.toISOString(),
  };
}
