"use client";
import { useEffect, useState } from "react";
import type { cmsState } from "@/lib/cms/service";

type State = Awaited<ReturnType<typeof cmsState>>;
const studio = "https://studiojeker.sanity.studio/structure";
export default function Cms({
  openNewsletters,
  onImported,
  compact = false,
}: {
  openNewsletters?: () => void;
  onImported?: () => Promise<void>;
  compact?: boolean;
}) {
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cms/state", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cms/state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  async function importDocument(document: State["documents"][number]) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/cms/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: document._id, revision: document._rev }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.imported && onImported) await onImported();
      setNotice(
        result.imported
          ? "Als neuer Entwurf übernommen. Unter Newsletter öffnen, prüfen und freigeben."
          : "Diese Sanity-Version wurde bereits übernommen. Du findest sie unter Newsletter.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel cms-panel" aria-label="Sanity-Verwaltung">
      <h2>{compact ? "Newsletter aus Sanity" : "Website & CMS"}</h2>
      <p>
        {compact
          ? "Vorlagen in Sanity bearbeiten und bereitgestellte Ausgaben als Entwurf übernehmen."
          : "Website und Newsletter mit euren bestehenden Sanity-Inhalten verwalten."}
      </p>
      <div className="actions">
        {!compact && (
          <>
            <a href={studio} target="_blank" rel="noopener noreferrer">
              Website in Sanity bearbeiten ↗
            </a>
            <a
              href="https://studiojeker.ch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Website ansehen ↗
            </a>
          </>
        )}
        <a
          href={studio + "/newsletter"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Newsletter in Sanity bearbeiten ↗
        </a>
      </div>
      {!compact && (
        <p className="muted">
          Sanity verwendet eure persönliche Sanity-Anmeldung. Website-Änderungen
          werden über den bestehenden Website-Deploymentweg sichtbar.
        </p>
      )}
      <h3>In Sanity bereitgestellte Newsletter</h3>
      <p>
        In Sanity mit «Publish» bereitstellen. Danach hier übernehmen, unter
        Newsletter prüfen und freigeben. Der Versand erfolgt in Mailchimp.
      </p>
      <div className="actions">
        <button className="secondary" disabled={busy} onClick={refresh}>
          Sanity-Liste aktualisieren
        </button>
        {openNewsletters && (
          <button className="secondary" onClick={openNewsletters}>
            StudioONE-Newsletter öffnen
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Sanity-Inhalte werden geladen …</p>}
      {data?.documents.length === 0 && (
        <p>
          Noch keine bereitgestellten Newsletter gefunden. In Sanity unter
          «Newsletter» eine Vorlage wählen, die Ausgabe bearbeiten und mit
          «Publish» bereitstellen. Fehlt der Menüpunkt, muss das aktualisierte
          Sanity Studio bereitgestellt werden.
        </p>
      )}
      {data?.documents.map((document) => (
        <article className="cms-document" key={document._id}>
          <h4>{document.title || "Ohne Titel"}</h4>
          <p>{document.subject || "Betreff fehlt"}</p>
          <p className="muted">
            Stand:{" "}
            {new Date(document._updatedAt).toLocaleString("de-CH", {
              timeZone: "Europe/Zurich",
            })}
          </p>
          <button disabled={busy} onClick={() => importDocument(document)}>
            Als neuen Entwurf übernehmen
          </button>
        </article>
      ))}
      {(data?.documents.length || 0) >= 100 && (
        <p>Die 100 zuletzt geänderten Ausgaben werden angezeigt.</p>
      )}
    </section>
  );
}
