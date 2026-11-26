"use client";
import ContactFilters from "./ContactFilters";
import {
  workspaceGroups,
  workspaceGroup,
  workspaceLabel,
} from "../lib/workspace-navigation";
import "./studioone-simple.css";
import {
  matchesContactFilters,
  emptyContactFilters,
} from "../lib/contact-filters";
import MailContentEditor from "./MailContentEditor";
import { appendMailContent } from "../lib/mail-content";
import { signedMessage } from "../lib/mail-signature";
import "./studioone-workspaces.css";
import "./studioone-area-intro.css";
import "./studioone-design-system.css";
import ContactReply from "./ContactReply";
import { replyLabels } from "../lib/contact-reply-input";
import MailSchedule from "./MailSchedule";
import GoogleReconnectNotice from "./GoogleReconnectNotice";
import MailStudio from "./MailStudio";
import AcquisitionWizard from "./AcquisitionWizard";
import MailAssistant from "./MailAssistant";
import { LeadResearchPanel } from "./LeadResearchPanel";
import { contactStage, contactStageLabels } from "../lib/contact-stage";
import "./acquisition.css";
import Hub from "./hub/Hub";
import Dashboard, { type DashboardTarget } from "./Dashboard";
import Website from "./cms/Website";
import Concepts from "./concepts/Concepts";
import Customers from "./customers/Customers";
import Image from "next/image";
import Library from "./library/Library";
import ContentStudio from "./studio/ContentStudio";
import AssistantEntry from "./studio/AssistantEntry";
import { routeMarketingTask, type TaskDestination } from "../lib/task-routing";
import { useEffect, useState, type FormEvent } from "react";
import type {
  Contact,
  Draft,
  DraftVersion,
  Approval,
  Delivery,
  Suppression,
  Audit,
  LegalReview,
} from "@prisma/client";
type C = Omit<Contact, "verifiedAt" | "createdAt" | "updatedAt"> & {
  verifiedAt: string | null;
  legalReviews: LegalReview[];
};
type D = Draft & {
  versions: (DraftVersion & { signatureCurrent: boolean })[];
  approvals: (Approval & { user: { name: string } })[];
};
type State = {
  user: { id: string; name: string };
  users: { id: string; name: string }[];
  contacts: C[];
  drafts: D[];
  deliveries: Delivery[];
  suppressions: Suppression[];
  audits: (Audit & { user: { name: string } })[];
  generator: string;
  externalSending: boolean;
  mailMode: string;
  smtpPort: number | null;
  smtpSecure: boolean;
};
const acquisitionTabs = [
  "Kontakte finden",
  "Mail-Studio",
  "Kontakte",
  "E-Mail-Entwürfe",
  "Freigaben",
  "Versandhistorie",
];
const labels: Record<string, string> = {
  NEW: "Neu",
  VERIFIED: "Verifiziert",
  DRAFT: "Entwurf",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  SEND_READY: "Versandbereit",
  SENT: "Versandt",
  REPLIED: "Beantwortet",
  FAILED: "Fehler",
  DO_NOT_CONTACT: "Gesperrt",
  PENDING: "In Prüfung",
  INVALIDATED: "Ungültig",
  SIMULATED: "Lokal simuliert",
  BLOCKED: "Blockiert",
  SENDING: "Versand reserviert",
  UNKNOWN: "Zustellung unklar · keine Wiederholung",
  TEST_SENT: "Intern versandt",
};
const empty = {
  organisation: "",
  industry: "",
  region: "",
  firstName: "",
  lastName: "",
  position: "",
  email: "",
  website: "",
  sourceUrl: "",
  verifiedAt: "",
  confidence: "UNCONFIRMED",
  hook: "",
  service: "",
  legalCategory: "UNASSESSED",
  publicAuthority: false,
  newsletterConsent: false,
  newsletterEvidence: "",
  owner: "",
  notes: "",
};
type ContactForm = typeof empty;
const date = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleString("de-CH", { timeZone: "Europe/Zurich" })
    : "–";
