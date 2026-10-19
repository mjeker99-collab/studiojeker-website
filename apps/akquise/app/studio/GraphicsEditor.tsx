"use client";
import {
  graphicsPresets,
  presetGraphics,
  type Graphics,
} from "@/lib/studio/graphics";
import type { StudioSnapshot } from "@/lib/studio/input";

export default function GraphicsEditor({
  snapshot,
  assets,
  onChange,
  onAdvice,
}: {
  snapshot: StudioSnapshot;
  assets: { id: string; name: string; sha256: string }[];
  onChange: (value: Partial<StudioSnapshot>) => void;
  onAdvice: (message: string) => void;
}) {
  const g = snapshot.graphics;
  function change(key: keyof Graphics, value: string | number) {
    if (!g) return;
    const next = { ...g, [key]: value };
    for (const layer of ["headline", "logo"] as const) {
      next[`${layer}X`] = Math.min(
        next[`${layer}X`],
        100 - next[`${layer}Width`],
      );
      next[`${layer}Y`] = Math.min(
        next[`${layer}Y`],
        100 - next[`${layer}Height`],
      );
    }
    onChange({ graphics: next });
  }
  return (
    <section aria-label="Grafikstudio" className="graphics-editor">
      <h3>Grafikstudio · bearbeitbare Vorlagen</h3>
      <p>
        Wähle eine Vorlage und passe Text und Logo getrennt an. Motiv,
        Bildausschnitt und Schrift wählst du oben. Speichere deine Version und
        rendere die Vorschau zur Kontrolle.
      </p>
      <div className="studio-fields">
        {graphicsPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className="secondary"
            onClick={() => {
              if (
                g &&
                !window.confirm(
                  "Layoutpositionen durch diese Vorlage ersetzen? Texte, Bilder und Logo bleiben erhalten.",
                )
              )
                return;
              onChange({
                graphics: presetGraphics(p.id, g),
                template: p.template,
              });
            }}
          >
            {p.name}
            <span className="graphics-description">{p.description}</span>
          </button>
        ))}
      </div>
      {g && (
        <>
          <p>
            Positionen und Grössen gelten in Prozent für alle gewählten Formate.
            Prüfe jedes Format vor der Freigabe. Die Reihenfolge ist Bild,
            Textfläche, Headline, Claim, Logo.
          </p>
          <div className="studio-fields">
            <label>
              Textfläche beginnt bei (%)
              <input
                type="number"
                min={30}
                max={80}
                value={g.panelTop}
                onChange={(e) =>
                  change(
                    "panelTop",
                    Math.max(30, Math.min(80, Number(e.target.value))),
                  )
                }
              />
            </label>
            <label>
              Schriftgrösse
              <input
                type="number"
                min={24}
                max={96}
                value={g.fontSize}
                onChange={(e) =>
                  change(
                    "fontSize",
                    Math.max(
                      24,
                      Math.min(96, Math.round(Number(e.target.value))),
                    ),
                  )
                }
              />
            </label>
            <label>
              Textausrichtung
              <select
                value={g.align}
                onChange={(e) => change("align", e.target.value)}
              >
                <option value="left">Links</option>
                <option value="center">Zentriert</option>
                <option value="right">Rechts</option>
              </select>
            </label>
            <label>
              Logo für diese Grafik
              <select
                value={g.logoAssetId || ""}
                onChange={(e) => {
                  const asset = assets.find((a) => a.id === e.target.value);
                  onChange({
                    graphics: {
                      ...g,
                      logoAssetId: asset?.id || null,
                      logoSha256: asset?.sha256 || "",
                    },
                  });
                }}
              >
                <option value="">Gespeichertes Markenlogo</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            Eigene Logos als PNG mit Transparenz in die Bibliothek laden.
            Seitenverhältnis und Farben bleiben erhalten. Die Sichtbarkeit der
            Ebenen steuerst du unten.
          </p>
          {(["headline", "logo"] as const).map((layer) => (
            <fieldset key={layer}>
              <legend>
                {layer === "headline"
                  ? "Headline positionieren"
                  : "Logo positionieren"}
              </legend>
              <div className="studio-fields">
                {(["X", "Y", "Width", "Height"] as const).map((part) => {
                  const key = `${layer}${part}` as const;
                  const min =
                    part === "Width"
                      ? layer === "logo"
                        ? 5
                        : 10
                      : part === "Height"
                        ? layer === "logo"
                          ? 3
                          : 5
                        : 0;
                  const max =
                    part === "Width"
                      ? layer === "logo"
                        ? 40
                        : 100
                      : part === "Height"
                        ? layer === "logo"
                          ? 30
                          : 60
                        : 100 -
                          g[`${layer}${part === "X" ? "Width" : "Height"}`];
                  return (
                    <label key={part}>
                      {layer === "headline" ? "Headline" : "Logo"} ·{" "}
                      {
                        {
                          X: "Links",
                          Y: "Oben",
                          Width: "Breite",
                          Height: "Höhe",
                        }[part]
                      }{" "}
                      (%)
                      <input
                        type="number"
                        min={min}
                        max={max}
                        value={g[key]}
                        onChange={(e) =>
                          change(
                            key,
                            Math.max(
                              min,
                              Math.min(max, Number(e.target.value)),
                            ),
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Zum bisherigen Standardlayout zurückkehren? Eigene Layoutpositionen und die Logoauswahl dieser Grafik werden entfernt.",
                )
              )
                onChange({ graphics: undefined });
            }}
          >
            Standardlayout wiederherstellen
          </button>
        </>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          onAdvice(
            `Berate mich zur Gestaltung dieser Grafik. Schlage eine unserer Vorlagen Editorial, Statement oder Fotoposter vor und begründe Textaufteilung, Bildausschnitt und Logoposition. Stelle bei fehlendem Ziel oder Zielgruppe zuerst Rückfragen. Keine erfundenen Markenregeln. Du erhältst Layoutdaten, keine gerenderte Bildvorschau. Deine Vorschläge übernehme ich manuell im Grafikstudio. Aktueller Stand: ${JSON.stringify({ headline: snapshot.headline, imageIdea: snapshot.imageIdea, formats: snapshot.formats, template: snapshot.template, layout: g, claim: snapshot.brandProfile?.claim, colors: snapshot.brandProfile?.colors })}`,
          )
        }
      >
        Gestaltung mit KI besprechen
      </button>
      <p>
        Bereitet eine Nachricht im KI-Chat vor. Erst nach deiner Übermittlungs-
        und Kostenbestätigung wird sie gesendet. Die Beratung ändert deine
        Grafik nicht automatisch.
      </p>
    </section>
  );
}
