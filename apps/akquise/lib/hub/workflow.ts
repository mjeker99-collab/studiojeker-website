import { newsletterText } from "./newsletter-template";
import { validateStudio } from "../studio/validate";
import { createHash } from "node:crypto";
import { db } from "../db";
import { allowedAccount } from "../config.mjs";
import { PolicyError } from "../policy";
import { audit, type Tx } from "../workflow";
import { campaignInput, contentInput, type ContentInput } from "./input";
import {
  canPromoteToSocial,
  type ContentWorkspace,
} from "./workspace";
export const contentHash = (payload: ContentInput) => {
  // PostgreSQL JSONB may reorder record keys. Canonicalize the new newsletter
  // fields only, preserving the existing hash format for legacy content.
  const canonical = payload.newsletter
    ? {
        ...payload,
        newsletter: {
          ...payload.newsletter,
          fields: Object.fromEntries(
            Object.entries(payload.newsletter.fields).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          ),
        },
      }
    : payload;
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
};
export async function hubActor(tx: Tx, id: string) {
  const u = await tx.user.findFirst({ where: { id, active: true } });
  if (!u || !allowedAccount(u))
    throw new PolicyError("Keine Berechtigung.", 403);
}
async function lock(tx: Tx, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
}
async function associations(
  tx: Tx,
  ownerId: string,
  campaignId: string | null,
) {
  await hubActor(tx, ownerId);
  if (campaignId)
    await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
}
export async function saveCampaign(
  actor: string,
  raw: unknown,
  id?: string,
  revision?: number,
) {
  const data = campaignInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await associations(tx, data.ownerId, null);
    if (id) {
      await lock(tx, id);
      const current = await tx.campaign.findUniqueOrThrow({ where: { id } });
      if (current.revision !== revision)
        throw new PolicyError("Kampagne wurde geändert. Neu laden.", 409);
      if (
        data.customerId &&
        data.customerId !== current.customerId &&
        !(await tx.customer.findFirst({
          where: {
            id: data.customerId,
            organizationId: "studiojeker",
            status: "ACTIVE",
          },
        }))
      )
        throw new PolicyError("Kunde nicht zugänglich.", 403);
    } else if (
      data.customerId &&
      !(await tx.customer.findFirst({
        where: {
          id: data.customerId,
          organizationId: "studiojeker",
          status: "ACTIVE",
        },
      }))
    ) {
      throw new PolicyError("Kunde nicht zugänglich.", 403);
    }
    const c = id
      ? await tx.campaign.update({
          where: { id },
          data: { ...data, revision: { increment: 1 } },
        })
      : await tx.campaign.create({ data });
    await audit(tx, actor, "CAMPAIGN_SAVED", c.id, { revision: c.revision });
    return c;
  });
}
export async function saveContent(
  actor: string,
  raw: unknown,
  id?: string,
  expectedVersion?: number,
) {
  const payload = contentInput.parse(raw);
  if (payload.newsletter)
    payload.body = newsletterText(payload.newsletter).trim();
  return db.$transaction((tx) =>
    saveContentInTx(tx, actor, payload, id, expectedVersion),
  );
}
export async function saveContentInTx(
  tx: Tx,
  actor: string,
  payload: ContentInput,
  id?: string,
  expectedVersion?: number,
  options?: { workspace?: ContentWorkspace },
) {
  await hubActor(tx, actor);
  await associations(tx, payload.ownerId, payload.campaignId);
  if (payload.studio) await validateStudio(tx, payload.studio);
  if (id) await lock(tx, id);
  const old = id
    ? await tx.marketingContent.findUniqueOrThrow({ where: { id } })
    : null;
  if (old && (old.version !== expectedVersion || old.kind !== payload.kind))
    throw new PolicyError("Inhalt wurde geändert. Neu laden.", 409);
  if (old?.studioSeriesId && old.studioSeriesId !== payload.studio?.seriesId)
    throw new PolicyError(
      "Studio-Zuordnung darf nicht entfernt oder geändert werden.",
      409,
    );
  const version = (old?.version ?? 0) + 1;
  const workspace: ContentWorkspace | undefined = old
    ? undefined
    : options?.workspace ||
      (payload.kind === "SOCIAL"
        ? payload.studio
          ? "CONTENT_DRAFT"
          : "SOCIAL_POST"
        : "SOCIAL_POST");
  const data = {
    studioSeriesId: payload.studio?.seriesId,
    title: payload.title,
    kind: payload.kind,
    ...(workspace ? { workspace } : {}),
    ownerId: payload.ownerId,
    campaignId: payload.campaignId,
    scheduledAt: payload.scheduledAt,
    version,
    status: "DRAFT" as const,
  };
  const c = old
    ? await tx.marketingContent.update({ where: { id }, data })
    : await tx.marketingContent.create({ data });
  await tx.marketingVersion.create({
    data: {
      contentId: c.id,
      version,
      payload,
      hash: contentHash(payload),
      authorId: actor,
    },
  });
  await tx.marketingApproval.updateMany({
    where: { contentId: c.id, status: { in: ["APPROVED", "PENDING"] } },
    data: { status: "INVALIDATED" },
  });
  await audit(tx, actor, "MARKETING_VERSION_SAVED", c.id, { version });
  return c;
}