function Badge({ value }: { value: string }) {
  return <span className={`badge b-${value}`}>{labels[value] ?? value}</span>;
}
function AppLogo() {
  return (
    <div className="wordmark app-brand">
      <Image
        src="/brand/logo?v=3"
        alt="STUDIOONE – Dein Marketing. Ein Ort."
        width={1280}
        height={593}
        unoptimized
        priority
      />
    </div>
  );
}
export default function App() {
  const [contactFilters, setContactFilters] = useState(emptyContactFilters);
  const [data, setData] = useState<State | null>(null),
    [loaded, setLoaded] = useState(false),
    [conceptDirty, setConceptDirty] = useState(false),
    [tab, setTab] = useState("Übersicht"),
    [acquisitionWizard, setAcquisitionWizard] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState<C | null>(null),
    [showContact, setShowContact] = useState(false),
    [form, setForm] = useState<ContactForm>(empty),
    [draft, setDraft] = useState<D | null>(null),
    [version, setVersion] = useState(1),
    [message, setMessage] = useState({ recipient: "", subject: "", body: "" }),
    [read, setRead] = useState(false),
    [rationale, setRationale] = useState(""),
    [procurement, setProcurement] = useState(false),
    [dispatchConfirm, setDispatchConfirm] = useState(false);
  const [dashboardTarget, setDashboardTarget] =
    useState<DashboardTarget | null>(null);
  const [assistantCampaign, setAssistantCampaign] = useState<{
    id: string;
    request: number;
  }>();
  const [lastWorkspace, setLastWorkspace] = useState<
    Record<string, DashboardTarget>
  >({});
  const [projectRevision, setProjectRevision] = useState(0);
  const [dashboardTask, setDashboardTask] = useState<{
    prompt: string;
    section:
      | "Kampagnen"
      | "Social Media"
      | "Website"
      | "Newsletter"
      | "Content-Studio";
    request: number;
  } | null>(null);
  function startDashboardTask(prompt: string, section: string) {
    const destination: TaskDestination =
      section === "auto"
        ? routeMarketingTask(prompt)
        : (section as TaskDestination);
    const assisted =
      destination === "Kampagnen" ||
      destination === "Social Media" ||
      destination === "Website" ||
      destination === "Newsletter" ||
      destination === "Content-Studio";
    navigate({ section: destination });
    if (assisted) {
      setDashboardTask((previous) => ({
        prompt,
        section: destination,
        request: (previous?.request ?? 0) + 1,
      }));
    } else {
      setDashboardTask(null);
      setNotice(
        "Dein Arbeitsbereich ist geöffnet. Starte hier mit deiner Aufgabe: " +
          prompt,
      );
    }
  }
  function navigate(target: DashboardTarget) {
    if (
      conceptDirty &&
      !window.confirm("Ungespeicherte Konzeptänderungen verwerfen?")
    )
      return;
    const group = workspaceGroup(target.section);
    if (group)
      setLastWorkspace((previous) => ({ ...previous, [group.label]: target }));
    if (
      target.section === "Kontakte/Akquise" ||
      target.section === "Mail-Studio"
    )
      setAcquisitionWizard(true);
    setDashboardTarget(target);
    setTab(
      target.section === "Kontakte/Akquise" ? "Mail-Studio" : target.section,
    );
    setNotice("");
    setError("");
    window.scrollTo({ top: 0 });
  }
  const mailLabel = data?.externalSending
    ? data.mailMode === "test"
      ? "Interner SMTP-Testmodus"
      : "Produktionsversand aktiv"
    : "Versand deaktiviert";
  const [mailContactIds, setMailContactIds] = useState<string[]>([]);
  const [mailDraftIds, setMailDraftIds] = useState<string[]>([]);
  async function refresh() {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.status === 401) {
      setData(null);
      setLoaded(true);
      return;
    }
    const json = await r.json();
    if (!r.ok) throw new Error(json.error);
    setData(json);
    setLoaded(true);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/state", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          setLoaded(true);
          return;
        }
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setData(json);
        setLoaded(true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoaded(true);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!showContact && !draft) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    if (!dialog) return;
    dialog.tabIndex = -1;
    dialog.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        setShowContact(false);
        setDraft(null);
      }
      if (e.key === "Tab") {
        const items = Array.from(
          dialog!.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary",
          ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [showContact, draft, busy]);
  async function post(path: string, body: unknown) {
    const r = await fetch("/api/" + path, {
      method: "POST",
      headers:
        body instanceof FormData ? {} : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    return result;
  }
  async function action(fn: () => Promise<unknown>, success = "Gespeichert.") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fn();
      await refresh();
      setNotice(typeof result === "string" ? result : success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }
  function archive(c: C) {
    const archived = !c.archivedAt;
    if (
      !window.confirm(
        archived
          ? `${c.organisation} archivieren? Geplante Mails werden abgebrochen. Der Verlauf bleibt erhalten.`
          : `${c.organisation} wiederherstellen? Es wird keine Mail freigegeben.`,
      )
    )
      return;
    void action(
      async () => {
        await post(`contacts/${c.id}/archive`, {
          revision: c.revision,
          confirmed: true,
          archived,
        });
        setShowContact(false);
        setSelected((ids) => ids.filter((id) => id !== c.id));
        setMailContactIds((ids) => ids.filter((id) => id !== c.id));
      },
      archived
        ? "Kontakt archiviert. Verlauf bleibt erhalten."
        : "Kontakt wiederhergestellt.",
    );
  }
  function removeContact(c: C) {
    if (
      !window.confirm(
        `Kontakt ${c.firstName} ${c.lastName} bei ${c.organisation} löschen? Ungesendete Entwürfe werden ebenfalls gelöscht und geplante Mails abgebrochen. Kontakte mit Versandverlauf oder Versandsperre bleiben geschützt.`,
      )
    )
      return;
    void action(async () => {
      await post(`contacts/${c.id}/delete`, {
        revision: c.revision,
        confirmed: true,
      });
      setShowContact(false);
      setSelected((ids) => ids.filter((id) => id !== c.id));
      setMailContactIds((ids) => ids.filter((id) => id !== c.id));
    }, "Kontakt und ungesendete Entwürfe gelöscht.");
  }
  function openContact(c: C | null) {
    setContact(c);
    setForm(
      c
        ? (Object.fromEntries(
            Object.keys(empty).map((k) => [
              k,
              k === "verifiedAt"
                ? (c.verifiedAt?.slice(0, 10) ?? "")
                : c[k as keyof C],
            ]),
          ) as ContactForm)
        : { ...empty },
    );
    setRationale("");
    setProcurement(false);
    setShowContact(true);
  }
  function openDraft(d: D) {
    setDraft(d);
    setVersion(d.version);
    const v = d.versions[0];
    setMessage({ recipient: v.recipient, subject: v.subject, body: v.body });
    setRead(false);
    setDispatchConfirm(false);
  }
  const dirty = draft
    ? !draft.versions[0].signatureCurrent ||
      message.recipient !== draft.versions[0].recipient ||
      message.subject !== draft.versions[0].subject ||
      message.body !== draft.versions[0].body
    : false;
  const contacts =
    data?.contacts.filter(
      (c) =>
        (filter === "ARCHIVED" ? !!c.archivedAt : !c.archivedAt) &&
        matchesContactFilters(c, contactFilters) &&
        (!filter ||
          contactStage(c) === filter ||
          c.replyOutcome === filter ||
          (filter === "FOLLOW_UP" &&
            Boolean(c.followUpOn) &&
            c.followUpOn <=
              new Intl.DateTimeFormat("sv-SE", {
                timeZone: "Europe/Zurich",
              }).format(new Date()))) &&
        `${c.organisation} ${c.firstName} ${c.lastName} ${c.email} ${c.region}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  const latest = (d: D) =>
    d.approvals.find(
      (a) => a.version === d.version && a.status !== "INVALIDATED",
    )?.status ?? "DRAFT";
  const drafts =
    data?.drafts.filter(
      (d) => tab !== "Freigaben" || latest(d) === "PENDING",
    ) ?? [];
  async function saveContact(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      const input = {
        ...form,
        verifiedAt: form.verifiedAt
          ? new Date(form.verifiedAt).toISOString()
          : "",
      };
      await post(
        contact ? "contacts/" + contact.id : "contacts",
        contact ? { revision: contact.revision, contact: input } : input,
      );
      setShowContact(false);
    });
  }
  async function review(decision: "PENDING" | "APPROVED" | "REJECTED") {
    if (!draft) return;
    await action(
      async () => {
        await post("review/" + draft.id, { version, decision, read });
        setDraft(null);
      },
      decision === "APPROVED"
        ? "Exakte Nachrichtenversion freigegeben."
        : "Prüfstatus gespeichert.",
    );
  }
  if (!loaded)
    return (
      <main className="login">
        <h1>StudioONE</h1>
        <p>StudioONE wird geladen …</p>
      </main>
    );
  if (!data)
    return (
      <main className="login">
        <div className="login-card">
          <AppLogo />
          <p className="eyebrow">STUDIOONE / MARKETING HUB</p>
          <h1>
            Gute Kontakte.
            <br />
            Bewusste Freigaben.
          </h1>
          <p className="muted">Geschützter Zugang zu StudioONE.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(
                () =>
                  post("login", {
                    email: f.get("email"),
                    password: f.get("password"),
                  }),
                "Angemeldet.",
              );
            }}
          >
            <label>
              E-Mail
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Passwort
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={256}
                required
              />
            </label>
            <button disabled={busy}>
              Sicher anmelden <span>↗</span>
            </button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="safe">
            Persönlicher Zugang · Versand nur nach Freigabe
          </p>
        </div>
      </main>
    );
  return (
    <div className="shell">
      <aside className="sidebar" inert={showContact || !!draft}>
        <AppLogo />
        <nav aria-label="Hauptnavigation">
          {workspaceGroups.map((group) => (
            <button
              key={group.label}
              aria-current={
                workspaceGroup(tab)?.label === group.label ? "page" : undefined
              }
              className={
                workspaceGroup(tab)?.label === group.label ? "active" : ""
              }
              disabled={busy}
              onClick={() => {
                if (workspaceGroup(tab)?.label !== group.label)
                  navigate(
                    lastWorkspace[group.label] || {
                      section: group.sections[0].section,
                    },
                  );
              }}
            >
              {group.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            <span className="dot" /> {mailLabel}
          </p>
          <button
            className="quiet"
            disabled={busy}
            aria-current={tab === "Einstellungen" ? "page" : undefined}
            onClick={() => navigate({ section: "Einstellungen" })}
          >
            Einstellungen
          </button>
          <div className="profile">
            <span className="avatar">
              {data.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{data.user.name}</strong>
              <small>Verwaltung & Freigabe</small>
            </div>
          </div>
          <button
            className="quiet"
            onClick={() => action(() => post("logout", {}), "Abgemeldet.")}
          >
            Abmelden
          </button>
        </div>
      </aside>
      <div className="workspace" inert={showContact || !!draft}>
        <header>
          <span>
            STUDIOJEKER GMBH <span className="muted">/ StudioONE</span>
          </span>
          <span className="test-tag">● {mailLabel}</span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              {tab !== "Übersicht" && (
                <>
                  <p className="eyebrow">
                    {workspaceGroup(tab)?.label || "StudioONE"}
                  </p>
                  <h1>{workspaceLabel(tab)}</h1>
                </>
              )}
            </div>
            <div className="heading-actions">
              <span className="muted">
                {new Date().toLocaleDateString("de-CH", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {(workspaceGroup(tab)?.sections.length || 0) > 1 && (
            <nav
              className="hub-subnav simple-subnav"
              aria-label={`${workspaceGroup(tab)!.label}-Navigation`}
            >
              {workspaceGroup(tab)!.sections.map((item) => (
                <button
                  key={item.section}
                  className="secondary"
                  disabled={busy}
                  aria-current={tab === item.section ? "page" : undefined}
                  onClick={() => navigate({ section: item.section })}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          {(tab === "Kampagnen" ||
            tab === "Social Media" ||
            tab === "Website" ||
            tab === "Newsletter") && (
            <AssistantEntry
              key={`assistant-${tab}-${tab === "Kampagnen" ? assistantCampaign?.request || "" : ""}`}
              section={tab}
              onProjectAssigned={() =>
                setProjectRevision((revision) => revision + 1)
              }
              campaignRequest={
                tab === "Kampagnen" ? assistantCampaign : undefined
              }
              initialTask={
                dashboardTask?.section === tab ? dashboardTask : undefined
              }
            />
          )}
          {[
            "Kampagnen",
            "Social Media",
            "Newsletter",
            "Kalender",
            "Einstellungen",
          ].includes(tab) && (
            <Hub
              key={tab}
              section={tab}
              userId={data.user.id}
              projectRevision={projectRevision}
              onCampaignAssistant={
                tab === "Kampagnen"
                  ? (id) => {
                      if (
                        document.querySelector(
                          ".assistant-entry .studio-chat",
                        ) &&
                        !window.confirm(
                          "Kampagne im GPT-Arbeitsbereich wechseln? Ungesendete Eingaben werden verworfen. Gespeicherte Gespräche bleiben erhalten.",
                        )
                      )
                        return;
                      setAssistantCampaign({ id, request: Date.now() });
                    }
                  : undefined
              }
              initialCampaignId={
                dashboardTarget?.section === tab
                  ? dashboardTarget.projectId
                  : undefined
              }
            />
          )}
          {tab === "Website" && (
            <Website
              initialProjectId={
                dashboardTarget?.section === "Website"
                  ? dashboardTarget.projectId
                  : undefined
              }
            />
          )}
          {tab === "Bibliothek" && <Library />}
          {tab === "Kunden" && <Customers />}
          {tab === "Strategie & Konzepte" && (
            <Concepts
              onDirtyChange={setConceptDirty}
              openCampaigns={() => setTab("Kampagnen")}
            />
          )}
          {tab === "Content-Studio" && (
            <ContentStudio
              userId={data.user.id}
              initialSeriesId={
                dashboardTarget?.section === "Content-Studio"
                  ? dashboardTarget.projectId
                  : undefined
              }
              initialTask={
                dashboardTask?.section === "Content-Studio"
                  ? dashboardTask
                  : undefined
              }
            />
          )}
          {tab === "Übersicht" && (
            <Dashboard
              onStartTask={startDashboardTask}
              name={data.user.name}
              contacts={data.contacts.length}
              drafts={data.drafts.filter((d) => latest(d) === "DRAFT").length}
              approvals={
                data.drafts.filter((d) => latest(d) === "PENDING").length
              }
              sent={data.deliveries.filter((d) => d.status === "SENT").length}
              onOpen={navigate}
            />
          )}
          {acquisitionTabs.includes(tab) && (
            <>
              <GoogleReconnectNotice />
              <div
                hidden={tab !== "Kontakte finden"}
                className="acquisition-research"
              >
                <button
                  className="secondary"
                  onClick={() => setTab("Kontakte")}
                >
                  Zur Kontaktliste
                </button>
                <section className="studioone-area-intro">
                  <p className="studioone-area-kicker">STUDIOONE · AKQUISE</p>
                  <h2>Wen möchtest du erreichen?</h2>
                  <p>
                    Passende Unternehmen finden und belegte Kontakte in deine
                    Liste übernehmen.
                  </p>
                </section>
                <LeadResearchPanel />
                <MailAssistant
                  mode="RESEARCH"
                  expanded
                  refresh={refresh}
                  persistenceKey={`acquisition-research:${data.user.id}`}
                  contacts={data.contacts}
                  onOpenContacts={() => setTab("Kontakte")}
                />
              </div>
              {tab === "Mail-Studio" && (
                <>
                  <button
                    className="secondary"
                    onClick={() => setAcquisitionWizard(!acquisitionWizard)}
                  >
                    {acquisitionWizard
                      ? "Erweiterte Mail-Werkzeuge"
                      : "Zum geführten Ablauf"}
                  </button>
                  {acquisitionWizard && (
                    <AcquisitionWizard
                      persistenceKey={`acquisition-wizard:${data.user.id}`}
                      contacts={data.contacts}
                      refresh={refresh}
                      onOpenHistory={() => setTab("Versandhistorie")}
                    />
                  )}
                </>
              )}
              <div hidden={tab !== "Mail-Studio" || acquisitionWizard}>
                <MailStudio
                  onOpenShipping={() => setTab("Versandhistorie")}
                  persistenceKey={`mail-work:${data.user.id}`}
                  filters={contactFilters}
                  onFiltersChange={(value) => {
                    setContactFilters(value);
                    setSelected([]);
                  }}
                  initialDraftIds={mailDraftIds}
                  initialContactIds={mailContactIds}
                  drafts={data.drafts}
                  contacts={data.contacts.map((contact) => ({
                    ...contact,
                    deliveryBlocked: data.deliveries.some((delivery) => delivery.recipient === contact.email && ["SENT", "SENDING", "UNKNOWN", "SEND_READY", "REPLIED"].includes(delivery.status)),
                  }))}
                  refresh={refresh}
                  onBusyChange={setBusy}
                  openContact={(id) => {
                    const c = data.contacts.find((c) => c.id === id);
                    if (c) openContact(c);
                  }}
                  openDraft={(id) => {
                    const d = data.drafts.find((d) => d.id === id);
                    if (d) openDraft(d);
                  }}
                />
              </div>
            </>
          )}
          {tab === "Kontakte" && (
            <section className="panel">
              <details className="contact-add-menu">
                <summary>Kontakte hinzufügen</summary>
                <div className="actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setTab("Kontakte finden")}
                  >
                    Kontakte recherchieren
                  </button>
                  <button
                    className="secondary"
                    onClick={() => openContact(null)}
                  >
                    Kontakt erfassen
                  </button>
                  <label className="file-button">
                    Kontakte importieren
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const body = new FormData();
                          body.set("file", f);
                          action(async () => {
                            const r = await post("contacts/import", body);
                            return `${r.imported} importiert, ${r.duplicates} bereits vorhandene Personen übersprungen. Kontakte ohne E-Mail werden ebenfalls übernommen.`;
                          }, "Import abgeschlossen.");
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        const result = await post("contacts/sheets", {});
                        return `Masterliste übernommen: ${result.imported ?? 0} neue Kontakte, ${result.duplicates ?? 0} bereits vorhanden. Keine Versandfreigabe erteilt.`;
                      })
                    }
                  >
                    {busy ? "Import läuft …" : "Aus Google Drive importieren"}
                  </button>
                </div>
              </details>
              <div className="toolbar">
                <label className="search">
                  Suche
                  <input
                    placeholder="Organisation, Person, Ort oder E-Mail"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">Alle Status</option>
                    {Object.entries(contactStageLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                    <option value="FOLLOW_UP">Wiedervorlage fällig</option>
                  </select>
                </label>
              </div>
              <details>
                <summary>Nach Unternehmen oder Branche filtern</summary>
                <ContactFilters
                  contacts={data.contacts}
                  value={contactFilters}
                  onChange={(value) => {
                    setContactFilters(value);
                    setSelected([]);
                  }}
                  disabled={busy}
                />
              </details>
              <div className="table-note">
                {contacts.length} Kontakte · {selected.length} ausgewählt
              </div>
              <ContactTable
                contacts={contacts}
                selected={selected}
                setSelected={setSelected}
                open={openContact}
                archive={archive}
                remove={removeContact}
                busy={busy}
              />
              {selected.length > 0 && (
                <div className="mail-selection-bar">
                  <strong>
                    {selected.length}{" "}
                    {selected.length === 1 ? "Kontakt" : "Kontakte"} ausgewählt
                  </strong>
                  {selected.length > 200 && (
                    <span>
                      Bitte höchstens 200 Kontakte pro Versand auswählen.
                    </span>
                  )}
                  <button
                    disabled={busy || selected.length > 200}
                    onClick={() => {
                      setMailDraftIds([]);
                      setMailContactIds([...selected]);
                      setTab("Mail-Studio");
                    }}
                  >
                    {selected.length} Mails erstellen →
                  </button>
                </div>
              )}
            </section>
          )}
          {["Versandhistorie", "E-Mail-Entwürfe", "Freigaben"].includes(
            tab,
          ) && (
            <details className="panel">
              <summary>Frühere Entwürfe und Versionen</summary>
              <section>
                <div className="section-head">
                  <h2>
                    {tab === "Freigaben"
                      ? "Zur persönlichen Prüfung"
                      : "Alle Nachrichtenversionen"}
                  </h2>
                  <span className="muted">{data.generator}</span>
                </div>
                <div className="draft-list">
                  {drafts.map((d) => {
                    const c = data.contacts.find((c) => c.id === d.contactId);
                    return (
                      <button
                        className="draft-row"
                        disabled={busy}
                        key={d.id}
                        onClick={() => openDraft(d)}
                      >
                        <span className="draft-symbol">↗</span>
                        <div>
                          <strong>{d.versions[0].subject}</strong>
                          <p>
                            {c?.organisation} · {d.versions[0].recipient}
                          </p>
                        </div>
                        <span className="muted">V{d.version}</span>
                        <Badge value={latest(d)} />
                        <span>Öffnen ↗</span>
                      </button>
                    );
                  })}
                  {!drafts.length && (
                    <p className="empty">
                      Keine Entwürfe in dieser Ansicht. Erstellen Sie einen
                      Entwurf bei einem verifizierten Kontakt.
                    </p>
                  )}
                </div>
              </section>
            </details>
          )}
          {tab === "Versandhistorie" && (
            <MailSchedule
              onReviewApproved={(ids) => {
                setMailContactIds([]);
                setMailDraftIds(ids);
                setTab("Mail-Studio");
              }}
              drafts={data.drafts}
              openDraft={(id) => {
                const d = data.drafts.find((d) => d.id === id);
                if (d) openDraft(d);
              }}
            />
          )}
          {tab === "Versandhistorie" && (
            <details className="panel">
              <summary>Vollständiges Versandprotokoll</summary>
              <div className="section-head">
                <h2>Nachrichtenprotokoll</h2>
                <span className="test-tag">{mailLabel}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empfänger</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Message-ID</th>
                      <th>Zeitpunkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deliveries.map((d) => (
                      <tr key={d.id}>
                        <td>{d.recipient}</td>
                        <td>V{d.version}</td>
                        <td>
                          <Badge value={d.status} />
                        </td>
                        <td className="mono">
                          {d.messageId}
                          <small>
                            {d.mode} · {d.envelopeRecipients?.join(", ")}
                          </small>
                          {d.error && <small>{d.error}</small>}
                        </td>
         …5484 tokens truncated…                 setRead(false);
                  }}
                />
              </label>
              <label>
                Betreff
                <input
                  required
                  maxLength={250}
                  value={message.subject}
                  onChange={(e) => {
                    setMessage({ ...message, subject: e.target.value });
                    setRead(false);
                  }}
                />
              </label>
              <label>
                Vollständige Nachricht
                <textarea
                  className="email-body"
                  aria-label="Vollständige Nachricht"
                  rows={17}
                  required
                  value={message.body}
                  onChange={(e) => {
                    setMessage({ ...message, body: e.target.value });
                    setRead(false);
                  }}
                />
              </label>
              <MailContentEditor
                disabled={busy}
                onApply={async (content) => {
                  setMessage({
                    ...message,
                    body: appendMailContent(message.body, content),
                  });
                  setRead(false);
                }}
              />
              <button disabled={busy || !dirty}>
                Als neue Version speichern
              </button>
            </form>
            <section
              aria-label="Mailvorschau mit Signatur"
              style={{ marginTop: 24 }}
            >
              <h3>Mailvorschau mit Signatur</h3>
              <div
                style={{
                  padding: 16,
                  border: "1px solid #c8cfd1",
                  background: "#fff",
                }}
                dangerouslySetInnerHTML={{
                  __html: signedMessage(message.body, true).html,
                }}
              />
            </section>
            {!draft.versions[0].signatureCurrent && (
              <p className="warning">
                Die neue Signatur ist noch nicht Bestandteil dieser
                gespeicherten Version. Bitte als neue Version speichern und
                erneut prüfen.
              </p>
            )}
            <label className="check read-check">
              <input
                type="checkbox"
                checked={read}
                disabled={dirty}
                onChange={(e) => setRead(e.target.checked)}
              />
              Ich habe Empfänger, Betreff und die vollständige Nachricht dieser
              Version einschliesslich Signatur gelesen und geprüft.
            </label>
            {dirty && (
              <p className="warning">
                Änderungen zuerst als neue Version speichern und erneut öffnen.
              </p>
            )}
            <div className="actions">
              <button
                disabled={busy || dirty || !read}
                onClick={() => review("APPROVED")}
              >
                Version {version} freigeben ✓
              </button>
              <button
                className="secondary"
                disabled={busy || dirty}
                onClick={() => review("PENDING")}
              >
                Zur Prüfung vorlegen
              </button>
              <button
                className="danger"
                disabled={busy || dirty}
                onClick={() => review("REJECTED")}
              >
                Ablehnen
              </button>
              <button
                className="secondary"
                disabled={busy || dirty || latest(draft) !== "APPROVED"}
                onClick={() =>
                  action(
                    () => post("simulate", { draftId: draft.id, version }),
                    "Nur lokal simuliert. Keine E-Mail wurde versandt.",
                  )
                }
              >
                Lokal simulieren
              </button>
            </div>
            {data.externalSending && (
              <section className="legal">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={dispatchConfirm}
                    disabled={dirty}
                    onChange={(e) => setDispatchConfirm(e.target.checked)}
                  />
                  {data.mailMode === "test"
                    ? "Ich bestätige den Versand dieser Version ausschliesslich an die serverseitig festgelegten internen Testempfänger."
                    : "Ich bestätige den tatsächlichen Versand dieser freigegebenen Version an den angezeigten Kontakt."}
                </label>
                <button
                  disabled={
                    busy ||
                    dirty ||
                    !dispatchConfirm ||
                    latest(draft) !== "APPROVED"
                  }
                  onClick={() =>
                    action(async () => {
                      const result = await post("send", {
                        draftId: draft.id,
                        version,
                        confirmDispatch: true,
                      });
                      setDispatchConfirm(false);
                      if (
                        !["SENT", "TEST_SENT"].includes(result.delivery.status)
                      )
                        throw new Error(
                          "Zustellung nicht bestätigt. Protokoll prüfen; nicht erneut senden.",
                        );
                      setDraft(null);
                    }, "Versand protokolliert.")
                  }
                >
                  {data.mailMode === "test"
                    ? "Internen Test versenden"
                    : "Freigegebene Version versenden"}
                </button>
              </section>
            )}
            <p className="warning">
              {mailLabel}. Freigabe und rechtliche Prüfung sind getrennte
              Entscheidungen. Unklare Zustellungen werden niemals automatisch
              wiederholt.
            </p>
            <details>
              <summary>Versionen & Freigabeprotokoll</summary>
              {draft.versions.map((v) => (
                <details key={v.id}>
                  <summary>
                    Version {v.version} · {date(v.createdAt)}
                  </summary>
                  <p>{v.recipient}</p>
                  <strong>{v.subject}</strong>
                  <pre>{v.body}</pre>
                </details>
              ))}
              {draft.approvals.map((a) => (
                <p key={a.id}>
                  {a.user.name} · V{a.version} · {labels[a.status]} ·{" "}
                  {date(a.createdAt)}
                </p>
              ))}
            </details>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function ContactTable({
  contacts,
  selected,
  setSelected,
  open,
  archive,
  remove,
  busy,
}: {
  archive: (c: C) => void;
  remove: (c: C) => void;
  busy: boolean;
  contacts: C[];
  selected: string[];
  setSelected: (v: string[]) => void;
  open: (c: C) => void;
}) {
  return (
    <div className="table-wrap contact-table">
      <table>
        <thead>
          <tr>
            <th>
              <input
                aria-label="Alle sichtbaren Kontakte auswählen"
                type="checkbox"
                checked={
                  contacts.length > 0 &&
                  contacts.every((c) => selected.includes(c.id))
                }
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [
                          ...new Set([
                            ...selected,
                            ...contacts.map((c) => c.id),
                          ]),
                        ]
                      : selected.filter(
                          (id) => !contacts.some((c) => c.id === id),
                        ),
                  )
                }
              />
            </th>
            <th>Organisation / Kontakt</th>
            <th>E-Mail</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Aktion</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`${c.organisation} auswählen`}
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, c.id]
                        : selected.filter((id) => id !== c.id),
                    )
                  }
                />
              </td>
              <td>
                <button className="contact-link" onClick={() => open(c)}>
                  {c.organisation}
                </button>
                <small>
                  {c.firstName} {c.lastName}
                </small>
                {c.publicAuthority && (
                  <small className="public">Öffentlicher Auftraggeber</small>
                )}
              </td>
              <td>{c.email || "E-Mail fehlt"}</td>
              <td>
                <span className={`badge b-${contactStage(c)}`}>
                  {contactStageLabels[contactStage(c)]}
                </span>
                {c.replyOutcome && (
                  <small>{replyLabels[c.replyOutcome] || c.replyOutcome}</small>
                )}
                {c.followUpOn && (
                  <small>
                    Wiedervorlage: {c.followUpOn.split("-").reverse().join(".")}
                  </small>
                )}
              </td>
              <td>
                <details className="contact-row-menu">
                  <summary aria-label={`Aktionen für ${c.organisation}`}>
                    •••
                  </summary>
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() => open(c)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() => archive(c)}
                  >
                    {c.archivedAt ? "Wiederherstellen" : "Archivieren"}
                  </button>
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() => remove(c)}
                  >
                    Löschen
                  </button>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
