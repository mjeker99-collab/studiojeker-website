import { PolicyError } from "../policy";

const CONSENT_CODES = new Set([
  "invalid_grant",
  "invalid_rapt",
  "unauthorized_client",
]);
const CONFIG_CODES = new Set(["invalid_client", "invalid_request"]);
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNABORTED",
  "ERR_NETWORK",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "ABORT_ERR",
]);

function asRecord(error: unknown) {
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : null;
}
function oauthErrorCode(error: unknown) {
  const data = asRecord(asRecord(error)?.response)?.data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as { error?: unknown };
      if (typeof parsed.error === "string") return parsed.error;
    } catch {
      if (data.includes("invalid_grant")) return "invalid_grant";
    }
  }
  const code = asRecord(data)?.error;
  return typeof code === "string" ? code : "";
}
function networkCode(error: unknown): string {
  const record = asRecord(error);
  if (!record) return "";
  if (typeof record.code === "string") return record.code;
  const nested = asRecord(record.cause)?.code;
  return typeof nested === "string" ? nested : "";
}
function httpStatus(error: unknown) {
  const status = asRecord(asRecord(error)?.response)?.status;
  return typeof status === "number" ? status : null;
}
function safeMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : "";
}

// Distinguish a grant Google will not refresh from a temporary outage.
// Never copy the remote body: it can contain request details.
export function classifyGoogleAccessError(
  error: unknown,
): "consent" | "unreachable" {
  const oauth = oauthErrorCode(error);
  if (CONSENT_CODES.has(oauth)) return "consent";
  if (CONFIG_CODES.has(oauth)) return "unreachable";
  const code = networkCode(error);
  if (TRANSIENT_CODES.has(code)) return "unreachable";
  if (CONSENT_CODES.has(code)) return "consent";
  const status = httpStatus(error);
  if (status === 408 || status === 429 || (status !== null && status >= 500))
    return "unreachable";
  if (status === 401) return "consent";
  const message = safeMessage(error);
  if (/invalid_grant|invalid_rapt|unauthorized_client/.test(message))
    return "consent";
  if (
    /timeout|timed out|network|ECONN|ENOTFOUND|fetch failed|socket hang up|aborted/i.test(
      message,
    )
  )
    return "unreachable";
  return "unreachable";
}

export function googleAccessPolicy(error: unknown) {
  if (classifyGoogleAccessError(error) === "consent")
    return {
      message: "Die Google-Verbindung muss erneuert werden.",
      status: 401,
    };
  return {
    message:
      "Google ist gerade nicht erreichbar. Bitte später erneut versuchen.",
    status: 503,
  };
}

export function needsGoogleConsent(error: unknown) {
  if (error instanceof PolicyError) {
    if (error.status === 401) return true;
    return /neu einrichten|erneuert werden/.test(error.message);
  }
  return classifyGoogleAccessError(error) === "consent";
}

// Internal sync only. Status differs so an expired grant is not logged as a
// generic outage. The body stays free of tokens, addresses and sheet data.
export function contactSyncFailure(error: unknown) {
  if (error instanceof PolicyError && error.status === 401)
    return { status: 409, reason: "google_consent_required" as const };
  if (
    error instanceof PolicyError &&
    error.status === 503 &&
    error.message.startsWith("Google ist gerade nicht erreichbar")
  )
    return { status: 503, reason: "google_unreachable" as const };
  return { status: 500, reason: "failed" as const };
}
