/**
 * Redacts secrets and personal data before ChatGPT connector responses.
 * Never emit contacts, credentials, SMTP, OAuth tokens, or acquisition drafts.
 */

const SECRET_KEY =
  /^(password|passwd|pwd|secret|token|api[_-]?key|authorization|smtp|imap|private[_-]?key|encrypted|credential|bearer|cookie|session)$/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redactEmails(value: string): string {
  return value.replace(EMAIL_RE, "[redacted-email]");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Deep-clone editorial JSON while dropping secret-looking keys and redacting emails. */
export function sanitizeEditorialPayload(value: unknown, depth = 0): unknown {
  if (depth > 12) return null;
  if (value == null) return value;
  if (typeof value === "string") return redactEmails(value).slice(0, 50000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value))
    return value.slice(0, 200).map((v) => sanitizeEditorialPayload(v, depth + 1));
  if (!isPlainObject(value)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    // Acquisition / CRM fields that must never leave StudioONE via the connector.
    if (
      /^(recipient|contactEmail|contactName|passwordHash|encryptedToken|smtp|imap)/i.test(
        key,
      )
    )
      continue;
    out[key] = sanitizeEditorialPayload(child, depth + 1);
  }
  return out;
}

export function searchableText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.map(searchableText).join("\n");
  if (!isPlainObject(value)) return "";
  return Object.entries(value)
    .filter(([k]) => !SECRET_KEY.test(k))
    .map(([, v]) => searchableText(v))
    .join("\n");
}
