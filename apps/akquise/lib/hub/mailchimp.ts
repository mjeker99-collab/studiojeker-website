import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { approvedContent, hubActor } from "./workflow";
import { newsletterHtml } from "./newsletter";
import { newsletterText } from "./newsletter-template";

type Audience = {
  id: string;
  name: string;
  campaign_defaults?: { from_name?: string; from_email?: string };
};

function config() {
  const key = process.env.MAILCHIMP_API_KEY?.trim() || "";
  const match = key.match(/-([a-z]{2,4}\d{1,3})$/i);
  if (!match) throw new PolicyError("Mailchimp-API-Key auf dem Server fehlt oder ist ungültig.", 503);
  return { key, dc: match[1].toLowerCase() };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { key, dc } = config();
  let response: Response;
  try {
    response = await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`studioone:${key}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch {
    throw new PolicyError("Mailchimp ist derzeit nicht erreichbar.", 502);
  }
  if (!response.ok) {
    // Provider response may contain account details; never return it to clients.
    throw new PolicyError(
      response.status === 401 || response.status === 403
        ? "Mailchimp hat den API-Key abgelehnt."
        : `Mailchimp-Anfrage fehlgeschlagen (HTTP ${response.status}).`,
      502,
    );
  }
  return (await response.json()) as T;
}

export async function mailchimpAudiences(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  if (!process.env.MAILCHIMP_API_KEY) return { connected: false, audiences: [] };
  const result = await request<{ lists: Audience[] }>(
    "/lists?fields=lists.id,lists.name,lists.campaign_defaults&count=100",
  );
  return {
    connected: true,
    audiences: result.lists.map(({ id, name }) => ({ id, name })),
  };
}

export async function transferNewsletter(actor: string, id: string, version: number, audienceId: string) {
  if (!/^[a-z0-9]{1,64}$/i.test(audienceId))
    throw new PolicyError("Ungültige Mailchimp-Audience.");
  config();
  const list = await request<Audience>(`/lists/${audienceId}`);
  if (!list.campaign_defaults?.from_email || !list.campaign_defaults.from_name)
    throw new PolicyError("Mailchimp-Audience benötigt einen Absendernamen und eine Absenderadresse.");
  // Reserve before the remote call so simultaneous clicks cannot create duplicates.
  const reservation = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
    const { c, payload } = await approvedContent(tx, id, version);
    if (c.kind !== "NEWSLETTER") throw new PolicyError("Nur Newsletter können übertragen werden.");
    if (await tx.mailchimpTransfer.findUnique({ where: { contentId_version: { contentId: id, version } } }))
      throw new PolicyError("Diese Version wurde bereits nach Mailchimp übertragen oder befindet sich in Prüfung. Keine zweite Übertragung auslösen.", 409);
    const v = await tx.marketingVersion.findUniqueOrThrow({ where: { contentId_version: { contentId: id, version } } });
    const transfer = await tx.mailchimpTransfer.create({
      data: { contentId: id, version, hash: v.hash, audienceId, userId: actor },
    });
    await audit(tx, actor, "MAILCHIMP_TRANSFER_RESERVED", id, { version, transferId: transfer.id, audienceId });
    return { transfer, title: c.title, payload };
  });
  const { transfer, payload } = reservation;
  try {
    const campaign = await request<{ id: string; web_id?: number }>("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        type: "regular",
        recipients: { list_id: audienceId },
        settings: {
          title: `${reservation.title} · StudioONE V${version}`,
          subject_line: payload.subject,
          preview_text: payload.preheader,
          from_name: list.campaign_defaults.from_name,
          reply_to: list.campaign_defaults.from_email,
        },
      }),
    });
    if (!campaign.id) throw new PolicyError("Mailchimp hat keine Kampagnen-ID zurückgegeben.", 502);
    await db.mailchimpTransfer.update({ where: { id: transfer.id }, data: { remoteId: campaign.id, webId: campaign.web_id ?? null } });
    await request(`/campaigns/${encodeURIComponent(campaign.id)}/content`, {
      method: "PUT",
      body: JSON.stringify({
        html: newsletterHtml(payload),
        plain_text: payload.newsletter ? newsletterText(payload.newsletter) : payload.body,
      }),
    });
    await db.$transaction(async (tx) => {
      await tx.mailchimpTransfer.update({ where: { id: transfer.id }, data: { status: "DRAFT" } });
      await audit(tx, actor, "MAILCHIMP_DRAFT_CREATED_NOT_SENT", id, { version, transferId: transfer.id, remoteId: campaign.id });
    });
    const { dc } = config();
    return { transferred: true, sent: false, campaignId: campaign.id,
      url: campaign.web_id ? `https://${dc}.admin.mailchimp.com/campaigns/show/?id=${campaign.web_id}` : null };
  } catch (error) {
    await db.$transaction(async (tx) => {
      await tx.mailchimpTransfer.update({ where: { id: transfer.id }, data: { status: "UNKNOWN" } });
      await audit(tx, actor, "MAILCHIMP_TRANSFER_UNKNOWN", id, { version, transferId: transfer.id });
    });
    throw error;
  }
}
