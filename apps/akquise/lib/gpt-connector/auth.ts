import { timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { PolicyError } from "../policy";
import { defaultScopes, type GptScopes } from "./types";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
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
  };
}

export function connectorTokenConfigured() {
  return Boolean(process.env.CHATGPT_CONNECTOR_TOKEN?.trim());
}

export function verifyConnectorBearer(req: Request) {
  const expected = process.env.CHATGPT_CONNECTOR_TOKEN ?? "";
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    throw new PolicyError("Nicht autorisiert.", 401);
}

function rateLimit(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX)
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
  rateLimit("chatgpt-connector");
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

  return { scopes };
}

export { parseScopes };
