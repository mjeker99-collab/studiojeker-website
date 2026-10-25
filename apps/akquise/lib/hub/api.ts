import {
  importNewsletters,
  duplicateNewsletter,
  duplicateInput,
} from "./newsletter-library";
import { conceptInput } from "../concepts/input";
import { transferNewsletter } from "./mailchimp";
import { z } from "zod";
import { db } from "../db";
import {
  saveCampaign,
  saveContent,
  reviewContent,
  recordPublication,
  completeContent,
  planDraft,
  promoteToSocialPost,
} from "./workflow";
import { exportNewsletter } from "./newsletter";
import { instant, safeUrl, channels } from "./input";
const version = z.number().int().positive();
export async function hubState() {
  const [campaigns, contents, users, drafts, social, customers] =
    await Promise.all([
      db.campaign.findMany({
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { contents: true, drafts: true } } },
      }),
      db.marketingContent.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" } },
          approvals: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true } } },
          },
          publications: true,
          exports: { orderBy: { createdAt: "desc" } },
          mailchimpTransfers: { orderBy: { createdAt: "desc" } },
        },
      }),
      db.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
      }),
      db.draft.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
          approvals: { orderBy: { createdAt: "desc" } },
          deliveries: true,
        },
      }),
      db.socialConnection.findMany({
        select: { provider: true, expiresAt: true },
      }),
      db.customer.findMany({
        where: { organizationId: "studiojeker" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      }),
    ]);
  const conceptVersions = await db.strategyVersion.findMany({
    where: {
      handoffCampaignId: { in: campaigns.map((c) => c.id) },
      approvedAt: { not: null },
      concept: { organizationId: "studiojeker" },
    },
  });
  return {
    campaigns: campaigns.map((c) => {
      const version = conceptVersions.find(
        (v) =>
          v.handoffCampaignId === c.id &&
          conceptInput.parse(v.payload).customerId === c.customerId,
      );
      return {
        ...c,
        conceptBriefing: version
          ? { conceptId: version.conceptId, version: version.version }
          : null,
      };
    }),
    contents,
    users,
    drafts,
    customers,
    integrations: {
      linkedin: social.some(
        (c) =>
          c.provider === "LINKEDIN" &&
          (!c.expiresAt || c.expiresAt > new Date()),
      )
        ? "MEMBER_CONNECTED"
        : "NOT_CONNECTED",
      instagram: social.some(
        (c) =>
          c.provider === "INSTAGRAM" &&
          (!c.expiresAt || c.expiresAt > new Date()),
      )
        ? "CONNECTED"
        : "NOT_CONNECTED",
      facebook: social.some(
        (c) =>
          c.provider === "FACEBOOK" &&
          (!c.expiresAt || c.expiresAt > new Date()),
      )
        ? "CONNECTED"
        : "NOT_CONNECTED",
      mailchimp: process.env.MAILCHIMP_API_KEY ? "CONFIGURED" : "NOT_CONNECTED",
    },
  };
}
export async function hubMutation(
  actor: string,
  path: string[],
  body: unknown,
) {
  const id = path[2];
  if (path.join("/") === "hub/newsletter/import") {
    z.object({}).strict().parse(body);
    return importNewsletters(actor);
  }
  if (path[1] === "newsletter-duplicate" && path.length === 3)
    return duplicateNewsletter(actor, id, duplicateInput.parse(body).version);
  if (path[1] === "mailchimp-transfer" && path.length === 3) {
    const d = z
      .object({ version, audienceId: z.string().min(1).max(64) })
      .strict()
      .parse(body);
    return transferNewsletter(actor, id, d.version, d.audienceId);
  }
  if (path[1] === "campaigns" && path.length === 2)
    return saveCampaign(actor, body);
  if (path[1] === "contents" && path.length === 2)
    return saveContent(actor, body);
  const envelope = z.object({ version, data: z.unknown() }).strict();
  if (path[1] === "campaigns" && path.length === 3) {
    const d = envelope.parse(body);
    return saveCampaign(actor, d.data, id, d.version);
  }
  if (path[1] === "contents" && path.length === 3) {
    const d = envelope.parse(body);
    return saveContent(actor, d.data, id, d.version);
  }
  if (path[1] === "review" && path.length === 3) {
    const d = z
      .object({
        version,
        decision: z.enum(["PENDING", "APPROVED", "REJECTED"]),
        read: z.boolean(),
      })
      .strict()
      .parse(body);
    await reviewContent(actor, id, d.version, d.decision, d.read);
    return { ok: true };
  }
  if (path[1] === "publication" && path.length === 3) {
    const d = z
      .object({
        version,
        channel: z.enum(channels),
        publishedAt: z.string().datetime({ offset: true }),
        url: safeUrl,
        confirmed: z.literal(true),
      })
      .strict()
      .parse(body);
    await recordPublication(
      actor,
      id,
      d.version,
      d.channel,
      d.publishedAt,
      d.url,
    );
    return { ok: true };
  }
  if (path[1] === "complete" && path.length === 3) {
    const d = z.object({ version }).strict().parse(body);
    await completeContent(actor, id, d.version);
    return { ok: true };
  }
  if (path[1] === "promote-social" && path.length === 3) {
    const d = z.object({ version }).strict().parse(body);
    return promoteToSocialPost(actor, id, d.version);
  }
  if (path[1] === "export" && path.length === 3) {
    const d = z.object({ version }).strict().parse(body);
    return exportNewsletter(actor, id, d.version);
  }
  if (path[1] === "draft-plan" && path.length === 3) {
    const d = z
      .object({
        version,
        campaignId: z.string().nullable(),
        ownerId: z.string().nullable(),
        scheduledAt: instant,
      })
      .strict()
      .parse(body);
    await planDraft(
      actor,
      id,
      d.version,
      d.campaignId,
      d.ownerId,
      d.scheduledAt,
    );
    return { ok: true };
  }
  return null;
}
