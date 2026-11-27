"use client";
import { useEffect, useRef, useState } from "react";
import "./acquisition-wizard.css";
import MailPreview from "./MailPreview";
import ContactPreparationEditor from "./ContactPreparation";
import type { ContactPreparation } from "../lib/contact-preparation";
import {
  acquisitionBatchLimit,
  contactSendBlock,
  visibleAcquisitionContacts,
  type AcquisitionContact,
} from "../lib/acquisition-selection";

type Step = 1 | 2 | 3 | 4 | "done";
type Row = {
  id: string;
  contactId: string;
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
  if (!response.ok)
    throw new Error(data.error || "Die Anfrage ist fehlgeschlagen.");
  return data;
}
async function batchPost(
  path: string,
  key: string,
  values: unknown[],
  extra = {},
) {
  const combined: {
    rows: Row[];
    contacts: ContactPreparation[];
    results: {
      id: string;
      ok: boolean;
      draftId?: string;
      message: string;
      subject?: string;
      body?: string;
      organisation?: string;
    }[];
  } = { rows: [], contacts: [], results: [] };
  for (
    let offset = 0;
    offset < values.length;
    offset += acquisitionBatchLimit
  ) {
    const data = await post(path, {
      ...extra,
      [key]: values.slice(offset, offset + acquisitionBatchLimit),
    });
    combined.rows.push(...(data.rows || []));
    combined.contacts.push(...(data.contacts || []));
    combined.results.push(...(data.results || []));
  }
  return combined;
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
  const [showBlocked, setShowBlocked] = useState(false);
  const [proposals, setProposals] = useState<ContactPreparation[]>([]);
  const [editorDirty, setEditorDirty] = useState(false);
  const [addition, setAddition] = useState("");
  const [editMode, setEditMode] = useState<"append" | "replace">("append");
  const [reviewed, setReviewed] = useState(false);
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
    {
      id: string;
      ok: boolean;
      message: string;
      subject?: string;
      body?: string;
      organisation?: string;
    }[]
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
  const selectableIds = new Set(
    contacts.filter((c) => !contactSendBlock(c)).map((c) => c.id),
  );
  const selectedEligible = selected.filter((id) => selectableIds.has(id));
  const eligible = visible.filter((contact) => !contactSendBlock(contact));
  const includedRows = rows.filter(
    (row) =>
      !excluded.includes(row.id) &&
      !row.issues.length &&
      !row.deliveryStatus &&
      !row.queueStatus,
  );
  const evidenceReady = rationale.trim().length >= 15;
  const maySend = (row: Row) =>
    !row.needsLegal || (evidenceReady && (!row.publicAuthority || procurement));
  const sendRows = includedRows.filter(maySend);
  const heldBack = includedRows.filter((row) => !maySend(row));
  const active =
    rows.find((row) => row.id === activeId) || sendRows[0] || rows[0];
  const locked = (row?: Row) =>
    !row || Boolean(row.deliveryStatus || row.queueStatus);

  function chooseContacts(ids: string[]) {
    setSelected(ids);
    setRationale("");
    setProcurement(false);
    setRows([]);
    setExcluded([]);
    setProposals([]);
    setProblems([]);
    setGlobalPreview([]);
    setReviewed(false);
    setConfirmed(false);
  }

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Die Anfrage ist fehlgeschlagen.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function go(next: Step, record = true) {
    if (editorDirty) return;
    if (next === 4 && (!sendRows.length || !reviewed)) return;
    setStep(next);
    if (!record || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("akquiseStep", String(next));
    window.history.pushState({ akquiseStep: next }, "", url);
  }
  async function loadPreview(ids: string[]) {
    const data = await batchPost("/api/mail-review/preview", "ids", ids);
    const nextRows = (data.rows || []) as Row[];
    setRows(nextRows);
    setActiveId((current) =>
      nextRows.some((row) => row.id === current)
        ? current
        : nextRows[0]?.id || "",
    );
    setConfirmed(
      (current) =>
        current &&
        nextRows.every((row) =>
          rows.some(
            (old) =>
              old.id === row.id &&
              old.hash === row.hash &&
              old.version === row.version,
          ),
        ),
    );
    return nextRows;
  }
  async function createDrafts(ids = selectedEligible) {
    setProblems([]);
    setReviewed(false);
    setGlobalPreview([]);
    setConfirmed(false);
    const previewData = await batchPost(
      "/api/contacts/preparation/preview",
      "ids",
      ids,
    );
    const proposals = (previewData.contacts || []) as ContactPreparation[];
    const deferred = proposals.filter((item) => !item.ready || item.changed);
    setProposals(deferred);
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
    const prepared = await batchPost(
      "/api/contacts/preparation/prepare",
      "contacts",
      ready.map((item) => ({ id: item.id, revision: item.revision })),
      { confirmed: true },
    );
    const failed = (prepared.results || []).filter(
      (item: { ok: boolean }) => !item.ok,
    );
    setProblems([
      ...notes,
      ...failed.map((item: { message: string }) => item.message),
    ]);
    const draftIds = (prepared.results || [])
      .filter(
        (item: { ok: boolean; draftId?: string }) => item.ok && item.draftId,
      )
      .map((item) => item.draftId!);
    await loadPreview(draftIds);
    await refresh();
  }
  function startPreparation() {
    void run(async () => {
      go(2);
      await createDrafts();
    });
  }
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const next = event.state?.akquiseStep;
      if (
        next === 1 ||
        next === 2 ||
        next === 3 ||
        next === 4 ||
        next === "done"
      )
        setStep(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    let activeLoad = true;
    type SavedWork = {
      step?: Step;
      selected?: string[];
      excluded?: string[];
      search?: string;
      draftIds?: string[];
      mode?: "" | "immediate" | "scheduled";
      localDate?: string;
      localTime?: string;
      rationale?: string;
    };
    let saved: SavedWork | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(persistenceKey) || "null");
    } catch {
      // A damaged or obsolete entry must not prevent a fresh selection.
    }
    const urlStep = new URL(window.location.href).searchParams.get(
      "akquiseStep",
    );
    const nextStep = (
      urlStep === "done" ? "done" : Number(urlStep) || saved?.step || 1
    ) as Step;
    Promise.resolve()
      .then(async () => {
        if (!activeLoad) return;
        if (saved?.selected) setSelected(saved.selected);
        if (saved?.excluded) setExcluded(saved.excluded);
        if (typeof saved?.search === "string") setSearch(saved.search);
        if (saved?.mode) setMode(saved.mode);
        if (saved?.localDate) setLocalDate(saved.localDate);
        if (saved?.localTime) setLocalTime(saved.localTime);
        if (typeof saved?.rationale === "string")
          setRationale(saved.rationale);
        let hasDrafts = false;
        if (saved?.draftIds?.length) {
          const data = await batchPost(
            "/api/mail-review/preview",
            "ids",
            saved.draftIds,
          );
          if (!activeLoad) return;
          const nextRows = (data.rows || []) as Row[];
          setRows(nextRows);
          setActiveId(nextRows[0]?.id || "");
          hasDrafts = nextRows.length > 0;
        }
        const resume =
          !hasDrafts || nextStep === 1 ? 1 : nextStep === 2 ? 2 : 3;
        setStep(resume);
        const url = new URL(window.location.href);
        if (url.searchParams.has("akquiseStep")) url.searchParams.set("akquiseStep", String(resume));
        window.history.replaceState({ akquiseStep: resume }, "", url);
        if (activeLoad) setRestored(true);
      })
      .catch((reason) => {
        if (!activeLoad) return;
        setStep(1);
        setRestored(true);
        setError(
          reason instanceof Error
            ? reason.message
            : "Gespeicherte Auswahl konnte nicht geladen werden.",
        );
      });
    return () => {
      activeLoad = false;
    };
  }, [persistenceKey]);
  useEffect(() => {
    if (!restored) return;
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
        rationale,
      }),
    );
  }, [
    restored,
    persistenceKey,
    step,
    selected,
    excluded,
    search,
    rows,
    mode,
    localDate,
    localTime,
    rationale,
  ]);

  const planLabel =
    mode === "scheduled"
      ? `${sendRows.length} Mails für ${localDate ? localDate.split("-").reverse().join(".") : "…"} um ${localTime || "…"} Uhr einplanen`
      : `${sendRows.length} Mails sofort senden`;
  const planDisabled =
    busy ||
    !reviewed ||
    !confirmed ||
    !sendRows.length ||
    (mode !== "immediate" &&
      (mode !== "scheduled" || !localDate || !localTime));

  return (
    <section
      className="acquisition-wizard"
      aria-label="Akquise in vier Schritten"
      aria-busy={busy}
    >
      <ol className="acquisition-steps" aria-label="Vier Schritte">
        {steps.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="secondary"
              aria-current={step === item.id ? "step" : undefined}
              disabled={
                busy ||
                editorDirty ||
                (item.id === 2
                  ? !selectedEligible.length && !rows.length
                  : item.id === 3
                    ? !rows.length
                    : item.id === 4
                      ? !sendRows.length || !reviewed
                      : false)
              }
              onClick={() => {
                if (item.id === 2 && !rows.length) startPreparation();
                else go(item.id);
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
          <p>
            Tippe auf eine Adresse oder wähle die ersten 10, 20, 50, 100 oder
            alle Treffer.
          </p>
          <label>
            Kontakte suchen
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Organisation, Person oder E-Mail"
            />
          </label>
          <div className="wizard-actions">
            {[10, 20, 50, 100, "Alle"].map((amount) => (
              <button
                key={amount}
                type="button"
                className="secondary"
                disabled={busy || !eligible.length}
                onClick={() => {
                  chooseContacts(
                    eligible
                      .slice(0, typeof amount === "number" ? amount : undefined)
                      .map((c) => c.id),
                  );
                }}
              >
                {amount}
              </button>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={busy || !selected.length}
              onClick={() => chooseContacts([])}
            >
              Auswahl aufheben
            </button>
          </div>
          <p role="status">{selectedEligible.length} Kontakte ausgewählt.</p>
          <label className="choice">
            <input
              type="checkbox"
              checked={showBlocked}
              onChange={(event) => setShowBlocked(event.target.checked)}
            />
            Bereits kontaktierte und gesperrte Kontakte anzeigen (
            {visible.length - eligible.length})
          </label>
          <div className="wizard-list" aria-label="Kontaktauswahl">
            {(showBlocked
              ? [...eligible, ...visible.filter((c) => contactSendBlock(c))]
              : eligible
            ).map((contact) => {
              const block = contactSendBlock(contact);
              return (
                <label className="contact-choice" key={contact.id}>
                  <input
                    type="checkbox"
                    disabled={busy || Boolean(block)}
                    checked={!block && selectedEligible.includes(contact.id)}
                    aria-label={`${contact.organisation} auswählen`}
                    onChange={(event) =>
                      chooseContacts(
                        event.target.checked
                          ? [...new Set([...selected, contact.id])]
                          : selected.filter((id) => id !== contact.id),
                      )
                    }
                  />
                  <span>
                    <strong>{contact.organisation}</strong> ·{" "}
                    {contact.firstName} {contact.lastName} · {contact.email}
                    {block ? ` · ${block}` : ""}
                  </span>
                </label>
              );
            })}
            {!eligible.length && !showBlocked && (
              <p>Keine wählbaren Kontakte für diese Suche.</p>
            )}
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Personalisierte Mails erstellen</h2>
          <p>
            Absenderin ist Nora Jeker. Neue Entwürfe schliessen mit «Beste
            Grüsse», direkt vor der bestehenden Nora-Signatur.
          </p>
          {busy && <p role="status">Mails werden erstellt …</p>}
          {rows.length > 0 && (
            <p role="status">
              {rows.length === 1
                ? "1 Entwurf zur Prüfung bereit."
                : `${rows.length} Entwürfe zur Prüfung bereit.`}
            </p>
          )}
          <ul className="wizard-draft-list">
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
            <p>
              Für diese Auswahl liegt noch kein versandfähiger Entwurf vor. Die
              genannten Kontakte blockieren die übrigen nicht.
            </p>
          )}
        </div>
      )}
      {(step === 2 || step === 3) && proposals.length > 0 && (
        <div>
          <h3>Offene Angaben gemeinsam ergänzen</h3>
          {Array.from(
            { length: Math.ceil(proposals.length / acquisitionBatchLimit) },
            (_, index) => {
              const group = proposals.slice(
                index * acquisitionBatchLimit,
                (index + 1) * acquisitionBatchLimit,
              );
              return (
                <ContactPreparationEditor
                  key={group.map((p) => `${p.id}:${p.revision}`).join("|")}
                  initialProposals={group}
                  refresh={refresh}
                  requireComplete
                  onDone={() => void run(() => createDrafts())}
                />
              );
            },
          )}
        </div>
      )}
      {step === 3 && (
        <div>
          <h2>Mails prüfen und bearbeiten</h2>
          <p>
            {includedRows.length} Mails vorbereitet. Einzelne Mails links
            öffnen, bearbeiten oder abwählen.
          </p>
          {rows.some((row) => row.issues.length && !locked(row)) && (
            <button
              type="button"
              className="secondary"
              disabled={busy || editorDirty}
              onClick={() =>
                void run(async () => {
                  const data = await batchPost(
                    "/api/contacts/preparation/preview",
                    "ids",
                    rows
                      .filter((r) => !locked(r) && r.issues.length)
                      .map((r) => r.contactId),
                  );
                  setProposals(data.contacts);
                })
              }
            >
              Offene Kontaktangaben ergänzen
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={busy || editorDirty}
            onClick={() => {
              setExcluded([]);
              setGlobalPreview([]);
              setReviewed(false);
              setConfirmed(false);
            }}
          >
            Alle ungesendeten Mails auswählen
          </button>
          <details className="wizard-global" open>
            <summary>Gemeinsam bearbeiten</summary>{" "}
            <h3>Alle ausgewählten Mails ergänzen oder bearbeiten</h3>
            <label>
              Änderung
              <select
                value={editMode}
                onChange={(e) => {
                  setEditMode(e.target.value as "append" | "replace");
                  setGlobalPreview([]);
                }}
              >
                <option value="append">
                  Text vor der Grussformel ergänzen
                </option>
                <option value="replace">Text suchen und ersetzen</option>
              </select>
            </label>
            {editMode === "append" && (
              <label>
                Ergänzung für alle
                <textarea
                  value={addition}
                  onChange={(e) => {
                    setAddition(e.target.value);
                    setGlobalPreview([]);
                  }}
                />
              </label>
            )}
            {editMode === "replace" && (
              <>
                <label>
                  Text suchen
                  <input
                    value={find}
                    onChange={(event) => {
                      setFind(event.target.value);
                      setGlobalPreview([]);
                    }}
                  />
                </label>
                <label>
                  Ersetzen durch
                  <textarea
                    rows={3}
                    value={replace}
                    onChange={(event) => {
                      setReplace(event.target.value);
                      setGlobalPreview([]);
                    }}
                  />
                </label>
              </>
            )}
            <div className="wizard-actions">
              <button
                type="button"
                className="secondary"
                disabled={
                  busy ||
                  editorDirty ||
                  (editMode === "append" ? !addition.trim() : !find.trim()) ||
                  !rows.some(
                    (row) => !locked(row) && !excluded.includes(row.id),
                  )
                }
                onClick={() =>
                  run(async () => {
                    const data = await batchPost(
                      "/api/mail-review/revise",
                      "items",
                      rows
                        .filter(
                          (row) => !locked(row) && !excluded.includes(row.id),
                        )
                        .map((row) => ({ id: row.id, version: row.version })),
                      {
                        ...(editMode === "append" ? { append: addition } : {}),
                        find,
                        replace,
                        confirmed: false,
                      },
                    );
                    setGlobalPreview(data.results || []);
                  })
                }
              >
                Änderung anzeigen
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  busy || editorDirty || !globalPreview.some((item) => item.ok)
                }
                onClick={() =>
                  run(async () => {
                    const data = await batchPost(
                      "/api/mail-review/revise",
                      "items",
                      rows
                        .filter(
                          (row) => !locked(row) && !excluded.includes(row.id),
                        )
                        .map((row) => ({ id: row.id, version: row.version })),
                      {
                        ...(editMode === "append" ? { append: addition } : {}),
                        find,
                        replace,
                        confirmed: true,
                      },
                    );
                    setGlobalPreview(data.results || []);
                    setConfirmed(false);
                    setReviewed(false);
                    await loadPreview(rows.map((row) => row.id));
                    await refresh();
                  })
                }
              >
                Änderung übernehmen
              </button>
            </div>
            {globalPreview.length > 0 && (
              <p role="status">
                {globalPreview.filter((r) => r.ok).length} Mails mit Änderung.
                Vorschau der ersten drei:
              </p>
            )}
            {globalPreview.slice(0, 3).map((item) => (
              <article key={item.id}>
                <p>
                  {item.organisation || item.id}: {item.message}
                </p>
                {item.ok && item.body && <pre>{item.body}</pre>}
              </article>
            ))}
          </details>
          <div className="wizard-grid">
            <div className="wizard-list" role="list" aria-label="Empfänger">
              {rows.map((row) => (
                <div className="contact-choice" key={row.id} role="listitem">
                  <input
                    type="checkbox"
                    disabled={busy || editorDirty || locked(row)}
                    checked={!excluded.includes(row.id) && !locked(row)}
                    aria-label={`${row.organisation} mitversenden`}
                    onChange={(event) => {
                      setConfirmed(false);
                      setReviewed(false);
                      setGlobalPreview([]);
                      const checked = event.currentTarget.checked;
                      setExcluded((current) =>
                        checked
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id],
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || editorDirty}
                    aria-pressed={active?.id === row.id}
                    onClick={() => setActiveId(row.id)}
                  >
                    {row.organisation}
                    <br />
                    <small>{row.recipient}</small>
                    <small>
                      {locked(row)
                        ? "Bereits versendet oder eingeplant"
                        : row.issues.length
                          ? "Angaben ergänzen – Bearbeiten möglich"
                          : row.needsLegal && !evidenceReady
                            ? "Grundlage fehlt noch"
                            : "Bereit"}
                    </small>
                  </button>
                </div>
              ))}
            </div>
            <div>
              {active && (
                <MailPreview
                  key={active.id}
                  message={active}
                  disabled={busy || locked(active)}
                  onDirty={(dirty) => {
                    setEditorDirty(dirty);
                    setConfirmed(false);
                    setReviewed(false);
                  }}
                  onSave={async (value) => {
                    await post(`/api/drafts/${active.id}`, {
                      version: active.version,
                      recipient: active.recipient,
                      subject: value.subject,
                      body: value.body,
                    });
                    setConfirmed(false);
                    setReviewed(false);
                    await loadPreview(rows.map((row) => row.id));
                    await refresh();
                    setEditorDirty(false);
                  }}
                />
              )}
              {rows
                .filter(
                  (row) =>
                    row.id === active?.id &&
                    (row.issues.length ||
                      row.deliveryStatus ||
                      row.queueStatus),
                )
                .map((row) => (
                  <p key={`${row.id}-issue`} role="status">
                    {row.organisation}:{" "}
                    {row.issues.join(" ") ||
                      "Diese Mail ist bereits versendet oder eingeplant und wird nicht erneut gewählt."}
                  </p>
                ))}
            </div>
          </div>
          {includedRows.some((row) => row.needsLegal) && (
            <div>
              <p>
                Für einzelne Kontakte fehlt eine aktuelle rechtliche Prüfung.
                Sie gehen nur mit, wenn du die Grundlage hier selbst einträgst.
                Andere Mails bleiben unabhängig davon bereit.
              </p>
              <label>
                Grundlage der Kontaktaufnahme (mindestens 15 Zeichen)
                <small>
                  Schreibe in einem Satz, woher du die Person kennst oder
                  weshalb du sie anschreiben darfst. Zum Beispiel: «Bestehende
                  Kundin seit 2024», «Persönliches Gespräch an der Gewerbeschau
                  im Mai» oder «Anfrage über unser Kontaktformular». Die Angabe
                  bleibt bis zum Versand gespeichert.
                </small>
                <textarea
                  value={rationale}
                  onChange={(event) => {
                    setRationale(event.target.value);
                    setConfirmed(false);
                    setReviewed(false);
                  }}
                  rows={3}
                />
              </label>
              {includedRows.some(
                (row) => row.needsLegal && row.publicAuthority,
              ) && (
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={procurement}
                    onChange={(event) => {
                      setProcurement(event.target.checked);
                      setConfirmed(false);
                      setReviewed(false);
                    }}
                  />
                  Beschaffungsrecht für öffentliche Auftraggeber geprüft
                </label>
              )}
            </div>
          )}
          {heldBack.length > 0 && (
            <details>
              <summary>
                {heldBack.length} Mails warten auf die Grundlage der
                Kontaktaufnahme
              </summary>
              <ul className="wizard-draft-list">
                {heldBack.map((row) => (
                  <li key={row.id}>{row.organisation}</li>
                ))}
              </ul>
            </details>
          )}
          <label className="choice">
            <input
              type="checkbox"
              disabled={busy || editorDirty || !sendRows.length}
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            Alle {sendRows.length} ausgewählten Mails geprüft und für den
            nächsten Schritt freigegeben
          </label>
          {!sendRows.length && (
            <p role="status">
              Noch keine Mail versandbereit. Ergänze die offenen Angaben oder
              wähle andere Kontakte aus.
            </p>
          )}
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
                <input
                  type="date"
                  value={localDate}
                  onChange={(event) => {
                    setLocalDate(event.target.value);
                    setConfirmed(false);
                  }}
                />
              </label>
              <label>
                Uhrzeit (Europe/Zurich)
                <input
                  type="time"
                  value={localTime}
                  onChange={(event) => {
                    setLocalTime(event.target.value);
                    setConfirmed(false);
                  }}
                />
              </label>
            </div>
          )}
          <label className="choice">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Ich habe die {sendRows.length} Mails in dieser Version gelesen und
            gebe genau diesen Versand frei.
          </label>
        </div>
      )}
      {step === "done" && summary && (
        <div>
          <h2>Versand erfasst</h2>
          <p role="status">{summary.message}</p>
          <p>
            Eingeplant: {summary.queued}. Gestartet: {summary.started}. Nicht
            übernommen: {summary.failed}.
            {summary.whenLabel ? ` Zeitpunkt: ${summary.whenLabel}.` : ""}
          </p>
          {problems.length > 0 && (
            <details>
              <summary>
                Gründe für zurückgestellte Mails anzeigen ({problems.length})
              </summary>
              <ul className="wizard-draft-list">
                {problems.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="wizard-actions">
            <button
              type="button"
              onClick={() => {
                chooseContacts([]);
                setSummary(null);
                setMode("");
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
              disabled={busy || editorDirty}
              onClick={() => go(step === 2 ? 1 : step === 3 ? 2 : 3)}
            >
              Zurück
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              disabled={busy || !selectedEligible.length}
              onClick={startPreparation}
            >
              Personalisierte Mails erstellen
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={busy || !rows.length}
              onClick={() => go(3)}
            >
              Mails prüfen
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={busy || editorDirty || !sendRows.length || !reviewed}
              onClick={() => go(4)}
            >
              Weiter zum Versand
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              disabled={planDisabled}
              onClick={() =>
                void run(async () => {
                  const failures: string[] = [];
                  const totals: Summary = {
                    queued: 0,
                    started: 0,
                    failed: 0,
                    message: "",
                  };
                  for (
                    let offset = 0;
                    offset < sendRows.length;
                    offset += acquisitionBatchLimit
                  ) {
                    const data = await post(
                      "/api/mail-review/approve-and-plan",
                      {
                        items: sendRows
                          .slice(offset, offset + acquisitionBatchLimit)
                          .map((row) => ({
                            id: row.id,
                            version: row.version,
                            hash: row.hash,
                            contactRevision: row.contactRevision,
                          })),
                        read: true,
                        confirmDispatch: true,
                        mode,
                        ...(mode === "scheduled"
                          ? { localDate, localTime }
                          : {}),
                        ...(evidenceReady &&
                        includedRows.some((row) => row.needsLegal)
                          ? {
                              legal: {
                                confirmed: true,
                                rationale: rationale.trim(),
                                procurementReviewed: procurement,
                              },
                            }
                          : {}),
                      },
                    );
                    for (const result of data.results || []) {
                      if (!result.ok) {
                        const row = sendRows.find(
                          (item) => item.id === result.id,
                        );
                        failures.push(
                          `${row?.organisation || "Mail"}: ${result.message}`,
                        );
                      }
                    }
                    totals.message = data.summary.message;
                    totals.queued += data.summary.queued;
                    totals.started += data.summary.started;
                    totals.failed += data.summary.failed;
                    totals.whenLabel = data.summary.whenLabel;
                  }
                  if (sendRows.length > acquisitionBatchLimit)
                    totals.message = `${totals.queued} Mails eingeplant, ${totals.started} gestartet, ${totals.failed} nicht übernommen.${totals.whenLabel ? ` Zeitpunkt: ${totals.whenLabel}.` : ""}`;
                  setProblems(failures);
                  setConfirmed(false);
                  if (!totals.queued) {
                    await loadPreview(rows.map((row) => row.id));
                    setReviewed(false);
                    go(3);
                    setError(
                      failures[0] ||
                        "Keine Mail eingeplant. Bitte prüfe die Empfänger und ihre Angaben.",
                    );
                  } else {
                    setSummary(totals);
                    go("done");
                  }
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
