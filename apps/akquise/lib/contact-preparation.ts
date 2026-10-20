import type { Contact } from "@prisma/client";
import { importedDraft } from "./generation";
import { verificationIssues } from "./policy";

// Proposals only. Applying them requires an explicit human confirmation and
// the unchanged contact revision. Never infer consent from a public address.
export function contactPreparation(c: Contact, now = new Date()) {
  const beforeMail = c.notes.split(/^E-Mail-Entwurf:/m)[0];
  const field = (name: string) => {
    const values = beforeMail
      .split(/\r?\n/)
      .filter((line) => line.startsWith(name + ":"))
      .map((line) => line.slice(name.length + 1).trim());
    return values.length === 1 ? values[0] : "";
  };
  const patch: {
    sourceUrl?: string;
    verifiedAt?: string;
    confidence?: "VERIFIED";
    hook?: string;
  } = {};
  const origins: string[] = [];
  const source = field("Quellen-URL");
  if (!c.sourceUrl && /^https?:\/\/\S+$/.test(source)) {
    try {
      new URL(source);
      patch.sourceUrl = source;
      origins.push("Quelle aus Quellen-URL in den Notizen");
    } catch {
      /* An invalid source remains a visible gap. */
    }
  }
  const rawDate = field("Prüfdatum");
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(rawDate);
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : rawDate;
  if (!c.verifiedAt && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const date = new Date(iso + "T00:00:00.000Z");
    if (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === iso &&
      date <= now
    ) {
      patch.verifiedAt = date.toISOString();
      origins.push("Datum aus Prüfdatum in den Notizen");
    }
  }
  const status = field("Prüfstatus");
  if (
    c.confidence === "UNCONFIRMED" &&
    [
      "Persönliche Adresse und Rolle auf offizieller Website veröffentlicht",
      "Persönliche Adresse verifiziert",
    ].includes(status)
  ) {
    patch.confidence = "VERIFIED";
    origins.push(
      "Persönliche Adresse laut Prüfstatus in den Notizen verifiziert",
    );
  }
  if (!c.hook.trim()) {
    const explicit =
      field("Studiojeker-Anknüpfungspunkt") ||
      field("Dokumentierter Anknüpfungspunkt");
    if (explicit) {
      patch.hook = explicit;
      origins.push("Anknüpfungspunkt aus den Notizen");
    } else {
      try {
        const mail = importedDraft(c.notes);
        const paragraphs = mail?.body.split(/\n\s*\n/).map((p) => p.trim());
        // Only suggest the actual opening paragraph after a recognised greeting.
        // Do not manufacture a project, research fact or relationship.
        if (
          paragraphs &&
          /^(Guten Tag|Sehr geehrte|Liebe[r]?|Hallo)\b/.test(paragraphs[0]) &&
          paragraphs[1] &&
          paragraphs[1].length <= 4000 &&
          !/^(Freundliche Grüsse|Mit freundlichen|Beste Grüsse)/.test(
            paragraphs[1],
          )
        ) {
          patch.hook = paragraphs[1];
          origins.push(
            "Anknüpfungspunkt vorgeschlagen aus dem ersten Absatz des Mailentwurfs – bitte inhaltlich prüfen",
          );
        }
      } catch {
        /* Ambiguous mail blocks must be checked manually. */
      }
    }
  }
  const values = {
    sourceUrl: patch.sourceUrl ?? c.sourceUrl,
    verifiedAt: patch.verifiedAt ?? c.verifiedAt?.toISOString() ?? "",
    confidence: patch.confidence ?? c.confidence,
    hook: patch.hook ?? c.hook,
  };
  const issues = verificationIssues(
    {
      ...c,
      ...values,
      verifiedAt: values.verifiedAt ? new Date(values.verifiedAt) : null,
    },
    now,
  );
  return {
    id: c.id,
    revision: c.revision,
    organisation: c.organisation,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    values,
    patch,
    origins,
    issues,
    changed: Object.keys(patch).length > 0,
    ready: issues.length === 0,
  };
}
export type ContactPreparation = ReturnType<typeof contactPreparation>;
