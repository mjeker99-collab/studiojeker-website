"use client";
import { useEffect, useState } from "react";
import type { ContactPreparation as Proposal } from "../lib/contact-preparation";
import ContactPreparation from "./ContactPreparation";

type Result = { id: string; ok: boolean; message: string; draftId?: string };
async function request(action: string, body: unknown) {
  const response = await fetch(`/api/contacts/preparation/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Vorbereitung fehlgeschlagen.");
  return data;
}
export default function ContactMailFlow({
  ids,
  contacts,
  refresh,
  onReady,
  back,
}: {
  ids: string[];
  contacts: {
    id: string;
    organisation: string;
    firstName: string;
    lastName: string;
  }[];
  refresh: () => Promise<void>;
  onReady: (ids: string[]) => void;
  back: () => void;
}) {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorRows, setEditorRows] = useState<Proposal[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoading(true);
        setError("");
        setConfirmed(false);
        return request("preview", { ids });
      })
      .then((data) => {
        if (active && data) setRows(data.contacts);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ids, retry]);
  const ready = rows.filter((r) => r.ready);
  const gaps = rows.filter((r) => !r.ready);
  const changes = ready.filter((r) => r.changed);
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const data = await request("prepare", {
        confirmed: true,
        contacts: ready.map((r) => ({ id: r.id, revision: r.revision })),
      });
      setResults(data.results);
      await refresh();
      if (data.results.every((r: Result) => r.ok))
        onReady(data.results.map((r: Result) => r.draftId!).filter(Boolean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorbereitung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel"
      aria-label="Ausgewählte Mails vorbereiten"
      aria-busy={loading || busy}
    >
      <h2>{ids.length} Mails vorbereiten</h2>
      <button className="secondary" disabled={busy || editing} onClick={back}>
        Zurück zur Auswahl
      </button>
      {loading ? (
        <p role="status">
          Vorhandene Kontaktdaten und persönliche Mailtexte werden ausgewertet …
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="error">
              {error}{" "}
              <button onClick={() => setRetry((v) => v + 1)}>
                Erneut prüfen
              </button>
            </p>
          )}
          {!error && (
            <>
              <p role="status">
                <strong>
                  {ready.length} Kontakte bereit · {gaps.length} Kontakte
                  benötigen Angaben
                </strong>
              </p>
              <p>
                Vorhandene aktuelle Entwürfe werden weiterverwendet. Es werden
                noch keine Mails versandt.
              </p>
              {changes.length > 0 && !editing && (
                <>
                  <details>
                    <summary>
                      Vorhandene Angaben für {changes.length} Kontakte
                      übernehmen
                    </summary>
                    {changes.map((r) => (
                      <article key={r.id}>
                        <h3>
                          {r.organisation} · {r.name}
                        </h3>
                        <dl>
                          {r.patch.confidence && (
                            <>
                              <dt>Prüfstatus</dt>
                              <dd>
                                {r.patch.confidence === "VERIFIED"
                                  ? "Persönliche Adresse verifiziert"
                                  : r.patch.confidence}
                              </dd>
                            </>
                          )}
                          {r.patch.verifiedAt && (
                            <>
                              <dt>Prüfdatum</dt>
                              <dd>{r.patch.verifiedAt.slice(0, 10)}</dd>
                            </>
                          )}
                          {r.patch.sourceUrl && (
                            <>
                              <dt>Quelle</dt>
                              <dd>{r.patch.sourceUrl}</dd>
                            </>
                          )}
                          {r.patch.hook && (
                            <>
                              <dt>Anknüpfungspunkt</dt>
                              <dd>{r.patch.hook}</dd>
                            </>
                          )}
                        </dl>
                        <p>{r.origins.join(" · ")}</p>
                      </article>
                    ))}
                  </details>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Ich habe die vorgeschlagenen Angaben aus den vorhandenen
                    Notizen geprüft und bestätige ihre Richtigkeit.
                  </label>
                </>
              )}
              {!results.length && !editing && (
                <button
                  disabled={
                    busy ||
                    editing ||
                    !ready.length ||
                    (changes.length > 0 && !confirmed)
                  }
                  onClick={() => void prepare()}
                >
                  {ready.length} Mails prüfen →
                </button>
              )}
              {(gaps.length > 0 || editing) && (
                <>
                  <button
                    className="secondary"
                    disabled={busy || editing}
                    onClick={() => {
                      setEditorRows(gaps);
                      setEditing(true);
                    }}
                  >
                    {gaps.length} Kontakte ergänzen
                  </button>
                  {editing && (
                    <ContactPreparation
                      initialProposals={editorRows}
                      refresh={async () => {
                        await refresh();
                        const fresh = await request("preview", { ids });
                        setRows(fresh.contacts);
                        setConfirmed(false);
                      }}
                      onDone={() => {
                        setEditing(false);
                        if (ready.length && changes.length === 0)
                          void prepare();
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
          {!!results.length && (
            <div role="status">
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    {contacts.find((c) => c.id === r.id)?.organisation}:{" "}
                    {r.message}
                  </li>
                ))}
              </ul>
              {results.some((r) => !r.ok) && (
                <button
                  className="secondary"
                  onClick={() => {
                    setResults([]);
                    setRetry((v) => v + 1);
                  }}
                >
                  Offene Vorbereitung erneut prüfen
                </button>
              )}
              {results.some((r) => r.ok && r.draftId) && (
                <button
                  onClick={() =>
                    onReady(
                      results
                        .filter((r) => r.ok && r.draftId)
                        .map((r) => r.draftId!),
                    )
                  }
                >
                  Vorbereitete Mails prüfen →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
