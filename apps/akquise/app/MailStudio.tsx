"use client";
import { useEffect, useRef, useState } from "react";
import "./mailstudio-visual.css";
import { signedMessage } from "../lib/mail-signature";
import MailContentEditor from "./MailContentEditor";
import MailSchedule from "./MailSchedule";
import ContactPreparationEditor from "./ContactPreparation";
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
type Result = { id: string; ok: boolean; message: string; stopBatch?: boolean };
const EMPTY_IDS: string[] = [];
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
  initialDraftIds = EMPTY_IDS,
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
    replyOutcome?: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  refresh: () => Promise<void>;
  openDraft: (id: string) => void;
}) {
  const operation = useRef(false);
  const approvalRef = useRef<HTMLElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [sendableQueuedIds, setSendableQueuedIds] = useState<string[]>([]);
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [dispatch, setDispatch] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const [legal, setLegal] = useState(false);
  const [rationale, setRationale] = useState("");
  const [procurement, setProcurement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("schedule");
  const [sendProgress, setSendProgress] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState("");
  const [batchProposals, setBatchProposals] = useState<ContactPreparation[]>(
    [],
  );
  const [skipped, setSkipped] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(true);
  const [batchSize, setBatchSize] = useState(25);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const matchingContacts = contacts.filter(
    (c) =>
      !drafts.some((d) => d.contactId === c.id && queuedIds.includes(d.id)) &&
      !c.replyOutcome &&
      !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status) &&
      `${c.organisation} ${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  // Keep info@ contacts in the master list, but never propose them for
  // bulk mail preparation. Other functional addresses remain visible here
  // until the existing server-side verification and approval checks run.
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isInfoEmail = (email: string) => /^info(?:[.+_-][^@]*)?@/i.test(email);
  const contactOptions = matchingContacts.filter(
    (c) => validEmail.test(c.email.trim()) && !isInfoEmail(c.email.trim()),
  );
  const excludedInfoCount = matchingContacts.filter(
    (c) => validEmail.test(c.email.trim()) && isInfoEmail(c.email.trim()),
  ).length;
  const missingEmailCount =
    matchingContacts.length - contactOptions.length - excludedInfoCount;
  // The state API orders newest drafts first. Offer only one per contact;
  // older message drafts remain available in the detailed archive.
  const seen = new Set<string>();
  const candidates = drafts.filter((d) => {
    if (seen.has(d.contactId)) return false;
    seen.add(d.contactId);
    const c = contacts.find((c) => c.id === d.contactId);
    // Old drafts must obey the same info@ exclusion as new selections.
    // Check both the current contact and the recipient stored in the draft:
    // they can differ after a contact update. Never delete those drafts.
    const recipient = d.versions[0]?.recipient?.trim() ?? "";
    return (
      !queuedIds.includes(d.id) &&
      c &&
      !c.replyOutcome &&
      !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status) &&
      d.versions[0] &&
      !isInfoEmail(c.email.trim()) &&
      validEmail.test(recipient) &&
      !isInfoEmail(recipient)
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
  const approvalHint = !chosen.length
    ? "Wähle mindestens eine versandbereite Mail aus."
    : missingLegal.length && rationale.trim().length < 15
      ? "Ergänze die gemeinsame Rechtsgrundlage mit mindestens 15 Zeichen."
      : missingLegal.length && publicLegal && !procurement
        ? "Bestätige die Prüfung für öffentliche Auftraggeber."
        : missingLegal.length && !legal
          ? "Bestätige die gemeinsame Versandprüfung."
          : !read || !dispatch
            ? "Bestätige die Versandfreigabe für die ausgewählten Mails."
            : "Bereit. Jetzt senden startet sofort, unabhängig vom Zeitplan.";
  function focusApproval() {
    requestAnimationFrame(() => {
      approvalRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      approvalRef.current?.focus({ preventScroll: true });
    });
  }
  async function reviewForSending(ids?: string[]) {
    if (ids?.length) {
      await preview(ids.slice(0, 200));
    } else if (rows.length) {
      setStep(2);
    } else if (selected.length) {
      await preview(selected);
    } else if (contactIds.length) {
      await prepareBatch();
    } else if (visible.length) {
      await preview(visible.slice(0, 200).map((d) => d.id));
    } else {
      setStep(1);
      setSelectionNotice(
        "Wähle zuerst Kontakte aus und bereite ihre Mails vor.",
      );
      return;
    }
    focusApproval();
  }
  async function submitMails(mode: "now" | "schedule") {
    setSendMode(mode);
    setResults([]);
    setSendProgress("");
    const items = chosen.map(({ id, version, hash, contactRevision }) => ({
      id,
      version,
      hash,
      contactRevision,
    }));
    const common = {
      confirmDispatch: true,
      read: true,
      ...(missingLegal.length
        ? {
            legal: {
              confirmed: true,
              rationale,
              procurementReviewed: procurement,
            },
          }
        : {}),
    };
    const completed: Result[] = [];
    try {
      if (mode === "now") {
        for (let index = 0; index < items.length; index++) {
          setSendProgress(
            `Mail ${index + 1} von ${items.length} wird versandt …`,
          );
          const data = await api("approve-and-send", {
            ...common,
            items: [items[index]],
          });
          completed.push(...data.results);
          setResults([...completed]);
          // Continue only for an explicit pre-send review rejection. Missing
          // metadata from older servers remains a conservative stop.
          if (data.results.some((r: Result) => !r.ok && r.stopBatch !== false))
            break;
        }
      } else {
        const data = await api("approve-and-enqueue", { ...common, items });
        completed.push(...data.results);
        setResults(completed);
      }
    } catch {
      throw new Error(
        "Versand unterbrochen. Bitte Versandhistorie prüfen, bevor du erneut sendest. Noch nicht bearbeitete Mails bleiben ausgewählt.",
      );
    } finally {
      setSendProgress(
        mode === "now"
          ? `${completed.length} von ${items.length} Mails bearbeitet.`
          : "",
      );
      setDispatch(false);
      setRead(false);
      setLegal(false);
      setIncluded((old) =>
        old.filter((id) => !completed.some((r) => r.id === id && r.ok)),
      );
      setScheduleRevision((v) => v + 1);
      if (mode === "schedule") setScheduleOpen(true);
      await refresh();
    }
  }
  async function run(work: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anfrage fehlgeschlagen.");
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  const [selectionNotice, setSelectionNotice] = useState("");
  function resetSelection() {
    setBatchProposals([]);
    setSelected([]);
    setContactIds([]);
    setRows([]);
    setIncluded([]);
    setRead(false);
    setDispatch(false);
    setLegal(false);
    setProcurement(false);
    setRationale("");
    setResults([]);
    setSkipped([]);
    setError("");
    setSearch("");
    setSendProgress("");
    setSelectionNotice("");
    setBatchSize(25);
    setPreparing(true);
    setStep(1);
  }
  async function selectReadyContacts(amount: number) {
    setBatchProposals([]);
    setRows([]);
    setIncluded([]);
    const ids = contactOptions.slice(0, amount).map((c) => c.id);
    setContactIds(ids);
    setSelected([]);
    setRead(false);
    setDispatch(false);
    setBatchSize(amount);
    setSelectionNotice(
      `${ids.length} Kontakte ausgewählt${ids.length < amount ? ` – im aktuellen Suchergebnis sind nur ${ids.length} verfügbar` : ""}. Vorhandene Entwürfe werden bei der Vorbereitung wiederverwendet.`,
    );
  }
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
  async function prepareBatch(
    ids: string[] = contactIds,
    excluded: string[] = [],
  ) {
    setSkipped(excluded);
    setRows([]);
    setIncluded([]);
    const previewData = await preparation("preview", { ids });
    const proposals: ContactPreparation[] = previewData.contacts;
    // Never infer verification from an email address alone. A mixed group
    // continues with unchanged, verified records; incomplete records and
    // unconfirmed suggestions stay out of the dispatch approval entirely.
    const eligible = proposals.filter((p) => p.ready && !p.changed);
    const deferred = proposals.filter((p) => !p.ready || p.changed);
    if (!eligible.length) {
      setBatchProposals(proposals);
      setRows([]);
      setIncluded([]);
      setStep(2);
      return;
    }
    setBatchProposals([]);
    const prepared = await preparation("prepare", {
      confirmed: true,
      contacts: eligible.map((r) => ({ id: r.id, revision: r.revision })),
    });
    const successful = prepared.results.filter(
      (r: Result & { draftId?: string }) => r.ok && r.draftId,
    );
    setSkipped([
      ...excluded,
      ...deferred.map(
        (p) =>
          `${p.organisation} · ${p.name}: ${p.changed ? "Vorgeschlagene Ergänzungen müssen zuerst bestätigt werden" : "Prüfangaben fehlen"} – zurückgestellt.`,
      ),
      ...prepared.results
        .filter((r: Result) => !r.ok)
        .map((r: Result) => r.message),
    ]);
    await refresh();
    if (!successful.length)
      throw new Error(
        "Keine Nachricht konnte vorbereitet werden. Die übrigen Kontakte bleiben unverändert.",
      );
    // Keep completed drafts usable even when a different contact failed.
    // Failed contacts are displayed separately and are never included in approval.
    // Existing drafts are reused if the user intentionally retries.
    // The remaining failures are shown above; only successful draft IDs enter preview.
    const draftIds = successful.map(
      (r: Result & { draftId: string }) => r.draftId,
    );
    const data = await api("preview", { ids: draftIds });
    setSelected(draftIds);
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
    setBatchProposals([]);
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
      <div className="panel mail-studio-workspace">
        <div className="mail-studio-toolbar">
          <h2>Persönliche Mails senden</h2>
          <button
            className="secondary"
            disabled={busy}
            onClick={resetSelection}
          >
            Auswahl zurücksetzen
          </button>
          <div className="actions" aria-label="Arbeitsschritte">
            <button
              className="secondary"
              disabled={busy}
              aria-pressed={step === 1}
              onClick={() => {
                setStep(1);
                setRead(false);
                setDispatch(false);
              }}
            >
              1 · Kontakte auswählen
            </button>
            <button
              className="secondary"
              disabled={busy}
              aria-pressed={step === 2}
              onClick={() => void run(() => reviewForSending())}
            >
              2 · Prüfen & senden
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setScheduleOpen(true);
                requestAnimationFrame(() =>
                  document
                    .getElementById("mail-schedule-title")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
            >
              Zeitplan & Versandstatus
            </button>
          </div>
          {step === 1 &&
            (visible.length > 0 || sendableQueuedIds.length > 0) && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    reviewForSending([
                      ...new Set([
                        ...visible.map((d) => d.id),
                        ...sendableQueuedIds,
                      ]),
                    ]),
                  )
                }
              >
                Alle jetzt senden (
                {Math.min(
                  200,
                  new Set([...visible.map((d) => d.id), ...sendableQueuedIds])
                    .size,
                )}
                ) →
              </button>
            )}
          {step === 1 &&
            (visible.length > 0 || sendableQueuedIds.length > 0) && (
              <p>
                Öffnet die gemeinsame Vorschau und Freigabe für bis zu 200
                Mails.
              </p>
            )}
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
            <h3>{contactIds.length} Kontakte ausgewählt</h3>
            <p>
              {contactOptions.length} Kontakte mit E-Mail-Adresse für die
              Auswahl verfügbar (ohne info@). Wähle die gewünschte Menge.
            </p>
            {candidates.length > 0 && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setPreparing(false)}
              >
                Gespeicherte Entwürfe öffnen ({candidates.length})
              </button>
            )}
            <label>
              Kontakte suchen
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <p>
              Wähle 25, 50 oder 100 Kontakte. Vorhandene Rechercheangaben werden
              automatisch übernommen und persönliche Mails vorbereitet. Die
              Auswahl gilt für das aktuelle Suchergebnis.
            </p>
            <div className="actions">
              {[25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="secondary"
                  disabled={busy || !contactOptions.length}
                  aria-pressed={batchSize === amount && contactIds.length > 0}
                  onClick={() => void run(() => selectReadyContacts(amount))}
                >
                  {amount} Kontakte auswählen
                </button>
              ))}
              <button
                disabled={busy || !contactIds.length || contactIds.length > 200}
                onClick={() => void run(() => prepareBatch())}
              >
                {busy
                  ? "Mails werden vorbereitet …"
                  : `${contactIds.length} persönliche Mails vorbereiten →`}
              </button>
            </div>
            {selectionNotice && <p role="status">{selectionNotice}</p>}
            <details>
              <summary>
                Auswahl einzeln anpassen ({contactIds.length} ausgewählt)
              </summary>
              {excludedInfoCount > 0 && (
                <p role="status">
                  {excludedInfoCount} info@-Adressen von der Auswahl
                  ausgeschlossen. Sie bleiben unter «Kontakte» gespeichert.
                </p>
              )}
              {missingEmailCount > 0 && (
                <p role="status">
                  {missingEmailCount} weitere Kontakte ohne gültige
                  E-Mail-Adresse bleiben unter «Kontakte» erhalten. Sie zählen
                  nicht zur Mengenauswahl.
                </p>
              )}
              {contactOptions.map((c) => (
                <label className="check mail-selection" key={c.id}>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={contactIds.includes(c.id)}
                    onChange={(e) => {
                      setRows([]);
                      setIncluded([]);
                      setSelected([]);
                      setRead(false);
                      setDispatch(false);
                      setContactIds((old) =>
                        e.target.checked
                          ? [...old, c.id]
                          : old.filter((id) => id !== c.id),
                      );
                    }}
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
              Diese Entwürfe sind bereits vorbereitet. Öffne die gewünschte
              Menge direkt zur gemeinsamen Freigabe.
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
                  preview(
                    selected.length
                      ? selected
                      : visible.slice(0, batchSize).map((d) => d.id),
                  ),
                )
              }
            >
              {busy
                ? "Mails werden geladen …"
                : `${selected.length || Math.min(batchSize, visible.length)} Mails gemeinsam freigeben →`}
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
                    onChange={(e) => {
                      setRows([]);
                      setIncluded([]);
                      setRead(false);
                      setDispatch(false);
                      setSelected((old) =>
                        e.target.checked
                          ? [...old, d.id]
                          : old.filter((id) => id !== d.id),
                      );
                    }}
                  />
                  <span>
                    {contacts.find((c) => c.id === d.contactId)?.organisation} ·{" "}
                    {d.versions[0].recipient}
                    <br />
                    {d.versions[0].subject} ·{" "}
                    {d.approvals.find((a) => a.version === d.version)
                      ?.status === "APPROVED"
                      ? "Freigegeben"
                      : "Zur Prüfung"}
                  </span>
                </label>
              ))}
              {!visible.length && (
                <p>
                  Noch keine passenden Entwürfe. Zuerst Kontakte vorbereiten.
                </p>
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
      </div>
      {step === 2 && batchProposals.length > 0 && (
        <div className="panel" style={{ padding: 24 }}>
          <p>
            <strong>
              {batchProposals.length} Kontakte bleiben ausgewählt.
            </strong>{" "}
          </p>
          <ContactPreparationEditor
            key={batchProposals.map((p) => `${p.id}:${p.revision}`).join("|")}
            initialProposals={batchProposals}
            refresh={refresh}
            requireComplete
            onDone={() => void run(() => prepareBatch())}
            onExclude={(ids) =>
              void run(async () => {
                const remaining = contactIds.filter((id) => !ids.includes(id));
                setContactIds(remaining);
                await prepareBatch(
                  remaining,
                  ids.map((id) => {
                    const contact = contacts.find((c) => c.id === id);
                    return `${contact?.organisation || id}: Angaben offen, bewusst zurückgestellt.`;
                  }),
                );
              })
            }
          />
        </div>
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
      {step === 2 && batchProposals.length === 0 && !rows.length && busy && (
        <p role="status">Persönliche Mails werden vorbereitet …</p>
      )}
      {step === 2 && batchProposals.length === 0 && rows.length > 0 && (
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
          <MailContentEditor
            count={chosen.length}
            disabled={busy}
            onApply={async (content) => {
              setBusy(true);
              setRead(false);
              setLegal(false);
              const previousIncluded = [...included];
              try {
                const data = await api("content", {
                  items: chosen.map((r) => ({ id: r.id, version: r.version })),
                  content,
                });
                await preview();
                setIncluded(previousIncluded);
                await refresh();
                if (data.results.some((r: Result) => !r.ok))
                  throw new Error(
                    data.results
                      .filter((r: Result) => !r.ok)
                      .map((r: Result) => r.message)
                      .join(" · "),
                  );
              } finally {
                setBusy(false);
              }
            }}
          />
          <button type="button" className="secondary" disabled={busy || !chosen.length} onClick={() => void run(async () => {
            const first = chosen[0];
            const result = await api("test", {confirmed:true, requestId:crypto.randomUUID(),draft:{id:first.id,version:first.version}});
            setSendProgress(result.message);
          })}>Erste Mail als Test an njeker@studiojeker.ch senden</button>
          <section
            id="mailstudio-send-approval"
            ref={approvalRef}
            tabIndex={-1}
            aria-label="Versandfreigabe"
          >
            {missingLegal.length > 0 && (
              <fieldset>
                <legend>
                  Gemeinsame Versandprüfung für {missingLegal.length}{" "}
                  ausgewählte Kontakte
                </legend>
                <p>
                  Eine gemeinsame Begründung verwenden, wenn sie für alle
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
                  Ich bestätige die Zulässigkeit und die angegebene Grundlage
                  für alle ausgewählten Kontakte mit offener Versandprüfung.
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
              Empfänger, Betreff und Signatur zum Versand frei.
            </label>
            <p id="mail-approval-hint" role="status">
              {approvalHint}
            </p>
            <p>Bitte diese Seite während des Sofortversands geöffnet lassen.</p>
            <div className="actions">
              <button
                disabled={!canApprove}
                aria-describedby="mail-approval-hint"
                onClick={() => void run(() => submitMails("now"))}
              >
                {busy && sendMode === "now"
                  ? "Versand läuft …"
                  : chosen.length > 1
                    ? `Alle ${chosen.length} jetzt senden`
                    : "Jetzt senden"}
              </button>
              <button
                className="secondary"
                disabled={!canApprove}
                onClick={() => void run(() => submitMails("schedule"))}
              >
                Nach Zeitplan einplanen
              </button>
            </div>
          </section>
          <details className="mail-preview-list" open={rows.length === 1}>
            <summary>
              Nachrichten ansehen oder Auswahl anpassen ({rows.length})
            </summary>
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
                  className="secondary"
                  disabled={
                    busy ||
                    !!r.issues.length ||
                    results.some((x) => x.id === r.id && x.ok)
                  }
                  onClick={() => {
                    setIncluded([r.id]);
                    setRead(false);
                    setDispatch(false);
                    setLegal(false);
                    focusApproval();
                  }}
                >
                  Nur diese Mail senden
                </button>
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
          </details>
          {sendProgress && <p role="status">{sendProgress}</p>}
          {results.length > 0 && (
            <div role="status">
              <p>
                {results.filter((r) => r.ok).length}{" "}
                {sendMode === "now"
                  ? "an Mailserver übergeben"
                  : "freigegeben und eingeplant"}
                {" · "}
                {included.length} noch offen.
              </p>
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    {rows.find((row) => row.id === r.id)?.recipient}:{" "}
                    {r.message}
                  </li>
                ))}
              </ul>
              <button className="secondary" onClick={resetSelection}>
                Weitere Mails vorbereiten
              </button>
            </div>
          )}
        </section>
      )}
      <details
        className="panel"
        open={scheduleOpen}
        onToggle={(e) => setScheduleOpen(e.currentTarget.open)}
      >
        <summary>Zeitplan, Warteschlange und Verlauf</summary>
        <MailSchedule
          key={scheduleRevision}
          drafts={drafts}
          openDraft={openDraft}
          compact={false}
          readyCount={candidates.length}
          onQueueChange={setQueuedIds}
          onSendableQueueChange={setSendableQueuedIds}
          reviewBusy={busy}
          onSendNow={(ids) => void run(() => reviewForSending(ids))}
        />
      </details>
    </section>
  );
}
