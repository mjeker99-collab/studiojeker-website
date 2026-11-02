"use client";
import { useState } from "react";
import { mailUrl } from "../lib/mail-content";
export default function MailContentEditor({
  count = 1,
  disabled,
  onApply,
}: {
  count?: number;
  disabled?: boolean;
  onApply: (content: string) => Promise<void>;
}) {
  const [image, setImage] = useState("");
  const [alt, setAlt] = useState("");
  const [label, setLabel] = useState("Projekt ansehen");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const clean = (s: string) =>
    s
      .replace(/[\[\]\n]/g, " ")
      .trim()
      .slice(0, 200);
  function content() {
    const target = url.trim() ? mailUrl(url) : "";
    const picture = image
      ? `![${clean(alt)}](/api/studio/assets/${image})`
      : "";
    return [
      picture && target ? `[${picture}](${target})` : picture,
      target ? `[${clean(label) || "Mehr erfahren"}](${target})` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return (
    <details className="panel-note">
      <summary>Bilder & Links hinzufügen</summary>
      <p>
        Einmal ergänzen und für{" "}
        {count === 1 ? "diese Mail" : `alle ${count} ausgewählten Mails`}{" "}
        übernehmen. Die persönliche Nachricht bleibt erhalten.
      </p>
      <fieldset disabled={busy || disabled} style={{ minWidth: 0 }}>
        <label>
          Bild hochladen (JPG, PNG oder WebP, bis 8 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              setNotice("");
              try {
                if (file.size > 8 * 1024 * 1024)
                  throw new Error("Bitte ein Bild bis 8 MB wählen.");
                const response = await fetch("/api/mail-images", {
                  method: "POST",
                  headers: { "Content-Type": file.type },
                  body: file,
                });
                const data = await response.json();
                if (!response.ok)
                  throw new Error(
                    data.error || "Bild konnte nicht hochgeladen werden.",
                  );
                setImage(data.id);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Upload fehlgeschlagen.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {image && (
          <>
            <label>
              Bildbeschreibung
              <input
                maxLength={200}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Zum Beispiel: Architekturaufnahme unseres Projekts"
              />
            </label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/studio/assets/${image}`}
              alt={alt || "Hochgeladenes Mailbild"}
              style={{ maxWidth: "100%", width: 260, height: "auto" }}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => setImage("")}
            >
              Bild entfernen
            </button>
          </>
        )}
        <label>
          Link (verlinkt auch das Bild)
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://studiojeker.ch/work"
          />
        </label>
        {url && (
          <label>
            Linktext
            <input
              maxLength={200}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
        )}
        <button
          type="button"
          className="secondary"
          disabled={!count || (!image && !url.trim())}
          onClick={async () => {
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const addition = content();
              await onApply(addition);
              setImage("");
              setUrl("");
              setNotice(
                "Bilder und Links übernommen. Bitte die aktualisierte Mailvorschau ansehen.",
              );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Übernehmen fehlgeschlagen.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Wird übernommen …"
            : count === 1
              ? "In Mail einfügen"
              : `In ${count} Mails übernehmen`}
        </button>
      </fieldset>
      {busy && <p role="status">Bild oder Ergänzung wird gespeichert …</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p>
        Die Ergänzung erscheint vor der Grussformel. Bilder werden automatisch
        verkleinert.
      </p>
    </details>
  );
}
