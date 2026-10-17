import { marketingConnections } from "./integrations";
import { z } from "zod";
import { db } from "../db";
import {
  saveCampaign,
  saveContent,
  reviewContent,
  recordPublication,
  completeContent,
  planDraft,
} from "./workflow";
import { exportNewsletter } from "./newsletter";
import { instant, safeUrl, channels } from "./input";
const version = z.number().int().positive();
export async function hubState() {
  const [campaigns, contents, users, drafts] = await Promise.all([
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
  ]);
  return {
    campaigns,
    contents,
    users,
    drafts,
    integrations: marketingConnections,
  };
}
export async function hubMutation(
  actor: string,
  path: string[],
  body: unknown,
) {
  const id = path[2];
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
