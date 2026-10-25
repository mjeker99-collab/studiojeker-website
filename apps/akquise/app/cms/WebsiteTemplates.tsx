"use client";
import { useState } from "react";
import {
  websiteTemplates,
  createWebsiteFromTemplate,
} from "@/lib/websites/templates";
import { websiteHtml } from "@/lib/websites/render";
export default function WebsiteTemplates({
  disabled,
  choose,
}: {
  disabled: boolean;
  choose: (id: string) => void;
}) {
  const [preview, setPreview] = useState(websiteTemplates[0].id);
  const selected = websiteTemplates.find((t) => t.id === preview)!;
  return (
    <section aria-label="Grundtemplates" className="website-templates">
      <h3>Mit einer Grundvorlage starten</h3>
      <p>
        1. Vorlage auswählen · 2. Kunde und Ziel angeben · 3. Mit GPT
        personalisieren
      </p>
      <div className="website-template-grid">
        {websiteTemplates.map((t, index) => (
          <button
            type="button"
            className="secondary website-template-card"
            key={t.id}
            disabled={disabled}
            aria-pressed={preview === t.id}
            onClick={() => setPreview(t.id)}
          >
            <svg viewBox="0 0 240 130" aria-hidden="true">
              <rect width="240" height="130" rx="8" fill="#f1f5f5" />
              <rect x="15" y="14" width="50" height="5" fill="#151719" />
              <path d="M150 16h70" stroke="#7e8587" strokeWidth="3" />
              <rect
                x={t.style === "CAMPAIGN" ? 65 : 15}
                y="36"
                width="92"
                height="10"
                fill="#151719"
              />
              <rect
                x={t.style === "CAMPAIGN" ? 65 : 15}
                y="53"
                width="75"
                height="4"
                fill="#7e8587"
              />
              <rect
                x="15"
                y="76"
                width={t.style === "PORTFOLIO" ? 136 : 64}
                height="38"
                fill="#00cbdc"
              />
              <rect
                x={t.style === "PORTFOLIO" ? 166 : 95}
                y="76"
                width={t.style === "PORTFOLIO" ? 59 : 130}
                height="38"
                fill="#dce4e5"
              />
              <text x="204" y="57" fill="#151719" fontSize="16">
                0{index + 1}
              </text>
            </svg>
            <strong>{t.name}</strong>
            <span>{t.description}</span>
            <small>{t.pages.map((p) => p.title).join(" · ")}</small>
          </button>
        ))}
      </div>
      <details>
        <summary>Vorschau: {selected.name}</summary>
        <iframe
          title="Grundtemplate-Vorschau"
          sandbox=""
          srcDoc={websiteHtml(createWebsiteFromTemplate(preview))}
        />
      </details>
      <button type="button" disabled={disabled} onClick={() => choose(preview)}>
        Mit «{selected.name}» starten
      </button>
      <p className="muted">
        Texte und Bildplätze sind editierbare Platzhalter. Die Auswahl erstellt
        einen Entwurf; sie veröffentlicht nichts.
      </p>
    </section>
  );
}
