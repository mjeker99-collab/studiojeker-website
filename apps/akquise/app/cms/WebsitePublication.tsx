"use client";
import { useState } from "react";
type Publication = {
  slug: string;
  version: number;
  revision: number;
  active: boolean;
} | null;
export default function WebsitePublication({
  publication,
  version,
  disabled,
  mutate,
}: {
  publication: Publication;
  version: number;
  disabled: boolean;
  mutate: (action: string, body: unknown) => Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <section className="website-export" aria-label="Veröffentlichung">
      <h3>Website veröffentlichen</h3>
      <p>
        {publication?.active
          ? `Live: Version ${publication.version}. Neue Änderungen bleiben bis zur nächsten Veröffentlichung im Entwurf.`
          : "Deine gespeicherte Website unter einer öffentlichen StudioONE-Adresse bereitstellen."}
      </p>
      {publication?.active && (
        <p>
          <a
            href={`/sites/${publication.slug}/index.html`}
            target="_blank"
            rel="noreferrer"
          >
            Veröffentlichte Website öffnen ↗
          </a>
        </p>
      )}
      <fieldset disabled={disabled} className="website-fields">
        <label>
          Webadresse
          <input
            value={publication?.slug || slug}
            disabled={!!publication}
            placeholder="meine-website"
            maxLength={61}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
        </label>
        <p className="muted">
          /sites/{publication?.slug || slug || "meine-website"}/index.html · Die
          Adresse bleibt bei Aktualisierungen gleich.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Inhalte und ausgewählte Bilder dürfen öffentlich sichtbar sein.
          Nutzungsrechte und rechtliche Angaben sind geprüft.
        </label>
        <div className="actions">
          <button
            type="button"
            disabled={
              !confirmed ||
              !/^[a-z][a-z0-9-]{2,60}$/.test(publication?.slug || slug)
            }
            onClick={async () => {
              await mutate("publish", {
                version,
                revision: publication?.revision || 0,
                slug: publication?.slug || slug,
                confirmedPublic: true,
              });
              setConfirmed(false);
            }}
          >
            {publication?.active
              ? "Live-Seite aktualisieren"
              : "Jetzt veröffentlichen"}
          </button>
          {publication?.active && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                mutate("unpublish", { version, revision: publication.revision })
              }
            >
              Veröffentlichung zurückziehen
            </button>
          )}
        </div>
      </fieldset>
      {disabled && (
        <p className="muted">
          Vor der Veröffentlichung Änderungen speichern und laufende Aktionen
          abschliessen.
        </p>
      )}
    </section>
  );
}
