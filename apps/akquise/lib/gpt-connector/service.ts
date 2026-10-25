import { db } from "../db";
import { PolicyError } from "../policy";
import { conceptInput } from "../concepts/input";
import {
  sanitizeEditorialPayload,
  searchableText,
  redactEmails,
} from "./sanitize";
import type { GptEntityType } from "./types";

async function sharedIds(type: GptEntityType) {
  const rows = await db.gptShare.findMany({
    where: { entityType: type },
    select: { entityId: true },
  });
  return new Set(rows.map((r) => r.entityId));
}

function contentSummary(payload: unknown) {
  const clean = sanitizeEditorialPayload(payload) as Record<string, unknown> | null;
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
    studio: clean.studio ? sanitizeEditorialPayload(clean.studio) : undefined,
  };
}

export async function listSharedProjects() {
  const ids = await sharedIds("SERIES");
  if (!ids.size) return { projects: [] as const };
  const series = await db.studioSeries.findMany({
    where: { id: { in: [...ids] }, organizationId: "studiojeker" },
    orderBy: { createdAt: "desc" },
    include: {
      concept: {
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      },
      customer: { select: { id: true, name: true } },
      contents: {
        select: { id: true, title: true, kind: true, status: true, version: true },
      },
    },
  });
  return {
    projects: series.map((s) => ({
      id: s.id,
      type: "SERIES" as const,
      title: s.title,
      customer: s.customer
        ? { id: s.customer.id, name: s.customer.name }
        : null,
      briefing: sanitizeEditorialPayload(s.briefing),
      contentCount: s.contents.length,
      concept: s.concept
        ? {
            id: s.concept.id,
            version: s.concept.version,
            latestVersion: s.concept.versions[0]?.version ?? null,
            approvedAt: s.concept.versions[0]?.approvedAt?.toISOString() ?? null,
          }
        : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.createdAt.toISOString(),
    })),
  };
}

