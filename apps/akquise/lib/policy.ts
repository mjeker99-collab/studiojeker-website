import { createHash } from "node:crypto";
import { readMailConfig } from "./config.mjs";
export class PolicyError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const normalizeEmail = (email: string) =>
  email.normalize("NFKC").trim().toLowerCase();
export const personKey = (first: string, last: string, org: string) =>
  [first, last, org]
    .map((v) => v.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
export const messageHash = (recipient: string, subject: string, body: string) =>
  createHash("sha256")
    .update(JSON.stringify([recipient, subject, body]))
    .digest("hex");
export function verifiedContact(c: {
  email: string;
  confidence: string;
  verifiedAt: Date | null;
  sourceUrl: string;
  hook: string;
  status: string;
}) {
  if (c.status === "DO_NOT_CONTACT")
    throw new PolicyError("Kontakt ist gesperrt.");
  if (
    c.confidence !== "VERIFIED" ||
    !c.verifiedAt ||
    !c.sourceUrl ||
    !c.hook.trim()
  )
    throw new PolicyError(
      "Geprüfte Adresse, Quelle, Verifikationsdatum und Anknüpfungspunkt erforderlich.",
    );
  if (
    /^(info|kontakt|contact|office|admin|hello|mail|sales|support|marketing|sekretariat|zentrale|service|team|post|buchhaltung|noreply|no-reply)([.+_-].*)?@/i.test(
      c.email,
    )
  )
    throw new PolicyError(
      "Allgemeine E-Mail-Adressen sind nicht freigabefähig.",
    );
  if (c.verifiedAt > new Date())
    throw new PolicyError("Verifikation darf nicht in der Zukunft liegen.");
}
// Enabling a variable alone never permits SMTP: configuration and mode must agree.
export function assertExternalSendingAllowed(): void {
  try {
    if (readMailConfig().smtpAllowed) return;
  } catch {}
  throw new PolicyError("Externer E-Mail-Versand ist deaktiviert.", 403);
}
export function legalAllowed(
  review: {
    allowed: boolean;
    contactRevision: number;
    procurementReviewed: boolean;
    rationale: string;
  } | null,
  revision: number,
  publicAuthority: boolean,
) {
  if (
    !review?.allowed ||
    review.contactRevision !== revision ||
    review.rationale.trim().length < 15 ||
    (publicAuthority && !review.procurementReviewed)
  )
    throw new PolicyError(
      "Separate, aktuelle rechtliche Versandprüfung fehlt.",
    );
}
