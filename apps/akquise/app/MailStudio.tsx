"use client";
import { useEffect, useState } from "react";
import { signedMessage } from "../lib/mail-signature";
import MailSchedule from "./MailSchedule";
import type { ContactPreparation } from "../lib/contact-preparation";

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
  initialDraftIds = [],
  drafts,
  contacts,
  refresh,
  openDraft,
}: {
  initialDraftIds?: string[];
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
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [dispatch, setDispatch] = useState(false);
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
  const [skipped, setSkipped] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(
    !drafts.some((d) =>
      contacts.some(
        (c) =>
          c.id === d.contactId &&
          !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status),
      ),
    ),
  );
  const [batchSize, setBatchSize] = useState(25);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const contactOptions = contacts.filter(
    (c) =>
      !drafts.some((d) => d.contactId === c.id && queuedIds.includes(d.id)) &&
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
      !queuedIds.includes(d.id) &&
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
    dispatch &&
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
  async function prepareBatch() {
    setSkipped([]);
    async function preparation(action: string, body: unknown) {
      const response = await fetch(`/api/contacts/preparation/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Vorbereitung fehlgeschlagen. Bitte erneut versuchen.",
        );
      return data;
    }
    const previewData = await preparation("preview", { ids: contactIds });
    const proposals: ContactPreparation[] = previewData.contacts;
    const ready = proposals.filter((r) => r.ready);
    const deferred = proposals
      .filter((r) => !r.ready)
      .map((r) => `${r.organisation}: ${r.issues.join(" · ")}`);
    setSkipped(deferred);
    if (!ready.length) {
      throw new Error(
        "Für diese Auswahl fehlen noch verwendbare Rechercheangaben. Es wurden keine Mails versandt. Du kannst eine andere Gruppe auswählen; die offenen Kontakte bleiben zurückgestellt.",
      );
    }
    const prepared = await preparation("prepare", {
      confirmed: true,
      contacts: ready.map((r) => ({ id: r.id, revision: r.revision })),
    });
    const successful = prepared.results.filter(
      (r: Result & { draftId?: string }) => r.ok && r.draftId,
    );
    setSkipped([
      ...deferred,
      ...prepared.results
        .filter((r: Result) => !r.ok)
        .map((r: Result) => r.message),
    ]);
    await refresh();
    if (!successful.length)
      throw new Error(
        "Keine Nachricht konnte vorbereitet werden. Die übrigen Kontakte bleiben unverändert.",
      );
    const ids = successful.map((r: Result & { draftId: string }) => r.draftId);
    const data = await api("preview", { ids });
    setSelected(ids);
    setRows(data.rows);
    setIncluded(
      data.rows.filter((r: Row) => !r.issues.length).map((r: Row) => r.id),
    );
    setRead(false);
    setDispatch(false);
    setLegal(false);
    setProcurement(false);
    setResults([]);
    setStep(2);
  }
  async function preview(ids = selected) {
    setSelected(ids);
    const data = await api("preview", { ids });
    setRows(data.rows);
    setIncluded(
      data.rows.filter((r: Row) => !r.issues.length).map((r: Row) => r.id),
    );
    setRead(false);
    setDispatch(false);
    setLegal(false);
    setProcurement(false);
    setResults([]);
    setStep(2);
  }
  useEffect(() => {
    if (!initialDraftIds.length) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setSelected(initialDraftIds);
        setBusy(true);
        setError("");
        return api("preview", { ids: initialDraftIds });
      })
      .then((data) => {
        if (!active || !data) return;
        setRows(data.rows);
        setIncluded(
          data.rows.filter((r: Row) => !r.issues.length).map((r: Row) => r.id),
        );
        setRead(false);
        setDispatch(false);
        setLegal(false);
        setStep(2);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialDraftIds]);
  return (
    <section className="mail-studio" aria-label="Mail-Studio" aria-busy={busy}>
      <div className="panel">
        <h2>Persönliche E-Mails versenden</h2>
        <p>
          1. Kontakte auswählen · 2. Nachrichten prüfen · 3. Versand freigeben
        </p>
        <div className="actions" aria-label="Arbeitsschritte">
          <button
            className="secondary"
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
            className="secondary"
            disabled={busy || !rows.length}
            aria-pressed={step === 2}
            onClick={() => setStep(2)}
          >
            2 · Mails prüfen
          </button>
          <button
            className="secondary"
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
          {candidates.length > 0 && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setPreparing(false)}
            >
              Zu den {candidates.length} vorhandenen Mails
            </button>
          )}
          <label>
            Kontakte suchen
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <p>
            Wähle 25, 50 oder 100 Kontakte. Vorhandene Rechercheangaben werden
            automatisch übernommen und persönliche Mails vorbereitet.
            Unvollständige Kontakte werden zurückgestellt.
          </p>
          <div className="actions">
            {[25, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                className="secondary"
                disabled={busy || !contactOptions.length}
                aria-pressed={
                  contactIds.length === Math.min(amount, contactOptions.length)
                }
                onClick={() =>
                  setContactIds(
                    contactOptions.slice(0, amount).map((c) => c.id),
                  )
                }
              >
                {amount} Kontakte auswählen
              </button>
            ))}
            <button
              disabled={busy || !contactIds.length || contactIds.length > 200}
              onClick={() => void run(prepareBatch)}
            >
              {busy
                ? "Mails werden vorbereitet …"
                : `${contactIds.length} persönliche Mails vorbereiten →`}
            </button>
          </div>
          <details>
            <summary>
              Auswahl einzeln anpassen ({contactIds.length} ausgewählt)
            </summary>
            {contactOptions.map((c) => (
              <label className="check mail-selection" key={c.id}>
                <input
                  type="checkbox"
                  disabled={busy}
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
          </details>
        </section>
      )}
      {step === 1 && !preparing && (
        <section className="panel" aria-label="Mailauswahl">
          <h3>{visible.length} persönliche Mails vorhanden</h3>
          <p>
            Diese Entwürfe sind bereits vorbereitet. Öffne die gewünschte Menge
            direkt zur gemeinsamen Freigabe.
          </p>
          <label>
            Mails suchen
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Organisation, Empfänger oder Betreff"
            />
          </label>
          <div className="actions">
            {[25, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                className="secondary"
                aria-pressed={batchSize === amount}
                disabled={busy}
                onClick={() => setBatchSize(amount)}
              >
                {amount} Mails
              </button>
            ))}
          </div>
          <button
            disabled={busy || !visible.length}
            onClick={() =>
              void run(() =>
                preview(visible.slice(0, batchSize).map((d) => d.id)),
              )
            }
          >
            {busy
              ? "Mails werden geladen …"
              : `${Math.min(batchSize, visible.length)} Mails gemeinsam freigeben →`}
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setPreparing(true);
              setSearch("");
            }}
          >
            Weitere Kontakte auswählen
          </button>
          <details>
            <summary>Einzelne Entwürfe auswählen (optional)</summary>
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
                  {d.versions[0].subject} ·{" "}
                  {d.approvals.find((a) => a.version === d.version)?.status ===
                  "APPROVED"
                    ? "Freigegeben"
                    : "Zur Prüfung"}
                </span>
              </label>
            ))}
            {!visible.length && (
              <p>Noch keine passenden Entwürfe. Zuerst Kontakte vorbereiten.</p>
            )}
            <button
              disabled={busy || !selected.length || selected.length > 200}
              onClick={() => void run(() => preview())}
            >
              {selected.length} Mails gemeinsam prüfen
            </button>
          </details>
        </section>
      )}
      {skipped.length > 0 && (
        <details className="panel">
          <summary>
            {skipped.length} Kontakte zurückgestellt – übrige Mails können
            weitergehen
          </summary>
          <ul>
            {skipped.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </details>
      )}
      {step === 2 && (
        <section className="panel" aria-label="Globale Mailprüfung">
          <h3>{rows.length} Nachrichten in der Prüfvorschau</h3>
          <p>
            Empfänger, Betreff und vollständige Nachricht einschliesslich
            Signatur prüfen. Nachrichten können aus der gemeinsamen Freigabe
            ausgeschlossen werden.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void run(() => preview())}
          >
            Prüfvorschau neu laden
          </button>
          {rows.some((r) => r.issues.length) && (
            <div className="panel-note">
              <p>
                {rows.filter((r) => r.issues.length).length} Kontakte benötigen
                Ergänzungen und werden zurückgestellt. Die übrigen Mails sind
                ausgewählt.
              </p>
            </div>
          )}
          <p>
            <strong>
              {chosen.length} Mails bereit ·{" "}
              {skipped.length + rows.filter((r) => r.issues.length).length}{" "}
              zurückgestellt
            </strong>
          </p>
          {rows.map((r) => (
            <details className="mail-review-message" key={r.id}>
              <summary>
                {r.organisation} · {r.recipient} — {r.subject}
                {r.issues.length ? " · Zurückgestellt" : ""}
              </summary>
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
            </details>
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
              checked={read && dispatch}
              onChange={(e) => {
                setRead(e.target.checked);
                setDispatch(e.target.checked);
              }}
            />
            Ich gebe die {chosen.length} ausgewählten persönlichen Mails mit
            Empfänger, Betreff und Signatur frei und bestätige den automatischen
            Versand nach dem angezeigten Zeitplan.
          </label>
          <button
            disabled={!canApprove}
            onClick={() =>
              void run(async () => {
                const data = await api("approve-and-enqueue", {
                  confirmDispatch: true,
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
                setDispatch(false);
                setScheduleRevision((v) => v + 1);
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
            {chosen.length} Mails freigeben und einplanen
          </button>
          {results.length > 0 && (
            <div role="status">
              <p>
                {results.filter((r) => r.ok).length} freigegeben und eingeplant
                · {results.filter((r) => !r.ok).length} noch offen. Der Versand
                folgt dem gespeicherten Zeitplan.
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
      <MailSchedule
        key={scheduleRevision}
        drafts={drafts}
        openDraft={openDraft}
        compact={step !== 3}
        readyCount={candidates.length}
        onQueueChange={setQueuedIds}
      />
    </section>
  );
}
