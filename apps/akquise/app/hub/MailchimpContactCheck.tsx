"use client";
import { Fragment, useState } from "react";
import {
  mailchimpCheckSummary,
  type MailchimpContactReport,
} from "@/lib/hub/mailchimp-report";

const counts: { key: keyof MailchimpContactReport["counts"]; label: string }[] = [
  { key: "subscribed", label: "Abonniert" },
  { key: "existing", label: "Bereits in StudioONE" },
  { key: "newContacts", label: "Noch nicht übernommen" },
  { key: "unsubscribed", label: "Abgemeldet" },
  { key: "cleaned", label: "Bereinigt" },
  { key: "pending", label: "Ausstehend" },
  { key: "excluded", label: "Ausgeschlossen" },
  { key: "duplicates", label: "Dubletten" },
  { key: "errors", label: "Fehlerhafte Einträge" },
];

export default function MailchimpContactCheck() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<MailchimpContactReport | null>(null);
  const [error, setError] = useState("");

  async function check() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hub/mailchimp/contacts", { cache: "no-store" });
      const body = (await response.json()) as Partial<MailchimpContactReport> & { error?: string };
      if (!response.ok || !body.counts || typeof body.configured !== "boolean")
        throw new Error(body.error || "Die Prüfung konnte nicht abgeschlossen werden.");
      setReport(body as MailchimpContactReport);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Die Prüfung konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  }

  const showCounts = report?.errorClass === "none" || report?.errorClass === "incomplete";
  return (
    <section className="panel padded" aria-labelledby="mailchimp-check-title">
      <h2 id="mailchimp-check-title">Mailchimp-Kontakte</h2>
      <p>
        Prüft, welche Kontakte in Mailchimp schon in StudioONE vorhanden sind.
        Es wird nichts übernommen und nichts versendet.
      </p>
      <button type="button" onClick={check} disabled={busy}>
        {busy ? "Mailchimp-Kontakte werden geprüft …" : "Mailchimp-Kontakte prüfen"}
      </button>
      <div aria-live="polite">
        {error && <p role="alert">{error}</p>}
        {report && (
          <>
            <p>{mailchimpCheckSummary(report)}</p>
            {showCounts && (
              <dl>
                <dt>Audiences</dt>
                <dd>{report.audienceCount ?? 0}</dd>
                {counts.map((item) => (
                  <Fragment key={item.key}>
                    <dt>{item.label}</dt>
                    <dd>{report.counts[item.key]}</dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </>
        )}
      </div>
    </section>
  );
}
