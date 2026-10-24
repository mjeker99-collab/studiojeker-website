import { timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { PolicyError } from "../policy";
import { defaultScopes, type GptScopes } from "./types";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const WRITE_RATE_MAX = 20;
const hits = new Map<string, number[]>();

function parseScopes(raw: unknown): GptScopes {
  const base = defaultScopes();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  return {
    projects: o.projects !== false,
    campaigns: o.campaigns !== false,
    concepts: o.concepts !== false,
    content: o.content !== false,
    // Opt-in only — existing read-only rows without this key stay read-only.
    write_drafts: o.write_drafts === true,
  };
}

export function connectorTokenConfigured() {
  return Boolean(process.env.CHATGPT_CONNECTOR_TOKEN?.trim());
}

export function writeTokenConfigured() {
  return Boolean(process.env.CHATGPT_CONNECTOR_WRITE_TOKEN?.trim());
}

function bearerEqual(expected: string, actual: string) {
  return (
    Boolean(expected) &&
    Buffer.byteLength(expected) === Buffer.byteLength(actual) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  );
}

export function verifyConnectorBearer(req: Request) {
  const expected = process.env.CHATGPT_CONNECTOR_TOKEN ?? "";
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearerEqual(expected, actual))
    throw new PolicyError("Nicht autorisiert.", 401);
}

/** Write endpoints require the dedicated write token (never the read-only token). */
export function verifyWriteBearer(req: Request) {
  const writeToken = process.env.CHATGPT_CONNECTOR_WRITE_TOKEN ?? "";
  if (!writeToken.trim())
    throw new PolicyError(
      "Schreib-Token ist nicht konfiguriert. ChatGPT darf keine Entwürfe speichern.",
      503,
    );
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearerEqual(writeToken, actual))
    throw new PolicyError("Nicht autorisiert.", 401);
}

function rateLimit(key: string, max: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= max)
    throw new PolicyError("Zu viele Anfragen. Bitte kurz warten.", 429);
  recent.push(now);
  hits.set(key, recent);
}

/** Clears in-memory rate buckets (tests only). */
export function resetConnectorRateLimit() {
  hits.clear();
}

async function auditActorId() {
  const email = process.env.MARTIN_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, active: true },
  });
  return user?.active ? user.id : null;
}

export async function requireGptConnector(
  req: Request,
  scope: keyof GptScopes,
) {
  verifyConnectorBearer(req);
  rateLimit("chatgpt-connector", RATE_MAX);
  const settings = await db.gptIntegration.findUnique({
    where: { id: "studiojeker" },
  });
  if (!settings || settings.revokedAt)
    throw new PolicyError("ChatGPT-Zugriff ist widerrufen oder nicht aktiv.", 403);
  const scopes = parseScopes(settings.scopes);
  if (!scopes[scope])
    throw new PolicyError("Dieser Inhaltsbereich ist nicht freigeschaltet.", 403);

  const path = new URL(req.url).pathname;
  const actorId = await auditActorId();
  await db.$transaction(async (tx) => {
    await tx.gptIntegration.update({
      where: { id: "studiojeker" },
      data: { lastAccessAt: new Date() },
    });
    if (actorId) {
      await tx.audit.create({
        data: {
          userId: actorId,
          action: "GPT_CONNECTOR_READ",
          entityId: path.slice(0, 200),
          detail: { method: req.method, scope },
        },
      });
    }
  });

  return { scopes, actorId };
}

/**
 * Auth for draft write endpoints.
 * Requires dedicated write token + write_drafts scope + non-revoked integration.
 * The read-only connector token is never accepted here.
 */
export async function requireGptWrite(req: Request) {
  verifyWriteBearer(req);
  rateLimit("chatgpt-connector-write", WRITE_RATE_MAX);
  const settings = await db.gptIntegration.findUnique({
    where: { id: "studiojeker" },
  });
  if (!settings || settings.revokedAt)
    throw new PolicyError("ChatGPT-Zugriff ist widerrufen oder nicht aktiv.", 403);
  const scopes = parseScopes(settings.scopes);
  if (!scopes.write_drafts)
    throw new PolicyError(
      "Schreibzugriff für Entwürfe ist nicht freigeschaltet.",
      403,
    );

  const actorId = await auditActorId();
  if (!actorId)
    throw new PolicyError(
      "Kein aktiver StudioONE-Akteur für ChatGPT-Schreibzugriff konfiguriert.",
      503,
    );

  const path = new URL(req.url).pathname;
  await db.$transaction(async (tx) => {
    await tx.gptIntegration.update({
      where: { id: "studiojeker" },
      data: { lastWriteAccessAt: new Date(), lastAccessAt: new Date() },
    });
    await tx.audit.create({
      data: {
        userId: actorId,
        action: "GPT_CONNECTOR_WRITE",
        entityId: path.slice(0, 200),
        detail: { method: req.method, scope: "write_drafts", source: "chatgpt" },
      },
    });
  });

  return { scopes, actorId };
}

export { parseScopes, auditActorId };
