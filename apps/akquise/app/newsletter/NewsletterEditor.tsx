"use client";
import { useEffect, useRef, useState } from "react";
import {
  getNewsletterTemplate,
  renderNewsletter,
  previewDocument,
  type NewsletterSnapshot,
} from "@/lib/hub/newsletter-template";

export function NewsletterFields({
  value,
  change,
}: {
  value: NewsletterSnapshot;
  change: (value: NewsletterSnapshot) => void;
}) {
  const template = getNewsletterTemplate(value.templateId);
  const fields = template.slots.filter((s) => !s.special);
  const groups = [...new Set(fields.map((s) => s.region))];
  const names: Record<string, string> = {
    text: "Text",
    image: "Bild-URL",
    alt: "Bild-/Linkbeschreibung",
    link: "Ziel-Link",
  };
  return (
    <section className="newsletter-fields" aria-label="Newsletter-Bausteine">
      <h3>{template.name}</h3>
      <p>
        Texte, Bilder und Links bearbeiten. Logo, Gestaltung und Fusszeile
        bleiben geschützt. Bilder benötigen eine dauerhaft öffentliche
        HTTPS-Adresse.
      </p>
      {template.note && <p className="legal">{template.note}</p>}
      {groups.map((group, index) => (
        <details key={group} open={index === 0}>
          <summary>{group}</summary>
          {fields
            .filter((s) => s.region === group)
            .map((slot, i) => (
              <label key={slot.key}>
                {group} · {names[slot.kind]} {i + 1}
                {slot.kind === "text" ? (
                  <textarea
                    rows={slot.value.length > 100 ? 4 : 2}
                    maxLength={8000}
                    value={value.fields[slot.key]}
                    onChange={(e) =>
                      change({
                        ...value,
                        fields: { ...value.fields, [slot.key]: e.target.value },
                      })
                    }
                  />
                ) : (
                  <input
                    type={
                      slot.kind === "image" || slot.kind === "link"
                        ? "url"
                        : "text"
                    }
                    required={slot.kind === "image" || slot.kind === "link"}
                    maxLength={slot.kind === "alt" ? 500 : 2000}
                    value={value.fields[slot.key]}
                    onChange={(e) =>
                      change({
                        ...value,
                        fields: { ...value.fields, [slot.key]: e.target.value },
                      })
                    }
                  />
                )}
              </label>
            ))}
        </details>
      ))}
    </section>
  );
}
export function NewsletterPreview({
  subject,
  preheader,
  newsletter,
  html: originalHtml,
}: {
  subject?: string;
  preheader?: string;
  newsletter?: NewsletterSnapshot;
  html?: string;
}) {
  const [width, setWidth] = useState(700);
  const viewport = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const scale = availableWidth > 0 ? Math.min(1, availableWidth / width) : 0;
  let html = originalHtml || "",
    error = "";
  if (newsletter) {
    try {
      html = renderNewsletter({
        subject: subject || "",
        preheader: preheader || "",
        newsletter,
      });
    } catch {
      error =
        "Bitte die markierten Inhalte prüfen: Alle Bild- und Ziel-Links benötigen vollständige HTTPS-Adressen.";
    }
  }
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [error]);
  return (
    <section
      className="newsletter-preview"
      aria-label="Newsletter-Layoutvorschau"
    >
      <div className="actions" role="group" aria-label="Vorschaubreite">
        {[700, 390, 320].map((w) => (
          <button
            key={w}
            type="button"
            className="secondary"
            aria-pressed={width === w}
            onClick={() => setWidth(w)}
          >
            {w === 700 ? "Desktop" : w === 390 ? "Mobil" : "Mobil klein"} · {w}{" "}
            px
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <div className="newsletter-frame-viewport" ref={viewport}>
          <div
            style={{
              width: width * scale,
              height: 900 * scale,
              margin: "0 auto",
            }}
          >
            <iframe
              title="Newsletter HTML-Vorschau"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={previewDocument(html)}
              style={{
                width,
                maxWidth: "none",
                height: 900,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>
      )}
      <p className="muted">
        Links sind in der Vorschau inaktiv. Auf schmalen Bildschirmen wird die
        gewählte Vorschaubreite verkleinert dargestellt. Mailchimp-Platzhalter
        werden beim Versand aufgelöst.
      </p>
    </section>
  );
}
