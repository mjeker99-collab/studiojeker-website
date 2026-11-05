"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import "./mailstudio-visual.css";
import MailPreview from "./MailPreview";
import { acquisitionAddressIssue } from "../lib/mail-address";
import ContactFilters from "./ContactFilters";
import MailAssistant from "./MailAssistant";
import {
  matchesContactFilters,
  emptyContactFilters,
  type ContactFilters as Filters,
} from "../lib/contact-filters";
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
  contactId?: string;
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
  persistenceKey,
  filters = emptyContactFilters,
  onFiltersChange,
  initialDraftIds = EMPTY_IDS,
  initialContactIds = EMPTY_IDS,
  onBusyChange,
  openContact,
  drafts,
  contacts,
  refresh,
  openDraft,
}: {
  persistenceKey?: string;
  filters?: Filters;
  onFiltersChange?: (value: Filters) => void;
  initialDraftIds?: string[];
  initialContactIds?: string[];
  onBusyChange?: (busy: boolean) => void;
  openContact?: (id: string) => void;
  drafts: Draft[];
  contacts: {
    id: string;
    organisation: string;
    industry?: string;
    status: string;
    replyOutcome?: string;
    archivedAt?: unknown;
    revision?: number;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  refresh: () => Promise<void>;
  openDraft: (id: string) => void;
}) {
  const operation = useRef(false);
  const selectionEpoch = useRef(0);
  const approvalRef = useRef<HTMLElement>(null);
  const preparationRef = useRef<HTMLDivElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [sendableQueuedIds, setSendableQueuedIds] = useState<string[]>([]);
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [dispatch, setDispatch] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [editingDirty, setEditingDirty] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardSnapshot, setDiscardSnapshot] = useState<
    { id: string; version: number }[]
  >([]);
  const [discardConfirmed, setDiscardConfirmed] = useState(false);
  const [discardNotice, setDiscardNotice] = useState("");
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
  const [deferredIds, setDeferredIds] = useState<string[]>([]);
  const [pendingDetails, setPendingDetails] = useState<
    Record<string, ContactPreparation>
  >({});
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [, setSkipped] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(true);
  const [batchSize, setBatchSize] = useState(25);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const matchingContacts = contacts.filter(
    (c) =>
      matchesContactFilters(c, filters) &&
      !drafts.some((d) => d.contactId === c.id && queuedIds.includes(d.id)) &&
      !c.archivedAt &&
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
    (c) => !acquisitionAddressIssue(c.email),
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
      matchesContactFilters(c, filters) &&
      !c.archivedAt &&
      !c.replyOutcome &&
      !["SENT", "REPLIED", "DO_NOT_CONTACT"].includes(c.status) &&
      d.versions[0] &&
      !acquisitionAddressIssue(c.email) &&
      !acquisitionAddressIssue(recipient)
    );
  });
  const visible = candidates.filter((d) =>
    `${d.versions[0].subject} ${d.versions[0].recipient} ${contacts.find((c) => c.id === d.contactId)?.organisation}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filteredQueuedIds = sendableQueuedIds.filter((id) => {
    const d = drafts.find((d) => d.id === id);
    const c = contacts.find((c) => c.id === d?.contactId);
    return (
      c &&
      matchesContactFilters(c, filters) &&
      `${c.organisation} ${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const readyRows = rows.filter(
    (r) => !r.issues.length && !results.some((x) => x.id === r.id && x.ok),
  );
  const chosen = readyRows.filter((r) => included.includes(r.id));
  const contactIdFor = (r: Row) =>
    r.contactId ||
    drafts.find((d) => d.id === r.id)?.contactId ||
    contacts.find((c) => c.email === r.recipient)?.id ||
    "";
  const openIds = [
    ...new Set([
      ...deferredIds,
      ...rows.filter((r) => r.issues.length).map(contactIdFor),
    ]),
  ].filter(Boolean);
  const pendingIds = deferredIds.filter(
    (id) => !rows.some((r) => contactIdFor(r) === id),
  );
  function removeFromBatch(ids: string[]) {
    selectionEpoch.current++;
    const removedDrafts = rows
      .filter((r) => ids.includes(contactIdFor(r)))
      .map((r) => r.id);
    setContactIds((old) => old.filter((id) => !ids.includes(id)));
    setDeferredIds((old) => old.filter((id) => !ids.includes(id)));
    setBatchProposals((old) => old.filter((p) => !ids.includes(p.id)));
    setSelected((old) => old.filter((id) => !removedDrafts.includes(id)));
    setRows((old) => old.filter((r) => !removedDrafts.includes(r.id)));
    setIncluded((old) => old.filter((id) => !removedDrafts.includes(id)));
    setRead(false);
    setDispatch(false);
    setLegal(false);
    setSkipped([]);
  }
  const missingLegal = chosen.filter((r) => r.needsLegal);
  const publicLegal = missingLegal.some((r) => r.publicAuthority);
  const canApprove =
    chosen.length > 0 &&
    read &&
    dispatch &&
    !busy &&
    !editingDirty &&
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
        : !read || !dispatch || (missingLegal.length && !legal)
          ? "Bestätige die Versandfreigabe für die ausgewählten Mails."
          : "Die Warteschlange wird gestartet. Versandzeiten und Tageslimit bleiben gültig.";
  const activeRow = rows.find((r) => r.id === activeId) || rows[0];
  useEffect(() => {
    onBusyChange?.(busy || editingDirty);
  }, [busy, editingDirty, onBusyChange]);
  function focusApproval() {
    requestAnimationFrame(() => {
      document.getElementById("mail-workbench")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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
      setSendProgress("Mails werden sicher in die Warteschlange übernommen …");
      const data = await api(
        mode === "now" ? "approve-and-start" : "approve-and-enqueue",
        { ...common, items },
      );
      completed.push(...data.results);
      setResults(completed);
      if (data.notice) setError(data.notice);
    } catch {
      throw new Error(
        "Versand unterbrochen. Bitte Versandhistorie prüfen, bevor du erneut sendest. Noch nicht bearbeitete Mails bleiben ausgewählt.",
      );
    } finally {
      setSendProgress(
        mode === "now"
          ? `${completed.filter((r) => r.ok).length} Mails eingeplant. Der Versand läuft im Hintergrund innerhalb der Versandzeiten und des Tageslimits.`
          : "",
      );
      setDispatch(false);
      setRead(false);
      setLegal(false);
      setIncluded((old) =>
        old.filter((id) => !completed.some((r) => r.id === id && r.ok)),
      );
      setScheduleRevision((v) => v + 1);
      setScheduleOpen(true);
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
    selectionEpoch.current++;
    setDeferredIds([]);
    setRecipientSearch("");
    setDiscardOpen(false);
    setDiscardConfirmed(false);
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
    onFiltersChange?.(emptyContactFilters);
    setSendProgress("");
    setSelectionNotice("");
    setBatchSize(25);
    setPreparing(true);
    setStep(1);
  }
  const discardItems = drafts
    .filter((d) =>
      rows.length
        ? included.includes(d.id)
        : selected.length
          ? selected.includes(d.id)
          : contactIds.includes(d.contactId),
    )
    .map(({ id, version }) => ({ id, version }));
  async function discardSelection() {
    if (!discardConfirmed) return;
    const data = discardSnapshot.length
      ? await api("discard", { confirmed: true, items: discardSnapshot })
      : { results: [] as Result[] };
    const failed = data.results.filter((r: Result) => !r.ok);
    resetSelection();
    setDiscardNotice(
      `${data.results.filter((r: Result) => r.ok).length} Entwürfe verworfen. Auswahl zurückgesetzt. Kontakte bleiben erhalten.${failed.length ? ` ${failed.length} Entwürfe geschützt: ${[...new Set(failed.map((r: Result) => r.message))].join(" ")}` : ""}`,
    );
    setScheduleRevision((v) => v + 1);
    await refresh();
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
    setPendingDetails(Object.fromEntries(proposals.map((p) => [p.id, p])));
    // Never infer verification from an email address alone. A mixed group
    // continues with unchanged, verified records; incomplete records and
    // unconfirmed suggestions stay out of the dispatch approval entirely.
    const eligible = proposals.filter((p) => p.ready && !p.changed);
    const deferred = proposals.filter((p) => !p.ready || p.changed);
    setDeferredIds(deferred.map((p) => p.id));
    if (!eligible.length) {
      setBatchProposals([]);
      setRows([]);
      setIncluded([]);
      setStep(2);
      requestAnimationFrame(() => {
        preparationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        preparationRef.current?.focus({ preventScroll: true });
      });
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
    setDeferredIds([
      ...deferred.map((p) => p.id),
      ...prepared.results.filter((r: Result) => !r.ok).map((r: Result) => r.id),
    ]);
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
    if (!successful.length) {
      setStep(2);
      return;
    }
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
    focusApproval();
  }
  async function editOpenContacts(onlyIds?: string[]) {
    const issueIds = rows
      .filter((r) => r.issues.length)
      .flatMap((r) => {
        return contactIdFor(r) ? [contactIdFor(r)] : [];
      });
    const ids = onlyIds ?? [...new Set([...deferredIds, ...issueIds])];
    if (!ids.length) return;
    const data = await preparation("preview", { ids });
    setBatchProposals(data.contacts);
    setRead(false);
    setDispatch(false);
    setLegal(false);
    requestAnimationFrame(() =>
      preparationRef.current?.scrollIntoView({ block: "start" }),
    );
  }
  async function completeOpenContacts(ids = batchProposals.map((p) => p.id)) {
    // Keep existing drafts and exclusions while adding newly completed contacts.
    const previousRows = rows;
    const previousIncluded = included;
    const data = await preparation("preview", { ids });
    const proposals: ContactPreparation[] = data.contacts;
    setPendingDetails((old) => ({
      ...old,
      ...Object.fromEntries(proposals.map((p) => [p.id, p])),
    }));
    const eligible = proposals.filter((p) => p.ready && !p.changed);
    const remaining = proposals.filter((p) => !p.ready || p.changed);
    const prepared = eligible.length
      ? await preparation("prepare", {
          confirmed: true,
          contacts: eligible.map((p) => ({ id: p.id, revision: p.revision })),
        })
      : { results: [] };
    const successful = prepared.results.filter(
      (r: Result & { draftId?: string }) => r.ok && r.draftId,
    );
    const failedIds = prepared.results
      .filter((r: Result) => !r.ok)
      .map((r: Result) => r.id);
    setDeferredIds([...remaining.map((p) => p.id), ...failedIds]);
    setSkipped([
      ...remaining.map(
        (p) =>
          `${p.organisation}: ${p.issues.join(" · ") || "Ergänzungen bestätigen"}`,
      ),
      ...prepared.results
        .filter((r: Result) => !r.ok)
        .map((r: Result) => r.message),
    ]);
    const allIds = [
      ...new Set([
        ...previousRows.map((r) => r.id),
        ...successful.map((r: Result & { draftId: string }) => r.draftId),
      ]),
    ];
    if (allIds.length) {
      const review = await api("preview", { ids: allIds });
      setRows(review.rows);
      setSelected(allIds);
      setIncluded(
        review.rows
          .filter(
            (r: Row) =>
              !r.issues.length &&
              (previousIncluded.includes(r.id) ||
                !previousRows.some(
                  (old) => old.id === r.id && !old.issues.length,
                )) &&
              !results.some((result) => result.id === r.id && result.ok),
          )
          .map((r: Row) => r.id),
      );
    }
    setBatchProposals([]);
    setRead(false);
    setDispatch(false);
    setLegal(false);
    await refresh();
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
  const previousInitialContacts = useRef(initialContactIds);
  useEffect(() => {
    const wasSelected = previousInitialContacts.current.length > 0;
    previousInitialContacts.current = initialContactIds;
    if (!initialContactIds.length && !wasSelected) return;
    Promise.resolve().then(() => {
      setContactIds(initialContactIds);
      setSelected([]);
      setRows([]);
      setIncluded([]);
      setRead(false);
      setDispatch(false);
      setLegal(false);
      setPreparing(true);
      setStep(1);
      setSelectionNotice(
        `${initialContactIds.length} Kontakte aus deiner Liste ausgewählt.`,
      );
    });
  }, [initialContactIds]);
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
  // Persist work IDs, never approvals. Reload always obtains current server versions.
  const [restored, setRestored] = useState(false);
  const restoreWork = useEffectEvent(async () => {
    try {
      if (!persistenceKey || initialContactIds.length || initialDraftIds.length)
        return;
      const saved = JSON.parse(localStorage.getItem(persistenceKey) || "null");
      if (!saved) return;
      const known = new Set(
        contacts.filter((c) => !c.archivedAt).map((c) => c.id),
      );
      const ids: string[] = Array.isArray(saved.contacts)
        ? saved.contacts.filter((id: string) => known.has(id)).slice(0, 200)
        : [];
      setContactIds(ids);
      if (
        saved.step === 2 &&
        Array.isArray(saved.drafts) &&
        saved.drafts.length
      ) {
        await preview(saved.drafts.slice(0, 200));
        setIncluded(Array.isArray(saved.included) ? saved.included : []);
        setDeferredIds(
          Array.isArray(saved.deferred)
            ? saved.deferred.filter((id: string) => known.has(id))
            : [],
        );
      } else if (saved.step === 2 && ids.length) await prepareBatch(ids);
    } catch {
      setError(
        "Gespeicherte Auswahl konnte nicht vollständig geladen werden. Kontakte oder Entwürfe erneut öffnen.",
      );
    } finally {
      setRestored(true);
    }
  });
  useEffect(() => {
    void Promise.resolve().then(() => restoreWork());
  }, [persistenceKey]);
  useEffect(() => {
    if (!restored || !persistenceKey || busy) return;
    try {
      localStorage.setItem(
        persistenceKey,
        JSON.stringify({
          contacts: contactIds,
          drafts: rows.map((r) => r.id),
          included,
          deferred: deferredIds,
          step,
        }),
      );
    } catch {
      /* Private browsing can disable storage; server drafts remain durable. */
    }
  }, [
    restored,
    persistenceKey,
    busy,
    contactIds,
    rows,
    included,
    deferredIds,
    step,
  ]);
  const reconcile = useEffectEvent(async () => {
    if (busy || editingDirty) return;
    const epoch = selectionEpoch.current;
    const known = new Set(
      contacts.filter((c) => !c.archivedAt).map((c) => c.id),
    );
    setContactIds((old) => old.filter((id) => known.has(id)));
    setDeferredIds((old) => old.filter((id) => known.has(id)));
    setBatchProposals((old) => old.filter((p) => known.has(p.id)));
    const retained = rows.filter((r) => known.has(contactIdFor(r)));
    if (!retained.length) {
      if (rows.length) {
        setRows([]);
        setIncluded([]);
        setSelected([]);
        setRead(false);
        setDispatch(false);
      }
      return;
    }
    try {
      const data = await api("preview", { ids: retained.map((r) => r.id) });
      if (epoch !== selectionEpoch.current) return;
      // A version/content/contact change invalidates the visible approval.
      if (JSON.stringify(data.rows) !== JSON.stringify(rows)) {
        setRows(data.rows);
        setRead(false);
        setDispatch(false);
        setLegal(false);
        setIncluded((old) =>
          old.filter((id) =>
            data.rows.some((r: Row) => r.id === id && !r.issues.length),
          ),
        );
      }
    } catch {
      setRead(false);
      setDispatch(false);
      setError(
        "Aktuellen Stand bitte neu laden. Deine Entwürfe bleiben gespeichert.",
      );
    }
  });
  useEffect(() => {
    void Promise.resolve().then(() => reconcile());
  }, [contacts, drafts, busy]);
  return (
    <section className="mail-studio" aria-label="Mail-Studio" aria-busy={busy}>
      <div className="panel mail-studio-workspace">
        <div className="mail-studio-toolbar">
          <h2>Persönliche Mails erstellen &amp; versenden</h2>
          <div className="actions" aria-label="Arbeitsschritte">
            <button
              className="secondary"
              disabled={busy || editingDirty}
              aria-pressed={step === 1}
              onClick={() => {
                setStep(1);
                setRead(false);
                setDispatch(false);
              }}
            >
              Empfänger & Entwürfe
            </button>
            <button
              className="secondary"
              disabled={
                busy ||
                editingDirty ||
                (!rows.length &&
                  !selected.length &&
                  !contactIds.length &&
                  !visible.length)
              }
              aria-pressed={step === 2}
              onClick={() => void run(() => reviewForSending())}
            >
              Vorschau & Versand
            </button>
            <details>
              <summary>Weitere Optionen</summary>
              <button
                className="secondary"
                disabled={busy || editingDirty}
                onClick={resetSelection}
              >
                Auswahl zurücksetzen
              </button>
              <button
                className="secondary"
                disabled={
                  busy ||
                  editingDirty ||
                  (!contactIds.length && !selected.length)
                }
                onClick={() => {
                  setDiscardSnapshot(discardItems);
                  setDiscardOpen(true);
                  setDiscardConfirmed(false);
                  setDiscardNotice("");
                }}
              >
                Auswahl und ungesendete Entwürfe verwerfen
              </button>
              <button
                className="secondary"
                disabled={busy || editingDirty}
                onClick={() => {
                  setScheduleOpen(true);
                  requestAnimationFrame(() =>
                    document
                      .getElementById("mail-schedule-title")
                      ?.scrollIntoView({ block: "start" }),
                  );
                }}
              >
                Zeitplan & Versandstatus
              </button>
            </details>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        {discardNotice && <p role="status">{discardNotice}</p>}
        {discardOpen && (
          <section className="panel" aria-label="Entwürfe verwerfen">
            <h3>{discardSnapshot.length} ausgewählte Entwürfe verwerfen?</h3>
            <p>
              Die ausgewählten ungesendeten Entwürfe werden gelöscht und aus
              einem allfälligen Zeitplan genommen. Kontakte und Rechercheangaben
              bleiben erhalten. Entwürfe mit Versandversuchen bleiben geschützt.
              Das Löschen kann nicht rückgängig gemacht werden.
            </p>
            <label className="check">
              <input
                type="checkbox"
                disabled={busy}
                checked={discardConfirmed}
                onChange={(e) => setDiscardConfirmed(e.target.checked)}
              />
              Ich bestätige das Verwerfen dieser Auswahl und der ungesendeten
              Entwürfe.
            </label>
            <div className="actions">
              <button
                disabled={
                  busy || !discardConfirmed || discardSnapshot.length > 200
                }
                onClick={() => void run(discardSelection)}
              >
                Auswahl jetzt verwerfen
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setDiscardOpen(false);
                  setDiscardConfirmed(false);
                }}
              >
                Abbrechen
              </button>
            </div>
            {discardSnapshot.length > 200 && (
              <p>Bitte höchstens 200 Entwürfe auf einmal auswählen.</p>
            )}
          </section>
        )}
        {step === 1 && preparing && (
          <section
            className="panel"
            aria-label="Kontakte im Mail-Studio vorbereiten"
          >
            <details>
              <summary>Nach Unternehmen oder Branche filtern</summary>
              <ContactFilters
                contacts={contacts}
                value={filters}
                disabled={busy}
                onChange={(value) => {
                  onFiltersChange?.(value);
                  setContactIds([]);
                  setSelected([]);
                  setRows([]);
                  setIncluded([]);
                }}
              />
            </details>
            <h3>{contactIds.length} Kontakte ausgewählt</h3>
            <button
              disabled={busy || !contactIds.length || contactIds.length > 200}
              onClick={() => void run(() => reviewForSending())}
            >
              {busy
                ? "Mails werden vorbereitet …"
                : `${contactIds.length} Mails erstellen →`}
            </button>
            <p>
              Die persönlichen Entwürfe erscheinen anschliessend in der
              Vorschau.
            </p>
            <p>
              {contactOptions.length} Kontakte mit E-Mail-Adresse für die
              Auswahl verfügbar (ohne info@). Wähle die gewünschte Menge.
            </p>
            {(candidates.length > 0 || filteredQueuedIds.length > 0) && (
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      reviewForSending([
                        ...new Set([
                          ...visible.map((d) => d.id),
                          ...filteredQueuedIds,
                        ]),
                      ]),
                    )
                  }
                >
                  Gespeicherte Entwürfe öffnen (
                  {
                    new Set([...visible.map((d) => d.id), ...filteredQueuedIds])
                      .size
                  }
                  )
                </button>
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() => setPreparing(false)}
                >
                  Entwürfe auswählen
                </button>
              </div>
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
              für persönliche Mails verwendet. Die Auswahl gilt für das aktuelle
              Suchergebnis.
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
                : `${selected.length || Math.min(batchSize, visible.length)} Entwürfe öffnen →`}
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
      {step === 2 && batchProposals.length === 0 && (
        <>
          {(deferredIds.length > 0 || rows.some((r) => r.issues.length)) && (
            <div className="mail-open-notice">
              <p>
                {openIds.length} Kontakte mit offenen Angaben.
                {chosen.length
                  ? " Bereite Mails können separat versendet werden."
                  : "Ergänze die Angaben, um Mails freizugeben."}
              </p>
              <button
                className={chosen.length ? "secondary" : undefined}
                disabled={busy || editingDirty}
                onClick={() => void run(() => editOpenContacts())}
              >
                Offene Angaben bearbeiten
              </button>
            </div>
          )}
        </>
      )}
      {step === 2 && batchProposals.length > 0 && (
        <div
          className="panel"
          style={{ padding: 24 }}
          ref={preparationRef}
          tabIndex={-1}
        >
          <p>
            <strong>
              {batchProposals.length} Kontakte bleiben ausgewählt.
            </strong>{" "}
          </p>
          {rows.length > 0 && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setBatchProposals([])}
            >
              Zurück zur Mailvorschau
            </button>
          )}
          <ContactPreparationEditor
            key={batchProposals.map((p) => `${p.id}:${p.revision}`).join("|")}
            initialProposals={batchProposals}
            refresh={refresh}
            requireComplete
            onDone={() => void run(completeOpenContacts)}
            onExclude={removeFromBatch}
          />
        </div>
      )}
      {step === 2 &&
        !rows.length &&
        !pendingIds.length &&
        !batchProposals.length &&
        !busy && (
          <div className="panel">
            <p>
              Keine Mails in diesem Vorgang. Deine Kontakte und gespeicherten
              Entwürfe bleiben erhalten.
            </p>
            <button onClick={resetSelection}>Kontakte auswählen</button>
          </div>
        )}
      {step === 2 && !rows.length && busy && (
        <p role="status">Persönliche Mails werden vorbereitet …</p>
      )}
      {step === 2 &&
        batchProposals.length === 0 &&
        (rows.length > 0 || pendingIds.length > 0) && (
          <section className="panel" aria-label="Globale Mailprüfung">
            <h3>Mails prüfen und versenden</h3>
            <p>
              <strong>
                {readyRows.length} Mails bereit · {openIds.length} Angaben offen
                · {chosen.length} ausgewählt
              </strong>
            </p>
            <div className="mail-workbench" id="mail-workbench">
              <nav className="mail-recipient-list" aria-label="Mail-Empfänger">
                <div className="mail-selection-toolbar">
                  <label>
                    Ansicht
                    <select
                      value={recipientFilter}
                      onChange={(e) => setRecipientFilter(e.target.value)}
                    >
                      <option value="all">
                        Alle ({rows.length + pendingIds.length})
                      </option>
                      <option value="ready">Bereit ({readyRows.length})</option>
                      <option value="open">
                        Angaben offen ({openIds.length})
                      </option>
                    </select>
                  </label>
                  <label>
                    Empfänger suchen
                    <input
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      className="secondary"
                      disabled={busy || editingDirty}
                      onClick={() => {
                        setIncluded(
                          rows
                            .filter(
                              (r) =>
                                !r.issues.length &&
                                !results.some((x) => x.id === r.id && x.ok),
                            )
                            .map((r) => r.id),
                        );
                        setRead(false);
                        setDispatch(false);
                        setLegal(false);
                      }}
                    >
                      Alle versandbereiten auswählen
                    </button>
                    <button
                      className="quiet"
                      disabled={busy || editingDirty}
                      onClick={() => {
                        setIncluded([]);
                        setRead(false);
                        setDispatch(false);
                        setLegal(false);
                      }}
                    >
                      Auswahl aufheben
                    </button>
                  </div>
                  <small>
                    {chosen.length} von {readyRows.length} versandbereiten Mails
                    ausgewählt · Auswahl gilt für die ganze Liste
                  </small>
                </div>
                {pendingIds
                  .filter(() => recipientFilter !== "ready")
                  .filter((id) => {
                    const c = contacts.find((c) => c.id === id);
                    return `${c?.organisation} ${c?.email}`
                      .toLowerCase()
                      .includes(recipientSearch.toLowerCase());
                  })
                  .map((id) => {
                    const c = contacts.find((c) => c.id === id);
                    const p = pendingDetails[id];
                    return (
                      <div className="mail-recipient mail-pending" key={id}>
                        <strong>
                          {c?.organisation ||
                            p?.organisation ||
                            "Kontakt nicht mehr vorhanden"}
                        </strong>
                        <span>{c?.email || p?.email}</span>
                        <small>
                          {p?.issues.join(" · ") ||
                            "Rechercheangaben bestätigen"}
                        </small>
                        <button
                          className="secondary"
                          disabled={busy || editingDirty}
                          onClick={() => void run(() => editOpenContacts([id]))}
                        >
                          Angaben bearbeiten
                        </button>
                        <button
                          className="quiet"
                          disabled={busy || editingDirty}
                          onClick={() => removeFromBatch([id])}
                        >
                          Aus diesem Versand entfernen
                        </button>
                      </div>
                    );
                  })}
                {rows
                  .filter(
                    (r) =>
                      recipientFilter === "all" ||
                      (recipientFilter === "open"
                        ? !!r.issues.length
                        : !r.issues.length),
                  )
                  .filter((r) =>
                    `${r.organisation} ${r.recipient}`
                      .toLowerCase()
                      .includes(recipientSearch.toLowerCase()),
                  )
                  .map((r) => (
                    <div key={r.id} className="mail-recipient">
                      <input
                        type="checkbox"
                        aria-label={`${r.recipient} für Versand auswählen`}
                        disabled={
                          busy ||
                          editingDirty ||
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
                          setDispatch(false);
                          setLegal(false);
                        }}
                      />
                      <button
                        className="quiet"
                        aria-current={
                          activeRow?.id === r.id ? "true" : undefined
                        }
                        disabled={busy || editingDirty}
                        onClick={() => setActiveId(r.id)}
                      >
                        <strong>{r.organisation}</strong>
                        <span>{r.recipient}</span>
                        <small>
                          {r.issues.length
                            ? "Angaben ergänzen"
                            : results.some((x) => x.id === r.id && x.ok)
                              ? "Erledigt"
                              : "Bereit"}
                        </small>
                      </button>
                      <button
                        className="quiet mail-remove"
                        disabled={busy || editingDirty}
                        onClick={() => removeFromBatch([contactIdFor(r)])}
                      >
                        Aus diesem Versand entfernen
                      </button>
                    </div>
                  ))}
              </nav>
              {!activeRow && (
                <div className="mail-preview-pane">
                  <h3>Angaben offen</h3>
                  <p>
                    Wähle links einen Kontakt zum Bearbeiten. Du kannst jeden
                    Kontakt aus diesem Versand entfernen; er bleibt in deiner
                    Kontaktliste.
                  </p>
                </div>
              )}
              {activeRow && (
                <div className="mail-preview-pane">
                  <MailPreview
                    key={activeRow.id}
                    message={activeRow}
                    disabled={
                      busy || results.some((x) => x.id === activeRow.id && x.ok)
                    }
                    onDirty={(dirty) => {
                      setEditingDirty(dirty);
                      setRead(false);
                      setDispatch(false);
                      setLegal(false);
                    }}
                    onSave={async (value) => {
                      setBusy(true);
                      try {
                        const response = await fetch(
                          `/api/drafts/${activeRow.id}`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              version: activeRow.version,
                              ...value,
                            }),
                          },
                        );
                        const result = await response.json();
                        if (!response.ok)
                          throw new Error(
                            result.error || "Speichern fehlgeschlagen.",
                          );
                        const keep = [...included];
                        await preview(rows.map((r) => r.id));
                        setIncluded(keep);
                        setEditingDirty(false);
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  {activeRow.issues.length > 0 && (
                    <div className="error">
                      <ul>
                        {activeRow.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                      <button
                        className="secondary"
                        disabled={busy || editingDirty}
                        onClick={() => {
                          const draft = drafts.find(
                            (d) => d.id === activeRow.id,
                          );
                          if (draft) openContact?.(draft.contactId);
                        }}
                      >
                        Kontakt ergänzen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <details>
              <summary>Texte mit KI überarbeiten</summary>
              <MailAssistant
                onBusyChange={setBusy}
                mode="WRITE"
                expanded
                disabled={busy || editingDirty}
                items={chosen.map((r) => ({ id: r.id, version: r.version }))}
                refresh={async () => {
                  const keep = [...included];
                  setRead(false);
                  setDispatch(false);
                  setLegal(false);
                  await preview(rows.map((r) => r.id));
                  setIncluded(keep);
                  await refresh();
                }}
              />
            </details>
            <details>
              <summary>Bilder oder Links für alle Mails ergänzen</summary>
              <MailContentEditor
                count={chosen.length}
                disabled={busy || editingDirty}
                onApply={async (content) => {
                  setBusy(true);
                  setRead(false);
                  setLegal(false);
                  const previousIncluded = [...included];
                  try {
                    const data = await api("content", {
                      items: chosen.map((r) => ({
                        id: r.id,
                        version: r.version,
                      })),
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
            </details>
            <button
              type="button"
              className="secondary"
              disabled={busy || editingDirty || !chosen.length}
              onClick={() =>
                void run(async () => {
                  const first = chosen[0];
                  const result = await api("test", {
                    confirmed: true,
                    requestId: crypto.randomUUID(),
                    draft: { id: first.id, version: first.version },
                  });
                  setSendProgress(result.message);
                })
              }
            >
              Erste Mail als Test an njeker@studiojeker.ch senden
            </button>
            {chosen.length > 0 && (
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
                  </fieldset>
                )}
                <div className="mail-approval-bar">
                  <label className="check">
                    <input
                      type="checkbox"
                      disabled={busy || editingDirty || !chosen.length}
                      checked={
                        read && dispatch && (!missingLegal.length || legal)
                      }
                      onChange={(e) => {
                        setRead(e.target.checked);
                        setDispatch(e.target.checked);
                        setLegal(e.target.checked);
                      }}
                    />
                    Ich gebe die {chosen.length} ausgewählten persönlichen Mails
                    mit Empfänger, Betreff und Signatur zum Versand frei.
                    {missingLegal.length > 0 &&
                      " Ich bestätige die Zulässigkeit und die oben angegebene Grundlage für diese Kontakte."}
                  </label>
                  <p id="mail-approval-hint" role="status">
                    {approvalHint}
                  </p>
                  <p>
                    Der Versand läuft im Hintergrund. Du kannst die Seite danach
                    schliessen. «Versand starten» aktiviert die Warteschlange;
                    Versandzeiten und Tageslimit gelten weiterhin.
                  </p>
                  <div className="actions">
                    <button
                      disabled={!canApprove}
                      aria-describedby="mail-approval-hint"
                      onClick={() => void run(() => submitMails("now"))}
                    >
                      {busy && sendMode === "now"
                        ? "Versand läuft …"
                        : chosen.length === 1
                          ? "Versand starten · 1 Mail"
                          : `Versand starten · ${chosen.length} Mails`}
                    </button>
                    <button
                      className="secondary"
                      disabled={!canApprove}
                      onClick={() => void run(() => submitMails("schedule"))}
                    >
                      Versand planen
                    </button>
                  </div>
                </div>
              </section>
            )}
            {sendProgress && <p role="status">{sendProgress}</p>}
            {results.length > 0 && (
              <div role="status">
                <p>
                  {results.filter((r) => r.ok).length}{" "}
                  {sendMode === "now"
                    ? "in die Versandwarteschlange übernommen"
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
