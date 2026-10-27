import type { Contact } from "@prisma/client";
import { importedDraft } from "./generation";
import { normalizeSourceUrl, sourceUrlIssue } from "./contact-source-url";
import { verificationIssues } from "./policy";

export type PreparationFields = Partial<{
  email: string;
  sourceUrl: string;
  verifiedAt: string;
  confidence: Contact["confidence"];
  hook: string;
}>;

// Proposals only. Applying them requires an explicit human confirmation and
// the unchanged contact revision. Never infer consent from a public address.
export function contactPreparation(
  c: Contact,
  now = new Date(),
  input: { shared?: PreparationFields; values?: PreparationFields } = {},
) {
  const normal = (value: string) =>
    value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  // Read labelled metadata only, never infer evidence from the marketing prose.
  const beforeMail = c.notes.split(/^\s*E-Mail-Entwurf\s*:/im)[0];
  const field = (...names: string[]) => {
    const keys = names.map(normal);
    const values = [
      ...new Set(
        beforeMail.split(/\r?\n/).flatMap((line) => {
          const colon = line.indexOf(":");
          return colon >= 0 && keys.includes(normal(line.slice(0, colon)))
            ? [line.slice(colon + 1).trim()].filter(Boolean)
            : [];
        }),
      ),
    ];
    return values.length === 1 ? values[0] : "";
  };
  const patch: PreparationFields = {};
  const origins: string[] = [];
  const notedEmail = field(
    "Direkte E-Mail",
    "E-Mail",
    "E-Mail-Adresse",
    "Geschäftliche E-Mail-Adresse",
  )
    .replace(/^mailto:/i, "")
    .trim()
    .toLowerCase();
  if (!c.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notedEmail)) {
    patch.email = notedEmail;
    origins.push("E-Mail-Adresse aus eindeutig beschrifteten Rechercheangaben");
  }
  const source = normalizeSourceUrl(
    field("Quellen-URL", "Quellen URL", "Quellenadresse", "Quelle"),
  );
  if (!c.sourceUrl && source && !sourceUrlIssue(source)) {
    try {
      new URL(source);
      patch.sourceUrl = source;
      origins.push("Quelle aus Quellen-URL in den Notizen");
    } catch {
      /* An invalid source remains a visible gap. */
    }
  }
  const rawDate = field(
    "Prüfdatum",
    "Verifikationsdatum",
    "Letzte Verifikation",
  );
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
  const status = normal(
    field("Prüfstatus", "Vertrauensstatus", "Verifikationsstatus"),
  );
  const negative =
    /nicht|unbestätigt|unverifiziert|ungeprüft|geschätzt|vermut|unklar|ausstehend|keine|allgemein|funktionsadresse|unconfirmed|estimated/.test(
      status,
    );
  const confirmed =
    /^(?:verified|verifiziert|bestätigt)[.!]?$/.test(status) ||
    /(?:persönliche|direkte|personengebundene).*?(?:verifiziert|bestätigt|auf (?:der )?offiziellen? (?:website|webseite) veröffentlicht)/.test(
      status,
    ) ||
    /persönliche adresse und rolle auf offizieller website veröffentlicht/.test(
      status,
    );
  if (c.confidence === "UNCONFIRMED" && !negative && confirmed) {
    patch.confidence = "VERIFIED";
    origins.push("Explizite Verifikation aus dem dokumentierten Prüfstatus");
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
  const original = {
    sourceUrl: c.sourceUrl,
    verifiedAt: c.verifiedAt?.toISOString() ?? "",
    confidence: c.confidence,
    hook: c.hook,
  };
  const values = {
    sourceUrl: patch.sourceUrl ?? c.sourceUrl,
    verifiedAt: patch.verifiedAt ?? c.verifiedAt?.toISOString() ?? "",
    confidence: patch.confidence ?? c.confidence,
    hook: patch.hook ?? c.hook,
  };
  // Shared entries fill gaps after note extraction. Only explicit row edits
  // may replace existing values. A preview never writes or grants permission.
  for (const key of ["sourceUrl", "verifiedAt", "hook"] as const) {
    if (!values[key].trim() && input.shared?.[key]) {
      values[key] = input.shared[key];
      origins.push(
        `${key === "sourceUrl" ? "Quelle" : key === "verifiedAt" ? "Prüfdatum" : "Anknüpfungspunkt"} aus gemeinsamer Angabe`,
      );
    }
    if (input.values?.[key] !== undefined) {
      values[key] = input.values[key];
      origins.push(
        `${key === "sourceUrl" ? "Quelle" : key === "verifiedAt" ? "Prüfdatum" : "Anknüpfungspunkt"} in Sammelansicht bearbeitet`,
      );
    }
    if (values[key] !== original[key]) patch[key] = values[key];
    else delete patch[key];
  }
  if (values.confidence === "UNCONFIRMED" && input.shared?.confidence) {
    values.confidence = input.shared.confidence;
    origins.push("Prüfstatus aus gemeinsamer Angabe");
  }
  if (input.values?.confidence !== undefined) {
    values.confidence = input.values.confidence;
    origins.push("Prüfstatus in Sammelansicht bearbeitet");
  }
  if (values.confidence !== original.confidence)
    patch.confidence = values.confidence;
  else delete patch.confidence;
  const issues = verificationIssues(
    {
      ...c,
      ...values,
      email: patch.email ?? c.email,
      verifiedAt: values.verifiedAt ? new Date(values.verifiedAt) : null,
    },
    now,
  );
  return {
    id: c.id,
    revision: c.revision,
    organisation: c.organisation,
    name: `${c.firstName} ${c.lastName}`,
    email: patch.email ?? c.email,
    values,
    patch,
    origins,
    issues,
    changed: Object.keys(patch).length > 0,
    ready: issues.length === 0,
  };
}
export type ContactPreparation = ReturnType<typeof contactPreparation>;
