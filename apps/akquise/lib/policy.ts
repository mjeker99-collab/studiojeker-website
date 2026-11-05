import { acquisitionAddressIssue } from "./mail-address";
import { createHash } from "node:crypto";
import { readMailConfig } from "./config.mjs";
import { signedMessage, signatureAssets } from "./mail-signature";
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
    .update(
      JSON.stringify([
        recipient,
        subject,
        body,
        signedMessage(body),
        signatureAssets,
      ]),
    )
    .digest("hex");
export function verificationIssues(
  c: {
    email: string;
    confidence: string;
    verifiedAt: Date | null;
    sourceUrl: string;
    hook: string;
    status: string;
    replyOutcome?: string;
    archivedAt?: Date | string | null;
  },
  now = new Date(),
) {
  const issues: string[] = [];
  if (c.archivedAt) issues.push("Kontakt ist archiviert.");
  if (c.replyOutcome)
    issues.push("Antwort erfasst. Keine weitere automatische Akquise.");
  if (c.status === "DO_NOT_CONTACT") issues.push("Kontakt ist gesperrt.");
  const addressIssue = acquisitionAddressIssue(c.email);
  if (addressIssue) issues.push(addressIssue);
  if (c.confidence !== "VERIFIED")
    issues.push("E-Mail-Adresse noch nicht als verifiziert bestätigt.");
  if (!c.verifiedAt) issues.push("Verifikationsdatum fehlt.");
  if (!c.sourceUrl) issues.push("Quellen-URL fehlt.");
  if (!c.hook.trim()) issues.push("Dokumentierter Anknüpfungspunkt fehlt.");
  if (
    c.verifiedAt &&
    (Number.isNaN(c.verifiedAt.getTime()) || c.verifiedAt > now)
  )
    issues.push(
      "Verifikation darf nicht ungültig sein oder in der Zukunft liegen.",
    );
  return issues;
}
export function verifiedContact(c: Parameters<typeof verificationIssues>[0]) {
  const issues = verificationIssues(c);
  if (issues.length) throw new PolicyError(issues.join(" "));
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
