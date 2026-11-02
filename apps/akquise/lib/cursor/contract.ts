import { z } from "zod";
import {
  isAgentId,
  isRunId,
  openableCursorHref,
  safeAgentUrl,
  statusFromRun,
  type CursorBlock,
  type CursorStatus,
} from "./status";

// Cloud Agents API v1. https://cursor.com/docs/cloud-agent/api/endpoints
export const handoffInput = z
  .object({ instruction: z.string().trim().min(1).max(4000) })
  .strict();
export const CURSOR_API = "https://api.cursor.com";
export const NEWSLETTER_REPO_URL =
  "https://github.com/mjeker99-collab/studiojeker-website";

export type NewsletterEdition = { templateId: string; prUrl: string };

/**
 * Editions this bridge may hand to Cursor. Pull requests are fixed in code.
 * PR 313 (Newsletter V4) and PR 305 (V4 copy of V3) are rejected even if listed.
 */
export const APPROVED_NEWSLETTER_EDITIONS: readonly NewsletterEdition[] = [];

const PROTECTED_TEMPLATE_IDS = new Set([
  "newsletter-03",
  "newsletter-03-promo-nov2026",
]);
const RUN_STATUSES = new Set([
  "CREATING",
  "RUNNING",
  "WAITING_FOR_BACKGROUND_WORK",
  "FINISHED",
  "ERROR",
  "CANCELLED",
  "EXPIRED",
]);

export class CursorApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super("Cursor-Anfrage fehlgeschlagen.");
  }
}

export function readCursorKey(
  env: NodeJS.ProcessEnv | { CURSOR_API_KEY?: string } = process.env,
) {
  const key = env.CURSOR_API_KEY?.trim() ?? "";
  if (key.length < 16) return null;
  return key;
}

export function approvedEdition(
  templateId: string,
  editions: readonly NewsletterEdition[] = APPROVED_NEWSLETTER_EDITIONS,
) {
  const match = editions.find((edition) => edition.templateId === templateId);
  if (!match || openableCursorHref(match.prUrl) !== match.prUrl) return null;
  return { templateId, prUrl: match.prUrl };
}

export function blockReason(
  templateId: string,
  editions: readonly NewsletterEdition[] = APPROVED_NEWSLETTER_EDITIONS,
): CursorBlock | null {
  if (PROTECTED_TEMPLATE_IDS.has(templateId)) return "protected";
  if (!approvedEdition(templateId, editions)) return "unapproved";
  return null;
}

export function cleanInstruction(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

export function buildPrompt(
  input: {
    instruction: string;
    templateId: string;
    version: number;
    title: string;
  },
  secret?: string | null,
) {
  const title = input.title.replace(/[\r\n]/g, " ").slice(0, 200);
  let text = [
    "Setze diese Newsletter-Änderung in StudioONE um.",
    `Ausgabe: ${title}`,
    `Vorlage: ${input.templateId}`,
    `Gespeicherte Version: ${input.version}`,
    "Wunsch:",
    input.instruction,
    "Grenzen:",
    "- Ändere nur die genannte Vorlage.",
    "- newsletter-03 und die V3-Ausgabe bleiben unverändert.",
    "- Newsletter V4 (PR 313) nicht ändern.",
    "- Bilder, Logos und den Layoutstandard nur ändern, wenn der Wunsch das ausdrücklich für genau dieses Element verlangt.",
    "- Kein Merge, kein Deploy, keine Veröffentlichung und kein Mailversand.",
    "- Keine Secrets und keine Änderungen ausserhalb des genannten Newsletters.",
  ].join("\n");
  if (secret) text = text.split(secret).join("[entfernt]");
  return text;
}

export function createAgentBody(prompt: string, prUrl: string) {
  return {
    prompt: { text: prompt },
    repos: [{ url: NEWSLETTER_REPO_URL, prUrl }],
    workOnCurrentBranch: true as const,
    autoCreatePR: false as const,
  };
}

export function followUpBody(prompt: string) {
  return { prompt: { text: prompt } };
}

export function cursorUserMessage(status: number, code: string) {
  if (status === 401 || status === 403)
    return { message: "Cursor noch nicht verbunden.", status: 503 };
  if (status === 409 || code === "agent_busy" || code === "agent_id_conflict")
    return {
      message:
        "Cursor arbeitet noch an der letzten Änderung. Bitte warte, bis sie fertig ist.",
      status: 409,
    };
  if (status === 429)
    return { message: "Zu viele Anfragen. Bitte kurz warten.", status: 429 };
  return {
    message:
      "Die Änderung konnte nicht gestartet werden. Bitte versuche es erneut.",
    status: 502,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function runStatus(value: unknown) {
  return typeof value === "string" && RUN_STATUSES.has(value) ? value : "";
}

export function parseCreateResponse(body: unknown) {
  const record = asRecord(body);
  const agent = asRecord(record?.agent);
  const run = asRecord(record?.run);
  const agentId = agent?.id;
  const runId = run?.id;
  const status = runStatus(run?.status);
  if (
    typeof agentId !== "string" ||
    !isAgentId(agentId) ||
    typeof runId !== "string" ||
    !isRunId(runId) ||
    !status
  )
    throw new CursorApiError(502, "invalid_response");
  return {
    agentId,
    runId,
    runStatus: status,
    agentUrl: safeAgentUrl(agentId, agent?.url),
    status: statusFromRun(status, false, "create"),
  };
}

export function parseFollowUpResponse(body: unknown) {
  const run = asRecord(asRecord(body)?.run);
  const runId = run?.id;
  const status = runStatus(run?.status);
  if (typeof runId !== "string" || !isRunId(runId) || !status)
    throw new CursorApiError(502, "invalid_response");
  return { runId, runStatus: status };
}

export function parseAgentResponse(body: unknown) {
  const agent = asRecord(body);
  const latest = agent?.latestRunId;
  return {
    latestRunId: typeof latest === "string" && isRunId(latest) ? latest : "",
  };
}

export function matchingPr(body: unknown, expectedPr: string) {
  const branches = asRecord(asRecord(body)?.git)?.branches;
  if (!Array.isArray(branches) || openableCursorHref(expectedPr) !== expectedPr)
    return "";
  return branches.some((branch) => asRecord(branch)?.prUrl === expectedPr)
    ? expectedPr
    : "";
}

export function parseRunResponse(body: unknown, expectedPr: string) {
  const run = asRecord(body);
  const status = runStatus(run?.status);
  if (!status) throw new CursorApiError(502, "invalid_response");
  const prUrl = matchingPr(body, expectedPr);
  return {
    runStatus: status,
    prUrl,
    status: statusFromRun(status, Boolean(prUrl), "refresh") as CursorStatus,
  };
}

async function errorCode(response: Response) {
  try {
    const body = (await response.json()) as { code?: unknown };
    return typeof body.code === "string" && /^[a-z0-9_]{1,64}$/i.test(body.code)
      ? body.code
      : "";
  } catch {
    return "";
  }
}

export async function cursorRequest(
  apiKey: string,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  fetchImpl: typeof fetch = fetch,
) {
  if (!path.startsWith("/v1/agents"))
    throw new CursorApiError(502, "invalid_path");
  let response: Response;
  try {
    response = await fetchImpl(CURSOR_API + path, {
      method: init.method,
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`, "utf8").toString("base64")}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new CursorApiError(502, "network");
  }
  if (!response.ok)
    throw new CursorApiError(response.status, await errorCode(response));
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new CursorApiError(502, "invalid_response");
  }
}
