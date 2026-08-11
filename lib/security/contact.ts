export const CONTACT_FIELD_LIMITS = {
  name: 120,
  company: 160,
  email: 254,
  phone: 40,
  message: 4000,
  turnstileToken: 2048,
  /** Honeypot must stay empty. */
  website: 0,
} as const;

export type ContactPayload = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  message: string;
  /** Cloudflare Turnstile token — optional until Turnstile is enabled. */
  turnstileToken?: string;
  /** Honeypot; must be empty. */
  website?: string;
  locale?: "de" | "en";
};

export type ContactValidationResult =
  | { ok: true; data: Required<Pick<ContactPayload, "name" | "email" | "message">> & ContactPayload }
  | { ok: false; code: "invalid" | "honeypot" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Strip CR/LF and other control chars that enable header injection
 * if values are later used in outbound email headers.
 */
export function sanitizeHeaderSafe(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function isValidEmail(value: string): boolean {
  if (value.length > CONTACT_FIELD_LIMITS.email) return false;
  // Practical RFC-ish check — not a full RFC parser.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateContactPayload(input: unknown): ContactValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid" };
  }

  const raw = input as Record<string, unknown>;
  const website = asString(raw.website);
  if (website.length > 0) {
    return { ok: false, code: "honeypot" };
  }

  const name = sanitizeHeaderSafe(collapseWhitespace(asString(raw.name)));
  const company = sanitizeHeaderSafe(collapseWhitespace(asString(raw.company)));
  const email = sanitizeHeaderSafe(collapseWhitespace(asString(raw.email))).toLowerCase();
  const phone = sanitizeHeaderSafe(collapseWhitespace(asString(raw.phone)));
  const message = sanitizeHeaderSafe(asString(raw.message).trim());
  const turnstileToken = sanitizeHeaderSafe(asString(raw.turnstileToken));
  const localeRaw = asString(raw.locale);
  const locale = localeRaw === "en" || localeRaw === "de" ? localeRaw : undefined;

  if (
    !name ||
    name.length > CONTACT_FIELD_LIMITS.name ||
    !email ||
    !isValidEmail(email) ||
    !message ||
    message.length > CONTACT_FIELD_LIMITS.message ||
    company.length > CONTACT_FIELD_LIMITS.company ||
    phone.length > CONTACT_FIELD_LIMITS.phone ||
    turnstileToken.length > CONTACT_FIELD_LIMITS.turnstileToken
  ) {
    return { ok: false, code: "invalid" };
  }

  return {
    ok: true,
    data: {
      name,
      company: company || undefined,
      email,
      phone: phone || undefined,
      message,
      turnstileToken: turnstileToken || undefined,
      website: "",
      locale,
    },
  };
}
