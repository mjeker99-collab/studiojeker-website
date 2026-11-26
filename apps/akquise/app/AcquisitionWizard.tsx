"use client";
import { useEffect, useRef, useState } from "react";
import "./acquisition-wizard.css";
import MailPreview from "./MailPreview";
import {
  acquisitionBatchLimit,
  contactSendBlock,
  visibleAcquisitionContacts,
  type AcquisitionContact,
} from "../lib/acquisition-selection";

type Step = 1 | 2 | 3 | 4 | "done";
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
  deliveryStatus?: string | null;
  queueStatus?: string | null;
};
type Summary = {
  queued: number;
  started: number;
  failed: number;
  message: string;
  whenLabel?: string | null;
  nextAt?: string | null;
};
const steps: { id: Step; label: string }[] = [
  { id: 1, label: "1 Kontakte auswählen" },
  { id: 2, label: "2 Personalisierte Mails erstellen" },
  { id: 3, label: "3 Mails prüfen" },
  { id: 4, label: "4 Versand" },
];
async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Die Anfrage ist fehlgeschlagen.");
  return data;
}
function zurichNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
export default function AcquisitionWizard({
  persistenceKey,
  contacts,
  refresh,
  onOpenHistory,
}: {
  persistenceKey: string;
  contacts: AcquisitionContact[];
  refresh: () => Promise<void>;
  onOpenHistory: () => void;
}) {
  const lock = useRef(false);
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [globalPreview, setGlobalPreview] = useState<
    { id: string; ok: boolean; message: string; subject?: string; body?: string; organisation?: string }[]
  >([]);
  const [mode, setMode] = useState<"" | "immediate" | "scheduled">("");
  const [localDate, setLocalDate] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [rationale, setRationale] = useState("");
  const [procurement, setProcurement] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [restored, setRestored] = useState(false);
  const visible = visibleAcquisitionContacts(contacts, search);
  const eligible = visible.filter((contact) => !contactSendBlock(contact));
  const includedRows = rows.filter(
    (row) =>
      !excluded.includes(row.id) &&
      !row.issues.length &&
      !row.deliveryStatus &&
      !row.queueStatus,
  );
  const evidenceReady =
    rationale.trim().length >= 15 &&
    (!includedRows.some((row) => row.needsLegal && row.publicAuthority) ||
      procurement);
  const sendRows = includedRows.filter((row) => !row.needsLegal || evidenceReady);
  const heldBack = includedRows.filter((row) => row.needsLegal && !evidenceReady);
  const active = rows.find((row) => row.id === activeId) || sendRows[0] || rows[0];
  const locked = (row?: Row) =>
    !row || Boolean(row.issues.length || row.deliveryStatus || row.queueStatus);

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Die Anfrage ist fehlgeschlagen.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function go(next: Step, record = true) {
    setStep(next);
    if (!record || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("akquiseStep", String(next));
    window.history.pushState({ akquiseStep: next }, "", url);
  }
  async function loadPreview(ids: string[]) {
    const data = await post("/api/mail-review/preview", { ids: ids.slice(0, acquisitionBatchLimit) });
    const nextRows = (data.rows || []) as Row[];
    setRows(nextRows);
    setActiveId((current) =>
      nextRows.some((row) => row.id === current) ? current : nextRows[0]?.id || "",
    );
    setConfirmed((current) =>
      current &&
      nextRows.every((row) =>
        rows.some((old) => old.id === row.id && old.hash === row.hash && old.version === row.version),
      ),
    );
    return nextRows;
  }
  async function createDrafts(ids = selected) {
    setProblems([]);
    setGlobalPreview([]);
    setConfirmed(false);
    const previewData = await post("/api/contacts/preparation/preview", { ids });
    const proposals = (previewData.contacts || []) as {
      id: string;
      revision: number;
      ready: boolean;
      changed: boolean;
      organisation: string;
      issues: string[];
    }[];
    const deferred = proposals.filter((item) => !item.ready || item.changed);
    const ready = proposals.filter((item) => item.ready && !item.changed);
    const notes = deferred.map(
      (item) =>
        `${item.organisation}: ${item.issues?.join(" ") || "Angaben sind unvollständig."}`,
    );
    if (!ready.length) {
      setProblems(notes);
      setRows([]);
      return;
    }
    const prepared = await post("/api/contacts/preparation/prepare", {
      confirmed: true,
      contacts: ready.map((item) => ({ id: item.id, revision: item.revision })),
    });
    const failed = (prepared.results || []).filter(
      (item: { ok: boolean }) => !item.ok,
    );
    setProblems([
      ...notes,
      ...failed.map((item: { message: string }) => item.message),
    ]);
    const draftIds = (prepared.results || [])
      .filter((item: { ok: boolean; draftId?: string }) => item.ok && item.draftId)
      .map((item: { draftId: string }) => item.draftId);
    await refresh();
    if (draftIds.length) await loadPreview(draftIds);
  }
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const next = event.state?.akquiseStep;
      if (next === 1 || next === 2 || next === 3 || next === 4 || next === "done")
        setStep(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    let activeLoad = true;
    const saved = JSON.parse(localStorage.getItem(persistenceKey) || "null") as {
      step?: Step;
      selected?: string[];
      excluded?: string[];
      search?: string;
      draftIds?: string[];
      mode?: "" | "immediate" | "scheduled";
      localDate?: string;
      localTime?: string;
      confirmed?: boolean;
      hashes?: Record<string, string>;
    } | null;
    const urlStep = new URL(window.location.href).searchParams.get("akquiseStep");
    const nextStep = (urlStep === "done" ? "done" : Number(urlStep) || saved?.step || 1) as Step;
    Promise.resolve()
      .then(async () => {
        if (!activeLoad) return;
        if (saved?.selected) setSelected(saved.selected);
        if (saved?.excluded) setExcluded(saved.excluded);
        if (typeof saved?.search === "string") setSearch(saved.search);
        if (saved?.mode) setMode(saved.mode);
        if (saved?.localDate) setLocalDate(saved.localDate);
        if (saved?.localTime) setLocalTime(saved.localTime);
        if (saved?.draftIds?.length) {
          const data = await post("/api/mail-review/preview", {
            ids: saved.draftIds.slice(0, acquisitionBatchLimit),
          });
          if (!activeLoad) return;
          const nextRows = (data.rows || []) as Row[];
          setRows(nextRows);
          setActiveId(nextRows[0]?.id || "");
          const same = nextRows.every(
            (row) => saved.hashes?.[row.id] === `${row.version}:${row.hash}`,
          );
          setConfirmed(Boolean(saved.confirmed && same));
        }
        setStep(nextStep === 2 || nextStep === 3 || nextStep === 4 || nextStep === "done" ? nextStep : 1);
        window.history.replaceState({ akquiseStep: nextStep }, "", window.location.href);
        if (activeLoad) setRestored(true);
      })
      .catch((reason) => {
        if (activeLoad)
          setError(reason instanceof Error ? reason.message : "Gespeicherte Auswahl konnte nicht geladen werden.");
      });
    return () => {
      activeLoad = false;
    };
  }, [persistenceKey]);
  useEffect(() => {
    if (!restored) return;
    const hashes = Object.fromEntries(rows.map((row) => [row.id, `${row.version}:${row.hash}`]));
    localStorage.setItem(
      persistenceKey,
      JSON.stringify({
        step,
        selected,
        excluded,
        search,
        draftIds: rows.map((row) => row.id),
        mode,
        localDate,
        localTime,
        confirmed,
        hashes,
      }),
    );
  }, [restored, persistenceKey, step, selected, excluded, search, rows, mode, localDate, localTime, confirmed]);

  const planLabel =
    mode === "scheduled"
      ? `${sendRows.length} Mails für ${localDate || "…"} um ${localTime || "…"} Uhr einplanen`
      : `${sendRows.length} Mails sofort senden`;
  const planDisabled =
    busy ||
    !confirmed ||
    !sendRows.length ||
    (mode !== "immediate" && (mode !== "scheduled" || !localDate || !localTime));

  return (
    <section className="acquisition-wizard" aria-label="Akquise in vier Schritten" aria-busy={busy}>
      <ol className="acquisition-steps" aria-label="Vier Schritte">
        {steps.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="secondary"
              aria-current={step === item.id ? "step" : undefined}
              disabled={busy || (item.id !== 1 && !rows.length && item.id !== step)}
              onClick={() => {
                if (item.id === 1 || rows.length) go(item.id);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {step === 1 && (
        <div>
          <h2>Kontakte auswählen</h2>
          <p>Suche, filtere und wähle die Personen. Bereits kontaktierte Einträge bleiben sichtbar und sind nicht erneut wählbar.</p>
          <label>
            Kontakte suchen
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Organisation, Person oder E-Mail"
            />
          </label>
          <div className="wizard-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy || !eligible.length}
              onClick={() =>
                setSelected(eligible.slice(0, acquisitionBatchLimit).map((contact) => contact.id))
              }
            >
              {eligible.length > acquisitionBatchLimit
                ? `Erste ${acquisitionBatchLimit} Suchergebnisse auswählen`
                : `Alle ${eligible.length} Suchergebnisse auswählen`}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !selected.length}
              onClick={() => setSelected([])}
            >
              Auswahl aufheben
            </button>
          </div>
          <p role="status">{selected.length} Kontakte ausgewählt.</p>
          <div className="wizard-list" aria-label="Kontaktauswahl">
            {visible.map((contact) => {
              const block = contactSendBlock(contact);
              return (
                <label className="contact-choice" key={contact.id}>
                  <input
                    type="checkbox"
                    disabled={busy || Boolean(block)}
                    checked={selected.includes(contact.id)}
                    aria-label={`${contact.organisation} auswählen`}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, contact.id].slice(0, acquisitionBatchLimit)
                          : current.filter((id) => id !== contact.id),
                      )
                    }
                  />
                  <span>
                    <strong>{contact.organisation}</strong> · {contact.firstName} {contact.lastName} · {contact.email}
                    {block ? ` · ${block}` : ""}
                  </span>
                </label>
              );
            })}
            {!visible.length && <p>Keine Kontakte für diese Suche.</p>}
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Personalisierte Mails erstellen</h2>
          <p>
            Absenderin ist Nora Jeker. Neue Entwürfe schliessen mit «Beste Grüsse», direkt vor der bestehenden Nora-Signatur.
          </p>
          {busy && <p role="status">Mails werden erstellt …</p>}
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                {row.organisation}: {row.subject}
              </li>
            ))}
          </ul>
          {problems.map((problem) => (
            <p key={problem} role="status">
              {problem}
            </p>
          ))}
          {!busy && !rows.length && (
            <p>Für diese Auswahl liegt noch kein versandfähiger Entwurf vor. Die genannten Kontakte blockieren die übrigen nicht.</p>
          )}
        </div>
      )}
      {step === 3 && (
        <div>
          <h2>Mails prüfen und bearbeiten</h2>
          <p>Eine einzelne unvollständige Mail bleibt aussen vor. Die übrigen bleiben versandbereit.</p>
          <div className="wizard-grid">
            <div className="wizard-list" role="list" aria-label="Empfänger">
              {rows.map((row) => (
                <div className="contact-choice" key={row.id} role="listitem">
                  <input
                    type="checkbox"
                    disabled={busy || locked(row)}
                    checked={!excluded.includes(row.id) && !locked(row)}
                    aria-label={`${row.organisation} mitversenden`}
                    onChange={(event) => {
                      setConfirmed(false);
                      setExcluded((current) =>
                        event.target.checked
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id],
                      );
                    }}
                  />
                  <button type="button" className="secondary" onClick={() => setActiveId(row.id)}>
                    {row.organisation}
                    <br />
                    <small>{row.recipient}</small>
                  </button>
                </div>
              ))}
            </div>
            <div>
              {active && (
                <MailPreview
                  key={`${active.id}:${active.version}:${active.hash}`}
                  message={active}
                  disabled={busy || locked(active)}
                  onDirty={() => setConfirmed(false)}
                  onSave={async (value) => {
                    await post(`/api/drafts/${active.id}`, {
                      version: active.version,
                      recipient: active.recipient,
                      subject: value.subject,
                      body: value.body,
                    });
                    setConfirmed(false);
                    await loadPreview(rows.map((row) => row.id));
                    await refresh();
                  }}
                />
              )}
              {rows
                .filter((row) => row.issues.length || row.deliveryStatus || row.queueStatus)
                .map((row) => (
                  <p key={`${row.id}-issue`} role="status">
                    {row.organisation}: {row.issues.join(" ") || "Diese Mail ist bereits versendet oder eingeplant und wird nicht erneut gewählt."}
                  </p>
                ))}
              <h3>Änderung für alle ausgewählten, ungesendeten Mails</h3>
              <label>
                Text suchen
                <input value={find} onChange={(event) => setFind(event.target.value)} />
              </label>
              <label>
                Ersetzen durch
                <textarea rows={3} value={replace} onChange={(event) => setReplace(event.target.value)} />
              </label>
              <div className="wizard-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || find.trim().length < 1 || !includedRows.length}
                  onClick={() =>
                    run(async () => {
                      const data = await post("/api/mail-review/revise", {
                        items: includedRows.map((row) => ({ id: row.id, version: row.version })),
                        find,
                        replace,
                        confirmed: false,
                      });
                      setGlobalPreview(data.results || []);
                    })
                  }
                >
                  Änderung anzeigen
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !globalPreview.some((item) => item.ok)}
                  onClick={() =>
                    run(async () => {
                      const data = await post("/api/mail-review/revise", {
                        items: includedRows.map((row) => ({ id: row.id, version: row.version })),
                        find,
                        replace,
                        confirmed: true,
                      });
                      setGlobalPreview(data.results || []);
                      setConfirmed(false);
                      await loadPreview(rows.map((row) => row.id));
                      await refresh();
                    })
                  }
                >
                  Änderung übernehmen
                </button>
              </div>
              {globalPreview.map((item) => (
                <article key={item.id}>
                  <p>
                    {item.organisation || item.id}: {item.message}
                  </p>
                  {item.ok && item.body && <pre>{item.body}</pre>}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      {step === 4 && (
        <div>
          <h2>Mailversand planen oder sofort senden</h2>
          <p>{sendRows.length} Mails in der angezeigten Version.</p>
          <label className="choice">
            <input
              type="radio"
              name="dispatch-mode"
              checked={mode === "immediate"}
              onChange={() => {
                setMode("immediate");
                setConfirmed(false);
              }}
            />
            Sofort senden
          </label>
          <label className="choice">
            <input
              type="radio"
              name="dispatch-mode"
              checked={mode === "scheduled"}
              onChange={() => {
                setMode("scheduled");
                setConfirmed(false);
                if (!localDate) setLocalDate(zurichNow().date);
              }}
            />
            Versand planen
          </label>
          {mode === "scheduled" && (
            <div>
              <label>
                Datum (Europe/Zurich)
                <input type="date" value={localDate} onChange={(event) => { setLocalDate(event.target.value); setConfirmed(false); }} />
              </label>
              <label>
                Uhrzeit (Europe/Zurich)
                <input type="time" value={localTime} onChange={(event) => { setLocalTime(event.target.value); setConfirmed(false); }} />
              </label>
            </div>
          )}
          {includedRows.some((row) => row.needsLegal) && (
            <div>
              <p>Für einzelne Kontakte fehlt eine aktuelle rechtliche Prüfung. Sie gehen nur mit, wenn du die Grundlage hier selbst einträgst. Andere Mails bleiben unabhängig davon bereit.</p>
              <label>
                Grundlage der Kontaktaufnahme
                <textarea value={rationale} onChange={(event) => { setRationale(event.target.value); setConfirmed(false); }} rows={3} />
              </label>
              {includedRows.some((row) => row.publicAuthority) && (
                <label className="choice">
                  <input type="checkbox" checked={procurement} onChange={(event) => { setProcurement(event.target.checked); setConfirmed(false); }} />
                  Beschaffungsrecht für öffentliche Auftraggeber geprüft
                </label>
              )}
            </div>
          )}
          {heldBack.map((row) => (
            <p key={row.id} role="status">
              {row.organisation}: Separate, aktuelle rechtliche Versandprüfung fehlt. Diese Mail wird nicht mitgesendet.
            </p>
          ))}
          <label className="choice">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Ich habe die {sendRows.length} Mails in dieser Version gelesen und gebe genau diesen Versand frei.
          </label>
        </div>
      )}
      {step === "done" && summary && (
        <div>
          <h2>Versand erfasst</h2>
          <p role="status">{summary.message}</p>
          <p>
            Eingeplant: {summary.queued}. Gestartet: {summary.started}. Nicht übernommen: {summary.failed}.
            {summary.whenLabel ? ` Zeitpunkt: ${summary.whenLabel}.` : ""}
          </p>
          <div className="wizard-actions">
            <button
              type="button"
              onClick={() => {
                setSelected([]);
                setRows([]);
                setExcluded([]);
                setProblems([]);
                setSummary(null);
                setMode("");
                setConfirmed(false);
                setGlobalPreview([]);
                go(1);
              }}
            >
              Neue Mails erstellen
            </button>
            <button type="button" className="secondary" onClick={onOpenHistory}>
              Versandverlauf
            </button>
          </div>
        </div>
      )}
      {step !== "done" && (
        <div className="wizard-actions">
          {step !== 1 && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => go(step === 2 ? 1 : step === 3 ? 2 : 3)}
            >
              Zurück
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              disabled={busy || !selected.length || selected.length > acquisitionBatchLimit}
              onClick={() =>
                void run(async () => {
                  go(2);
                  await createDrafts();
                })
              }
            >
              Personalisierte Mails erstellen
            </button>
          )}
          {step === 2 && (
            <button type="button" disabled={busy || !rows.length} onClick={() => go(3)}>
              Mails prüfen
            </button>
          )}
          {step === 3 && (
            <button type="button" disabled={busy || !includedRows.length} onClick={() => go(4)}>
              Weiter zum Versand
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              disabled={planDisabled}
              onClick={() =>
                void run(async () => {
                  const data = await post("/api/mail-review/approve-and-plan", {
                    items: sendRows.map((row) => ({
                      id: row.id,
                      version: row.version,
                      hash: row.hash,
                      contactRevision: row.contactRevision,
                    })),
                    read: true,
                    confirmDispatch: true,
                    mode,
                    ...(mode === "scheduled" ? { localDate, localTime } : {}),
                    ...(evidenceReady && includedRows.some((row) => row.needsLegal)
                      ? {
                          legal: {
                            confirmed: true,
                            rationale: rationale.trim(),
                            procurementReviewed: procurement,
                          },
                        }
                      : {}),
                  });
                  setSummary(data.summary);
                  setConfirmed(false);
                  go("done");
                  await refresh();
                })
              }
            >
              {planLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
