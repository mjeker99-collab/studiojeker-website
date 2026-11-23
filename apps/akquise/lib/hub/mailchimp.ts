import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { approvedContent, hubActor } from "./workflow";
import { newsletterHtml } from "./newsletter";
import { newsletterText } from "./newsletter-template";
import type { MailchimpErrorClass } from "./mailchimp-report";

type Audience = {
  id: string;
  name: string;
  campaign_defaults?: { from_name?: string; from_email?: string };
};

const SERVER_PREFIX = /^[a-z]{2,4}\d{1,3}$/;
export const MAILCHIMP_TIMEOUT_MS = 15_000;

export class MailchimpReadError extends PolicyError {
  constructor(
    message: string,
    public errorClass: MailchimpErrorClass,
    status = 502,
  ) {
    super(message, status);
  }
}

// The datacenter is the suffix Mailchimp appends to the API key, for this
// account `us17`. MAILCHIMP_SERVER_PREFIX may repeat that suffix and must
// never point the same key at another host. The key stays server-side.
export function mailchimpConfiguration():
  | { ok: true; serverPrefix: string; authorization: string }
  | { ok: false; errorClass: "not_configured" | "invalid_configuration" } {
  const key = process.env.MAILCHIMP_API_KEY?.trim() || "";
  if (!key) return { ok: false, errorClass: "not_configured" };
  const suffix = key.match(/-([a-z]{2,4}\d{1,3})$/i)?.[1]?.toLowerCase() || "";
  const explicit = process.env.MAILCHIMP_SERVER_PREFIX?.trim().toLowerCase() || "";
  if (!SERVER_PREFIX.test(suffix) || (explicit && explicit !== suffix))
    return { ok: false, errorClass: "invalid_configuration" };
  return {
    ok: true,
    serverPrefix: suffix,
    authorization: `Basic ${Buffer.from(`studioone:${key}`).toString("base64")}`,
  };
}

function config() {
  const cfg = mailchimpConfiguration();
  if (!cfg.ok)
    throw new PolicyError("Mailchimp-API-Key auf dem Server fehlt oder ist ungültig.", 503);
  return cfg;
}

export function mailchimpEndpoint(serverPrefix: string, path: string) {
  return `https://${serverPrefix}.api.mailchimp.com/3.0${path}`;
}

function assertReadPath(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("://") ||
    path.includes("..") ||
    /[\s\\]/.test(path)
  )
    throw new MailchimpReadError("Mailchimp-Anfrage ist nicht erlaubt.", "http", 403);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = config();
  let response: Response;
  try {
    response = await fetch(mailchimpEndpoint(cfg.serverPrefix, path), {
      ...init,
      headers: {
        Authorization: cfg.authorization,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(MAILCHIMP_TIMEOUT_MS),
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

function transportClass(error: unknown): "timeout" | "unreachable" {
  const name = error instanceof Error ? error.name : "";
  return name === "TimeoutError" || name === "AbortError" ? "timeout" : "unreachable";
}

/** GET only. Campaign transfer keeps its own write path and is not used here. */
export async function mailchimpGet<T>(path: string, attempt = 0): Promise<T> {
  assertReadPath(path);
  const cfg = mailchimpConfiguration();
  if (!cfg.ok)
    throw new MailchimpReadError(
      cfg.errorClass === "not_configured"
        ? "Mailchimp-API-Key auf dem Server fehlt oder ist ungültig."
        : "Mailchimp-Serverpräfix fehlt oder widerspricht dem API-Key.",
      cfg.errorClass,
      503,
    );
  let response: Response;
  try {
    response = await fetch(mailchimpEndpoint(cfg.serverPrefix, path), {
      method: "GET",
      headers: { Authorization: cfg.authorization, Accept: "application/json" },
      signal: AbortSignal.timeout(MAILCHIMP_TIMEOUT_MS),
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    const errorClass = transportClass(error);
    if (errorClass === "unreachable" && attempt < 1) return mailchimpGet<T>(path, attempt + 1);
    throw new MailchimpReadError(
      errorClass === "timeout"
        ? "Mailchimp hat nicht rechtzeitig geantwortet."
        : "Mailchimp ist derzeit nicht erreichbar.",
      errorClass,
    );
  }
  if (response.status === 429 && attempt < 1) {
    const header = Number(response.headers.get("retry-after"));
    const wait = Number.isFinite(header) && header >= 0 ? Math.min(header * 1000, 1000) : 250;
    await new Promise((resolve) => setTimeout(resolve, wait));
    return mailchimpGet<T>(path, attempt + 1);
  }
  if (!response.ok) {
    const errorClass =
      response.status === 401 || response.status === 403
        ? "auth"
        : response.status === 429
          ? "rate_limited"
          : "http";
    throw new MailchimpReadError(
      errorClass === "auth"
        ? "Mailchimp hat den API-Key abgelehnt."
        : `Mailchimp-Anfrage fehlgeschlagen (HTTP ${response.status}).`,
      errorClass,
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
  }
}

export async function mailchimpAudiences(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  if (!mailchimpConfiguration().ok) return { connected: false, audiences: [] };
  const result = await mailchimpGet<{ lists?: Audience[] }>(
    "/lists?fields=lists.id,lists.name,lists.campaign_defaults&count=100",
  );
  return {
    connected: true,
    audiences: (result.lists ?? []).map(({ id, name }) => ({ id, name })),
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
    const { serverPrefix } = config();
    return { transferred: true, sent: false, campaignId: campaign.id,
      url: campaign.web_id ? `https://${serverPrefix}.admin.mailchimp.com/campaigns/show/?id=${campaign.web_id}` : null };
  } catch (error) {
    await db.$transaction(async (tx) => {
      await tx.mailchimpTransfer.update({ where: { id: transfer.id }, data: { status: "UNKNOWN" } });
      await audit(tx, actor, "MAILCHIMP_TRANSFER_UNKNOWN", id, { version, transferId: transfer.id });
    });
    throw error;
  }
}