/**
 * Move a Content Studio draft or GPT dialog stub into the Social publishing list.
 * Does not delete data, bump content versions, or invalidate approvals.
 * Campaign links stay as already stored on the content / series.
 */
export async function promoteToSocialPost(
  actor: string,
  id: string,
  expectedVersion: number,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, id);
    const content = await tx.marketingContent.findUniqueOrThrow({
      where: { id },
    });
    if (content.version !== expectedVersion)
      throw new PolicyError("Inhalt wurde geändert. Neu laden.", 409);
    if (content.archivedAt)
      throw new PolicyError(
        "Archivierte Dialoge zuerst wiederherstellen, danach übernehmen.",
        409,
      );
    if (!canPromoteToSocial(content))
      throw new PolicyError(
        "Nur Content-Entwürfe und GPT-Dialoge können in Social Media übernommen werden.",
        409,
      );
    const updated = await tx.marketingContent.update({
      where: { id },
      data: { workspace: "SOCIAL_POST" },
    });
    await audit(tx, actor, "SOCIAL_POST_PROMOTED", id, {
      from: content.workspace,
      campaignId: content.campaignId,
      version: content.version,
    });
    return updated;
  });
}

export async function reviewContent(
  actor: string,
  id: string,
  version: number,
  decision: "PENDING" | "APPROVED" | "REJECTED",
  read: boolean,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, id);
    const c = await tx.marketingContent.findUniqueOrThrow({
      where: { id },
      include: { versions: { where: { version } } },
    });
    if (c.version !== version)
      throw new PolicyError("Version wurde geändert. Neu laden.", 409);
    if (decision === "APPROVED" && !read)
      throw new PolicyError(
        "Vollständigen Inhalt einschliesslich aller Varianten und Medien prüfen.",
      );
    if (
      decision === "APPROVED" &&
      c.kind === "SOCIAL" &&
      c.workspace === "GPT_DIALOG"
    )
      throw new PolicyError(
        "Zuerst «In Social Media übernehmen», danach freigeben.",
        409,
      );
    if (c.status === "DONE")
      throw new PolicyError(
        "Erledigten Inhalt zuerst als neue Version bearbeiten.",
        409,
      );
    const v = c.versions[0];
    const checkedPayload = contentInput.parse(v.payload);
    if (decision === "APPROVED" && checkedPayload.studio) {
      const s = checkedPayload.studio;
      await validateStudio(tx, s);
      if (!s.motifAssetId)
        throw new PolicyError(
          "Studio-Freigabe benötigt ein zugeordnetes Bildmotiv.",
        );
      if (((s.showHeadline && s.headline) || s.showClaim) && !s.fontAssetId)
        throw new PolicyError(
          "Freigegebene Schriftdatei für sichtbare Textebenen fehlt.",
        );
    }
    await tx.marketingApproval.updateMany({
      where: { contentId: id, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "INVALIDATED" },
    });
    await tx.marketingApproval.create({
      data: {
        contentId: id,
        userId: actor,
        version,
        hash: v.hash,
        status: decision,
      },
    });
    await tx.marketingContent.update({
      where: { id },
      data: {
        status:
          decision === "APPROVED"
            ? "APPROVED"
            : decision === "PENDING"
              ? "IN_REVIEW"
              : "DRAFT",
      },
    });
    await audit(tx, actor, "MARKETING_REVIEW", id, { version, decision });
  });
}
export async function approvedContent(tx: Tx, id: string, version: number) {
  const c = await tx.marketingContent.findUniqueOrThrow({
    where: { id },
    include: { versions: { where: { version } } },
  });
  const v = c.versions[0];
  if (
    c.version !== version ||
    !v ||
    contentHash(contentInput.parse(v.payload)) !== v.hash ||
    !(await tx.marketingApproval.findFirst({
      where: { contentId: id, version, hash: v.hash, status: "APPROVED" },
    }))
  )
    throw new PolicyError("Exakte Inhaltsversion ist nicht freigegeben.", 409);
  return { c, payload: contentInput.parse(v.payload) };
}
export async function recordPublication(
  actor: string,
  id: string,
  version: number,
  channel: string,
  publishedAt: string,
  url: string,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, id);
    const { c, payload } = await approvedContent(tx, id, version);
    if (c.workspace !== "SOCIAL_POST")
      throw new PolicyError(
        "Nur Social Posts im Publishing-Workspace können manuell veröffentlicht werden.",
        409,
      );
    if (
      c.kind !== "SOCIAL" ||
      !payload.variants.some((v) => v.channel === channel)
    )
      throw new PolicyError(
        "Nur vorhandene Social-Kanäle können manuell dokumentiert werden.",
      );
    if (new Date(publishedAt).valueOf() > Date.now())
      throw new PolicyError(
        "Eine tatsächliche Veröffentlichung darf nicht in der Zukunft liegen.",
      );
    if (
      await tx.manualPublication.findUnique({
        where: {
          contentId_version_channel: { contentId: id, version, channel },
        },
      })
    )
      throw new PolicyError(
        "Veröffentlichung dieser Version bereits dokumentiert.",
        409,
      );
    await tx.manualPublication.create({
      data: {
        contentId: id,
        version,
        channel,
        publishedAt,
        url,
        userId: actor,
      },
    });
    const count = await tx.manualPublication.count({
      where: { contentId: id, version },
    });
    if (count === payload.variants.length)
      await tx.marketingContent.update({
        where: { id },
        data: { status: "DONE" },
      });
    await audit(tx, actor, "MANUAL_PUBLICATION_RECORDED", id, {
      version,
      channel,
      publishedAt,
      url,
    });
  });
}
export async function completeContent(
  actor: string,
  id: string,
  version: number,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, id);
    await approvedContent(tx, id, version);
    await tx.marketingContent.update({
      where: { id },
      data: { status: "DONE" },
    });
    await audit(tx, actor, "EDITORIAL_COMPLETED_ONLY", id, { version });
  });
}
export async function planDraft(
  actor: string,
  id: string,
  revision: number,
  campaignId: string | null,
  ownerId: string | null,
  scheduledAt: string | null,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    if (ownerId) await associations(tx, ownerId, campaignId);
    else if (campaignId)
      await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    // Same lock as existing draft edits, independent metadata revision.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"draft:" + id}))`;
    const old = await tx.draft.findUniqueOrThrow({ where: { id } });
    if (old.planningRevision !== revision)
      throw new PolicyError("Planung wurde geändert. Neu laden.", 409);
    await tx.draft.update({
      where: { id },
      data: {
        campaignId,
        ownerId,
        scheduledAt,
        planningRevision: { increment: 1 },
      },
    });
    await audit(tx, actor, "DRAFT_PLANNED_NO_DISPATCH", id, {
      campaignId,
      ownerId,
      scheduledAt,
    });
  });
}
