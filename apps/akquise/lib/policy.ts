import { createHash } from "node:crypto";
import { readMailConfig } from "./config.mjs";
import { isTeamMailbox, normalizeEmail, personKey } from "./contact-identity";
import { signedMessage, signatureAssets } from "./mail-signature";
export { normalizeEmail, personKey };
export class PolicyError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
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
  },
  now = new Date(),
) {
  const issues: string[] = [];
  if (c.replyOutcome)
    issues.push("Antwort erfasst. Keine weitere automatische Akquise.");
  if (c.status === "DO_NOT_CONTACT") issues.push("Kontakt ist gesperrt.");
  const team = isTeamMailbox(c.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
    issues.push("Gültige E-Mail-Adresse fehlt.");
  if (c.confidence !== "VERIFIED")
    issues.push(
      team
        ? "Team-Postfach noch nicht als Unternehmensadresse bestätigt."
        : "Persönliche Adresse noch nicht als verifiziert bestätigt.",
    );
  if (!c.verifiedAt) issues.push("Verifikationsdatum fehlt.");
  if (!c.sourceUrl) issues.push("Quellen-URL fehlt.");
  if (!c.hook.trim()) issues.push("Dokumentierter Anknüpfungspunkt fehlt.");
  if (
    !team &&
    /^(info|kontakt|contact|office|admin|hello|mail|sales|support|sekretariat|zentrale|service|team|post|buchhaltung|noreply|no-reply)([.+_-].*)?@/i.test(
      c.email,
    )
  )
    issues.push("Allgemeine E-Mail-Adressen sind nicht freigabefähig.");
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
