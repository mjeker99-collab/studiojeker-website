"use client";
import { useState } from "react";
import { signedMessage } from "../lib/mail-signature";
import MailSchedule from "./MailSchedule";
import ContactPreparation from "./ContactPreparation";

type Draft = {
  id: string;
  contactId: string;
  version: number;
  versions: {
    version: number;
    recipient: string;
    subject: string;
    signatureCurrent: boolean;
  }[];
  approvals: { version: number; status: string }[];
};
type Row = {
  id: string;
  version: number;
  hash: string;
  contactRevision: number;
  recipient: string;
  subject: string;
  body: string;
  organisation: string;
  publicAuthority: boolean;
  needsLegal: boolean;
  issues: string[];
};
type Result = { id: string; ok: boolean; message: string };
async function api(action: string, body: unknown) {
  const response = await fetch(`/api/mail-review/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Prüfung fehlgeschlagen.");
  return data;
}
export default function MailStudio({
  drafts,
  contacts,
  refresh,
  openDraft,
}: {
  drafts: Draft[];
  contacts: {
    id: string;
    organisation: string;
    status: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  refresh: () => Promise<void>;
  openDraft: (id: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const [legal, setLegal] = useState(false);
  const [rationale, setRationale] = useState("");
  const [procurement, setProcurement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const contactOptions = contacts.filter(
    (c) =>
      !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status) &&
      `${c.organisation} ${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  // The state API orders newest drafts first. Offer only one per contact;
  // older message drafts remain available in the detailed archive.
  const seen = new Set<string>();
  const candidates = drafts.filter((d) => {
    if (seen.has(d.contactId)) return false;
    seen.add(d.contactId);
    const c = contacts.find((c) => c.id === d.contactId);
    return (
      c &&
      !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status) &&
      d.versions[0]
    );
  });
  const visible = candidates.filter((d) =>
    `${d.versions[0].subject} ${d.versions[0].recipient} ${contacts.find((c) => c.id === d.contactId)?.organisation}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const chosen = rows.filter((r) => included.includes(r.id));
  const missingLegal = chosen.filter((r) => r.needsLegal);
  const publicLegal = missingLegal.some((r) => r.publicAuthority);
  const canApprove =
    chosen.length > 0 &&
    read &&
    !busy &&
    chosen.every((r) => !r.issues.length) &&
    (!missingLegal.length ||
      (legal &&
        rationale.trim().length >= 15 &&
        (!publicLegal || procurement)));
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anfrage fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    const data = await api("preview", { ids: selected });
    setRows(data.rows);
    setIncluded(
      data.rows.filter((r: Row) => !r.issues.length).map((r: Row) => r.id),
    );
    setRead(false);
    setLegal(false);
    setProcurement(false);
    setResults([]);
    setStep(2);
  }
  return (
    <section className="mail-studio" aria-label="Mail-Studio" aria-busy={busy}>
      <div className="panel">
        <h2>Mail-Studio</h2>
        <p>Kontakte vorbereiten → gemeinsam prüfen → Versand planen</p>
        <div className="actions" aria-label="Arbeitsschritte">
          <button
            disabled={busy}
            aria-pressed={step === 1}
            onClick={() => {
              setStep(1);
              setRead(false);
            }}
          >
            1 · Auswahl
          </button>
          <button
            disabled={busy || !rows.length}
            aria-pressed={step === 2}
            onClick={() => setStep(2)}
          >
            2 · Globale Prüfung
          </button>
          <button
            disabled={busy}
            aria-pressed={step === 3}
            onClick={() => setStep(3)}
          >
            3 · Versand
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      {step === 1 && preparing && (
        <section
          className="panel"
          aria-label="Kontakte im Mail-Studio vorbereiten"
        >
          <h3>Kontakte vorbereiten</h3>
          <label>
            Kontakte suchen
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="actions">
            <button
              onClick={() =>
                setContactIds(contactOptions.slice(0, 25).map((c) => c.id))
              }
            >
              Erste 25 angezeigte Kontakte auswählen
            </button>
            <button
              onClick={() => {
                setPreparing(false);
                setSearch("");
                setSelected(
                  candidates
                    .filter((d) => contactIds.includes(d.contactId))
                    .map((d) => d.id),
                );
              }}
            >
              Weiter zu den Mailentwürfen
            </button>
          </div>
          {contactOptions.map((c) => (
            <label className="check mail-selection" key={c.id}>
              <input
                type="checkbox"
                checked={contactIds.includes(c.id)}
                onChange={(e) =>
                  setContactIds((old) =>
                    e.target.checked
                      ? [...old, c.id]
                      : old.filter((id) => id !== c.id),
                  )
                }
              />
              <span>
                {c.organisation} · {c.firstName} {c.lastName} · {c.email}
              </span>
            </label>
          ))}
          {!!contactIds.length && (
            <ContactPreparation
              key={contactIds.join(",")}
              ids={contactIds}
              contacts={contacts}
              refresh={refresh}
              begin={() => setError("")}
            />
          )}
        </section>
      )}
      {step === 1 && !preparing && (
        <section className="panel" aria-label="Mailauswahl">
          <h3>Welche Mails möchtest du vorbereiten?</h3>
          <p>
            Vorhandene persönliche Entwürfe auswählen oder weitere Kontakte
            vorbereiten.
          </p>
          <button
            onClick={() => {
              setPreparing(true);
              setSearch("");
            }}
          >
            Kontakte auswählen und vorbereiten
          </button>
          <label>
            Mails suchen
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Organisation, Empfänger oder Betreff"
            />
          </label>
          <div className="actions">
            <button
              disabled={busy || !visible.length}
              onClick={() => setSelected(visible.slice(0, 25).map((d) => d.id))}
            >
              Erste 25 angezeigte Mails auswählen
            </button>
            <button
              disabled={busy || !visible.length}
              onClick={() =>
                setSelected(visible.slice(0, 200).map((d) => d.id))
              }
            >
              Alle angezeigten Mails auswählen (max. 200)
            </button>
            <button disabled={busy} onClick={() => setSelected([])}>
              Auswahl leeren
            </button>
          </div>
          {visible.map((d) => (
            <label className="check mail-selection" key={d.id}>
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                disabled={busy}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, d.id]
                      : old.filter((id) => id !== d.id),
                  )
                }
              />
              <span>
                {contacts.find((c) => c.id === d.contactId)?.organisation} ·{" "}
                {d.versions[0].recipient}
                <br />
                {d.versions[0].subject} · Version {d.version}
              </span>
            </label>
          ))}
          {!visible.length && (
            <p>Noch keine passenden Entwürfe. Zuerst Kontakte vorbereiten.</p>
          )}
          <button
            disabled={busy || !selected.length || selected.length > 200}
            onClick={() => void run(preview)}
          >
            {selected.length} Mails gemeinsam prüfen
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="panel" aria-label="Globale Mailprüfung">
          <h3>{rows.length} Nachrichten in der Prüfvorschau</h3>
          <p>
            Empfänger, Betreff und vollständige Nachricht einschliesslich
            Signatur prüfen. Nachrichten können aus der gemeinsamen Freigabe
            ausgeschlossen werden.
          </p>
          <button disabled={busy} onClick={() => void run(preview)}>
            Prüfvorschau neu laden
          </button>
          {rows.map((r) => (
            <article className="mail-review-message" key={r.id}>
              <h4>{r.organisation}</h4>
              <p>
                Empfänger: {r.recipient} · Version {r.version}
              </p>
              <p>
                <strong>Betreff: {r.subject}</strong>
              </p>
              <div
                className="mail-review-body"
                dangerouslySetInnerHTML={{
                  __html: signedMessage(r.body, true).html,
                }}
              />
              {r.issues.length > 0 && (
                <ul className="error">
                  {r.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              <p>
                {r.needsLegal
                  ? "Versandprüfung offen"
                  : "Versandprüfung dokumentiert"}
                {r.publicAuthority ? " · Öffentlicher Auftraggeber" : ""}
              </p>
              <button
                disabled={busy}
                onClick={() => {
                  setRead(false);
                  setLegal(false);
                  openDraft(r.id);
                }}
              >
                Nachricht bearbeiten
              </button>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={
                    busy ||
                    !!r.issues.length ||
                    results.some((x) => x.id === r.id && x.ok)
                  }
                  checked={included.includes(r.id)}
                  onChange={(e) => {
                    setIncluded((old) =>
                      e.target.checked
                        ? [...old, r.id]
                        : old.filter((id) => id !== r.id),
                    );
                    setRead(false);
                    setLegal(false);
                  }}
                />
                {r.recipient} gemeinsam freigeben
              </label>
            </article>
          ))}
          {missingLegal.length > 0 && (
            <fieldset>
              <legend>
                Gemeinsame Versandprüfung für {missingLegal.length} ausgewählte
                Kontakte
              </legend>
              <p>
                Eine gemeinsame Begründung verwenden, wenn sie für alle oben
                ausgewählten Kontakte mit offener Versandprüfung zutrifft.
                Abweichende Kontakte aus der Auswahl nehmen.
              </p>
              <label>
                Rechtsgrundlage und Nachweis
                <textarea
                  aria-label="Rechtsgrundlage und Nachweis"
                  rows={3}
                  maxLength={4000}
                  value={rationale}
                  disabled={busy}
                  onChange={(e) => {
                    setRationale(e.target.value);
                    setLegal(false);
                    setRead(false);
                  }}
                />
              </label>
              {publicLegal && (
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={procurement}
                    onChange={(e) => {
                      setProcurement(e.target.checked);
                      setLegal(false);
                    }}
                  />
                  Beschaffungsrecht für die ausgewählten öffentlichen
                  Auftraggeber separat geprüft
                </label>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={legal}
                  onChange={(e) => setLegal(e.target.checked)}
                />
                Ich bestätige die Zulässigkeit und die angegebene Grundlage für
                alle ausgewählten Kontakte mit offener Versandprüfung.
              </label>
            </fieldset>
          )}
          <label className="check">
            <input
              type="checkbox"
              disabled={busy || !chosen.length}
              checked={read}
              onChange={(e) => setRead(e.target.checked)}
            />
            Ich habe alle {chosen.length} ausgewählten Nachrichten mit
            Empfänger, Betreff und Signatur vollständig gelesen und geprüft.
          </label>
          <button
            disabled={!canApprove}
            onClick={() =>
              void run(async () => {
                const data = await api("approve", {
                  read: true,
                  items: chosen.map(
                    ({ id, version, hash, contactRevision }) => ({
                      id,
                      version,
                      hash,
                      contactRevision,
                    }),
                  ),
                  ...(missingLegal.length
                    ? {
                        legal: {
                          confirmed: true,
                          rationale,
                          procurementReviewed: procurement,
                        },
                      }
                    : {}),
                });
                setResults(data.results);
                setRead(false);
                setLegal(false);
                setIncluded((old) =>
                  old.filter(
                    (id) =>
                      !data.results.some((r: Result) => r.id === id && r.ok),
                  ),
                );
                await refresh();
              })
            }
          >
            {chosen.length} Nachrichten gemeinsam freigeben
          </button>
          {results.length > 0 && (
            <div role="status">
              <p>
                {results.filter((r) => r.ok).length} freigegeben ·{" "}
                {results.filter((r) => !r.ok).length} noch offen. Noch keine
                Mails versandt.
              </p>
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    {rows.find((row) => row.id === r.id)?.recipient}:{" "}
                    {r.message}
                  </li>
                ))}
              </ul>
              <button onClick={() => setStep(3)}>Weiter zum Versand</button>
            </div>
          )}
        </section>
      )}
      {step === 3 && <MailSchedule drafts={drafts} openDraft={openDraft} />}
    </section>
  );
}
