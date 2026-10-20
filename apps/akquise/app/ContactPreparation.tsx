"use client";
import { useState } from "react";
import type { ContactPreparation as Proposal } from "../lib/contact-preparation";

type Result = { id: string; ok: boolean; message: string };
async function post<T>(action: string, data: unknown): Promise<T> {
  const response = await fetch(`/api/contacts/preparation/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Anfrage fehlgeschlagen.");
  return result;
}
export default function ContactPreparation({
  ids,
  contacts,
  refresh,
  openContact,
  begin,
}: {
  ids: string[];
  contacts: {
    id: string;
    organisation: string;
    firstName: string;
    lastName: string;
  }[];
  refresh: () => Promise<void>;
  openContact: (id: string) => void;
  begin: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const eligible = proposals?.filter((p) => p.ready && p.changed) ?? [];
  const name = (id: string) => {
    const c = contacts.find((c) => c.id === id);
    return c ? `${c.organisation} · ${c.firstName} ${c.lastName}` : "Kontakt";
  };
  async function preview() {
    const data = await post<{ contacts: Proposal[] }>("preview", { ids });
    setProposals(data.contacts);
    setChosen([]);
    setConfirmed(false);
  }
  async function run(work: () => Promise<void>) {
    begin();
    setBusy(true);
    setError("");
    setResults([]);
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Anfrage fehlgeschlagen. Bitte neu laden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="contact-preparation"
      aria-labelledby="contact-preparation-title"
      aria-busy={busy}
    >
      <h2 id="contact-preparation-title">{ids.length} Kontakte vorbereiten</h2>
      <p>
        Vorhandene Prüfdaten aus den Notizen gemeinsam kontrollieren und
        übernehmen. Anschliessend persönliche Entwürfe vorbereiten.
      </p>
      {ids.length > 200 && (
        <p role="alert">Bitte höchstens 200 Kontakte auswählen.</p>
      )}
      <div className="actions">
        <button
          disabled={busy || ids.length > 200}
          onClick={() => run(preview)}
        >
          Prüfdaten aus Notizen prüfen
        </button>
        <button
          className="secondary"
          disabled={busy || ids.length > 200}
          onClick={() =>
            run(async () => {
              const data = await post<{ results: Result[] }>("drafts", { ids });
              setResults(data.results);
              await refresh();
            })
          }
        >
          Entwürfe für Auswahl vorbereiten
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div role="status">
          <p>
            <strong>
              {results.filter((r) => r.ok).length} erfolgreich ·{" "}
              {results.filter((r) => !r.ok).length} noch zu bearbeiten
            </strong>
          </p>
          <ul>
            {results.map((r) => (
              <li key={r.id}>
                <strong>{name(r.id)}:</strong> {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {proposals && (
        <>
          <p>
            {eligible.length} Kontakte mit vollständigem Übernahmevorschlag ·{" "}
            {proposals.filter((p) => !p.ready).length} mit offenen Angaben.
          </p>
          <p className="warning">
            Die Vorschau prüft vorhandene Einträge, nicht die Website erneut.
            Bestehende Felder bleiben erhalten. Eine Übernahme aktualisiert den
            Kontakt und macht frühere Freigaben ungültig.
            Newsletter-Einwilligung und Versandfreigabe werden nicht erteilt.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={busy || !eligible.length}
              onClick={() => {
                setChosen(eligible.map((p) => p.id));
                setConfirmed(false);
              }}
            >
              Alle vollständigen Vorschläge auswählen
            </button>
            <button
              className="secondary"
              disabled={busy || !chosen.length}
              onClick={() => {
                setChosen([]);
                setConfirmed(false);
              }}
            >
              Vorschlagsauswahl leeren
            </button>
          </div>
          {proposals.map((p) => (
            <article className="preparation-contact" key={p.id}>
              <h3>
                {p.organisation} · {p.name}
              </h3>
              <p>{p.email || "E-Mail-Adresse fehlt"}</p>
              <dl>
                <dt>Prüfstatus</dt>
                <dd>
                  {p.values.confidence === "VERIFIED"
                    ? "Persönliche Adresse verifiziert"
                    : "Noch nicht bestätigt"}
                </dd>
                <dt>Verifikationsdatum</dt>
                <dd>
                  {p.values.verifiedAt
                    ? p.values.verifiedAt.slice(0, 10)
                    : "Fehlt"}
                </dd>
                <dt>Quellen-URL</dt>
                <dd>{p.values.sourceUrl || "Fehlt"}</dd>
                <dt>Anknüpfungspunkt</dt>
                <dd>{p.values.hook || "Fehlt"}</dd>
              </dl>
              {p.origins.length > 0 && (
                <ul>
                  {p.origins.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              )}
              {p.issues.length > 0 ? (
                <>
                  <p>
                    <strong>Noch zu ergänzen:</strong> {p.issues.join(" ")}
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => openContact(p.id)}
                  >
                    Kontakt ergänzen: {p.name}
                  </button>
                </>
              ) : p.changed ? (
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={chosen.includes(p.id)}
                    onChange={(e) => {
                      setChosen(
                        e.target.checked
                          ? [...chosen, p.id]
                          : chosen.filter((id) => id !== p.id),
                      );
                      setConfirmed(false);
                    }}
                  />
                  Prüfdaten übernehmen für {p.name}
                </label>
              ) : (
                <p>Prüfdaten bereits vollständig.</p>
              )}
            </article>
          ))}
          <label className="check">
            <input
              type="checkbox"
              disabled={busy || !chosen.length}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Ich habe die ausgewählten Angaben und vorgeschlagenen
            Anknüpfungspunkte geprüft und bestätige ihre Richtigkeit.
          </label>
          <div className="actions">
            <button
              disabled={busy || !confirmed || !chosen.length}
              onClick={() =>
                run(async () => {
                  const data = await post<{ results: Result[] }>("apply", {
                    confirmed: true,
                    contacts: proposals
                      .filter((p) => chosen.includes(p.id))
                      .map((p) => ({ id: p.id, revision: p.revision })),
                  });
                  setResults(data.results);
                  await refresh();
                  await preview();
                })
              }
            >
              {chosen.length} bestätigte Prüfdaten übernehmen
            </button>
          </div>
        </>
      )}
    </section>
  );
}