export async function getSharedProject(id: string) {
  const share = await db.gptShare.findUnique({
    where: { entityType_entityId: { entityType: "SERIES", entityId: id } },
  });
  if (!share) throw new PolicyError("Projekt nicht freigegeben.", 404);
  const series = await db.studioSeries.findFirst({
    where: { id, organizationId: "studiojeker" },
    include: {
      concept: {
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      },
      customer: { select: { id: true, name: true } },
      contents: {
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!series) throw new PolicyError("Projekt nicht gefunden.", 404);
  const conceptPayload = series.concept?.versions[0]
    ? sanitizeEditorialPayload(
        conceptInput.safeParse(series.concept.versions[0].payload).success
          ? series.concept.versions[0].payload
          : {},
      )
    : null;
  return {
    id: series.id,
    type: "SERIES" as const,
    title: series.title,
    customer: series.customer
      ? { id: series.customer.id, name: series.customer.name }
      : null,
    briefing: sanitizeEditorialPayload(series.briefing),
    concept: series.concept
      ? {
          id: series.concept.id,
          version: series.concept.version,
          latest: series.concept.versions[0]
            ? {
                version: series.concept.versions[0].version,
                approvedAt:
                  series.concept.versions[0].approvedAt?.toISOString() ?? null,
                payload: conceptPayload,
              }
            : null,
        }
      : null,
    contents: series.contents.map((c) => ({
      id: c.id,
      title: c.title,
      kind: c.kind,
      status: c.status,
      version: c.version,
      updatedAt: c.updatedAt.toISOString(),
      draft: c.versions[0] ? contentSummary(c.versions[0].payload) : null,
    })),
    createdAt: series.createdAt.toISOString(),
  };
}

export async function listSharedCampaigns() {
  const ids = await sharedIds("CAMPAIGN");
  if (!ids.size) return { campaigns: [] as const };
  const campaigns = await db.campaign.findMany({
    where: { id: { in: [...ids] }, organizationId: "studiojeker" },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      contents: {
        select: {
          id: true,
          title: true,
          kind: true,
          status: true,
          version: true,
          updatedAt: true,
        },
      },
      _count: { select: { contents: true } },
    },
  });
  return {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      goal: redactEmails(c.goal),
      audience: redactEmails(c.audience),
      status: "ACTIVE",
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      customer: c.customer
        ? { id: c.customer.id, name: c.customer.name }
        : null,
      contentCount: c._count.contents,
      contents: c.contents.map((x) => ({
        id: x.id,
        title: x.title,
        kind: x.kind,
        status: x.status,
        version: x.version,
        updatedAt: x.updatedAt.toISOString(),
      })),
      revision: c.revision,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

export async function getSharedCampaign(id: string) {
  const share = await db.gptShare.findUnique({
    where: { entityType_entityId: { entityType: "CAMPAIGN", entityId: id } },
  });
  if (!share) throw new PolicyError("Kampagne nicht freigegeben.", 404);
  const campaign = await db.campaign.findFirst({
    where: { id, organizationId: "studiojeker" },
    include: {
      customer: { select: { id: true, name: true } },
      contents: {
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
          approvals: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { status: true, version: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!campaign) throw new PolicyError("Kampagne nicht gefunden.", 404);

  // Concept handoff briefing when an approved concept was handed to this campaign.
  const handoff = await db.strategyVersion.findFirst({
    where: {
      handoffCampaignId: id,
      approvedAt: { not: null },
      concept: { organizationId: "studiojeker" },
    },
    orderBy: { version: "desc" },
  });

  return {
    id: campaign.id,
    title: campaign.title,
    goal: redactEmails(campaign.goal),
    audience: redactEmails(campaign.audience),
    startsAt: campaign.startsAt.toISOString(),
    endsAt: campaign.endsAt.toISOString(),
    revision: campaign.revision,
    customer: campaign.customer
      ? { id: campaign.customer.id, name: campaign.customer.name }
      : null,
    conceptHandoff: handoff
      ? {
          conceptId: handoff.conceptId,
          version: handoff.version,
          approvedAt: handoff.approvedAt!.toISOString(),
          payload: sanitizeEditorialPayload(
            conceptInput.safeParse(handoff.payload).success
              ? handoff.payload
              : {},
          ),
        }
      : null,
    contents: campaign.contents.map((c) => ({
      id: c.id,
      title: c.title,
      kind: c.kind,
      status: c.status,
      version: c.version,
      scheduledAt: c.scheduledAt?.toISOString() ?? null,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      approvals: c.approvals.map((a) => ({
        status: a.status,
        version: a.version,
        createdAt: a.createdAt.toISOString(),
      })),
      draft: c.versions[0] ? contentSummary(c.versions[0].payload) : null,
    })),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export async function searchSharedContent(q: string) {
  const query = q.trim().slice(0, 200).toLowerCase();
  if (query.length < 2)
    throw new PolicyError("Suchbegriff mindestens 2 Zeichen.", 400);

  const [campaignShares, contentShares, seriesShares, conceptShares, libraryShares] =
    await Promise.all([
      sharedIds("CAMPAIGN"),
      sharedIds("CONTENT"),
      sharedIds("SERIES"),
      sharedIds("CONCEPT"),
      sharedIds("LIBRARY"),
    ]);

  const results: Array<{
    type: GptEntityType | "CAMPAIGN_CONTENT";
    id: string;
    title: string;
    status?: string;
    snippet: string;
    updatedAt: string;
    campaignId?: string;
  }> = [];

  if (campaignShares.size) {
    const campaigns = await db.campaign.findMany({
      where: { id: { in: [...campaignShares] }, organizationId: "studiojeker" },
      include: {
        contents: {
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    });
    for (const c of campaigns) {
      const hay = `${c.title}\n${c.goal}\n${c.audience}`.toLowerCase();
      if (hay.includes(query)) {
        results.push({
          type: "CAMPAIGN",
          id: c.id,
          title: c.title,
          snippet: redactEmails(c.goal).slice(0, 280),
          updatedAt: c.updatedAt.toISOString(),
        });
      }
      for (const content of c.contents) {
        const payload = content.versions[0]?.payload;
        const text = `${content.title}\n${searchableText(payload)}`.toLowerCase();
        if (text.includes(query) || contentShares.has(content.id)) {
          if (text.includes(query)) {
            const idx = text.indexOf(query);
            results.push({
              type: "CAMPAIGN_CONTENT",
              id: content.id,
              campaignId: c.id,
              title: content.title,
              status: content.status,
              snippet: redactEmails(
                text.slice(Math.max(0, idx - 40), idx + query.length + 120),
              ),
              updatedAt: content.updatedAt.toISOString(),
            });
          }
        }
      }
    }
  }

  if (contentShares.size) {
    const contents = await db.marketingContent.findMany({
      where: {
        id: { in: [...contentShares] },
        organizationId: "studiojeker",
        // Skip ones already covered via shared campaigns to reduce noise.
        ...(campaignShares.size
          ? { OR: [{ campaignId: null }, { campaignId: { notIn: [...campaignShares] } }] }
          : {}),
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    for (const content of contents) {
      const text = `${content.title}\n${searchableText(content.versions[0]?.payload)}`.toLowerCase();
      if (!text.includes(query)) continue;
      const idx = text.indexOf(query);
      results.push({
        type: "CONTENT",
        id: content.id,
        title: content.title,
        status: content.status,
        snippet: redactEmails(
          text.slice(Math.max(0, idx - 40), idx + query.length + 120),
        ),
        updatedAt: content.updatedAt.toISOString(),
        campaignId: content.campaignId ?? undefined,
      });
    }
  }

  if (seriesShares.size) {
    const series = await db.studioSeries.findMany({
      where: { id: { in: [...seriesShares] }, organizationId: "studiojeker" },
    });
    for (const s of series) {
      const text = `${s.title}\n${searchableText(s.briefing)}`.toLowerCase();
      if (!text.includes(query)) continue;
      results.push({
        type: "SERIES",
        id: s.id,
        title: s.title,
        snippet: redactEmails(text.slice(0, 280)),
        updatedAt: s.createdAt.toISOString(),
      });
    }
  }

  if (conceptShares.size) {
    const concepts = await db.strategyConcept.findMany({
      where: {
        id: { in: [...conceptShares] },
        organizationId: "studiojeker",
      },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
        series: { select: { title: true } },
      },
    });
    for (const concept of concepts) {
      const payload = concept.versions[0]?.payload;
      const parsed = conceptInput.safeParse(payload);
      const title = parsed.success ? parsed.data.title : concept.series.title;
      const text = `${title}\n${searchableText(payload)}`.toLowerCase();
      if (!text.includes(query)) continue;
      results.push({
        type: "CONCEPT",
        id: concept.id,
        title,
        snippet: redactEmails(text.slice(0, 280)),
        updatedAt: concept.updatedAt.toISOString(),
      });
    }
  }

  if (libraryShares.size) {
    const items = await db.libraryItem.findMany({
      where: {
        id: { in: [...libraryShares] },
        organizationId: "studiojeker",
        archivedAt: null,
      },
    });
    for (const item of items) {
      const text = `${item.title}\n${item.description}\n${item.text}`.toLowerCase();
      if (!text.includes(query)) continue;
      results.push({
        type: "LIBRARY",
        id: item.id,
        title: item.title,
        snippet: redactEmails((item.text || item.description || item.title).slice(0, 280)),
        updatedAt: item.updatedAt.toISOString(),
      });
    }
  }

  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { q: query, count: results.length, results: results.slice(0, 50) };
}
