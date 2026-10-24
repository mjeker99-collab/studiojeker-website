"use client";

import { useMemo, useState } from "react";
import { getNewsletterTemplate, type NewsletterSnapshot } from "@/lib/hub/newsletter-template";

type Props = {
  subject: string;
  preheader: string;
  newsletter: NewsletterSnapshot;
};

export default function NewsletterPreflight({ subject, preheader, newsletter }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const checks = useMemo(() => {
    const template = getNewsletterTemplate(newsletter.templateId);
    const required = template.slots.filter((slot) => !slot.special);
    const results: { label: string; ok: boolean; detail?: string }[] = [
      { label: "Betreff vorhanden", ok: !!subject.trim() && subject.length <= 150 },
      { label: "Preheader vorhanden", ok: !!preheader.trim() && preheader.length <= 250 },
      {
        label: "Alle editierbaren Felder ausgefüllt",
        ok: required.every((slot) => !!newsletter.fields[slot.key]?.trim()),
      },
    ];
    const urls = required.filter((slot) => slot.kind === "image" || slot.kind === "link");
    const invalid = urls.filter((slot) => {
      try {
        const url = new URL(newsletter.fields[slot.key] || "");
        return url.protocol !== "https:" || !!url.username || !!url.password;
      } catch {
        return true;
      }
    });
    results.push({
      label: "Bild- und Zieladressen syntaktisch gültig (HTTPS)",
      ok: invalid.length === 0,
      detail: invalid.length ? invalid.map((slot) => slot.key).join(", ") : undefined,
    });
    const text = required.filter((slot) => slot.kind === "text").map((slot) => newsletter.fields[slot.key] || "").join(" ");
    results.push({
      label: "Keine offensichtlichen Platzhalter in Texten",
      ok: !/(\[\s*(?:platzhalter|todo|link einsetzen|bild einsetzen)\s*\]|\bLorem ipsum\b)/i.test(text),
    });
    return results;
  }, [newsletter, subject, preheader]);
  const passed = checks.every((check) => check.ok);
  return (
    <section className="panel padded" aria-label="Newsletter-Versandcheck">
      <h3>Newsletter-Check vor Mailchimp</h3>
      <p>Die automatische Kontrolle prüft die Vollständigkeit und URL-Syntax. Sie ersetzt weder die manuelle Linkprüfung noch die Mailchimp-Testmail.</p>
      <ul>
        {checks.map((check) => (
          <li key={check.label}>
            <strong>{check.ok ? "✓" : "✕"} {check.label}</strong>
            {check.detail && <span> – prüfen: {check.detail}</span>}
          </li>
        ))}
      </ul>
      <label>
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        Ich werde vor dem Versand Empfängerliste, Einwilligungen, Absender, Links, Mobile-Vorschau und Testmail in Mailchimp kontrollieren.
      </label>
      <p role="status">
        {passed && confirmed
          ? "Redaktioneller Vorabcheck abgeschlossen. Weiterhin separate Freigabe und Testversand in Mailchimp nötig."
          : "Noch nicht versandbereit: Fehlende Angaben korrigieren und manuelle Prüfung bestätigen."}
      </p>
    </section>
  );
}
