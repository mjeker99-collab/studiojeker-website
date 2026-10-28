"use client";
import { signedMessage } from "../lib/mail-signature";
import "./studioone-workspaces.css";
import "./studioone-area-intro.css";
import "./studioone-design-system.css";
import MailSchedule from "./MailSchedule";
import MailStudio from "./MailStudio";
import ContactMailFlow from "./ContactMailFlow";
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
const nav = [
  "Übersicht",
  "Kontakte/Akquise",
  "Kunden",
  "Strategie & Konzepte",
  "Kampagnen",
  "Social Media",
  "Content-Studio",
  "Bibliothek",
  "Newsletter",
  "Website",
  "Kalender",
  "Einstellungen",
];
const acquisitionTabs = [
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
        src="/brand/logo?v=2"
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
  const [data, setData] = useState<State | null>(null),
    [loaded, setLoaded] = useState(false),
    [conceptDirty, setConceptDirty] = useState(false),
    [tab, setTab] = useState("Übersicht"),
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
  const [projectRevision, setProjectRevision] = useState(0);
  const [dashboardTask, setDashboardTask] = useState<{
    prompt: string;
    section: "Kampagnen" | "Social Media" | "Website";
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
      destination === "Website";
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
    setDashboardTarget(target);
    setTab(
      target.section === "Kontakte/Akquise" ? "Mail-Studio" : target.section,
    );
    setNotice("");
    setError("");
    setSelected([]);
    setSearch("");
    setFilter("");
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
        (!filter || c.status === filter) &&
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
          <p className="muted">Interner Zugang für Martin und Nora Jeker.</p>
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
        <p className="eyebrow">STUDIOONE / WORKSPACE</p>
        <nav aria-label="Hauptnavigation">
          {nav.map((n, i) => (
            <button
              key={n}
              aria-current={
                tab === n ||
                (n === "Kontakte/Akquise" && acquisitionTabs.includes(tab))
                  ? "page"
                  : undefined
              }
              className={
                tab === n ||
                (n === "Kontakte/Akquise" && acquisitionTabs.includes(tab))
                  ? "active"
                  : ""
              }
              onClick={() => navigate({ section: n })}
            >
              <span className="nav-index" aria-hidden="true">
                0{i + 1}
              </span>
              {n}
              {n === "Freigaben" && (
                <small>
                  {data.drafts.filter((d) => latest(d) === "PENDING").length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            <span className="dot" /> {mailLabel}
          </p>
          <p>Persönliche Mails gemeinsam prüfen</p>
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
            Abmelden ↗
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
              <p className="eyebrow">ÜBERSICHT & KONTROLLE</p>
              <h1>{tab}</h1>
            </div>
            <div className="heading-actions">
              {tab === "Mail-Studio" && (
                <button
                  className="ai-button"
                  onClick={() => {
                    const button = document.querySelector<HTMLButtonElement>(
                      '[aria-label="GPT für Mail-Studio"] .ai-button',
                    );
                    button?.click();
                    button
                      ?.closest("section")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  ✦ GPT beauftragen
                </button>
              )}
              <span className="muted">
                {new Date().toLocaleDateString("de-CH", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {["Übersicht", "Kontakte"].includes(tab) && (
                <button onClick={() => openContact(null)}>
                  Kontakt erfassen <span>＋</span>
                </button>
              )}
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
          {tab !== "Übersicht" && !acquisitionTabs.includes(tab) && (
            <section className="studioone-area-intro" aria-label={`Einführung ${tab}`}>
              <p className="studioone-area-kicker">STUDIOONE · {tab.toLocaleUpperCase("de-CH")}</p>
              <h2>{({
                "Kunden": "Deine Kunden. Alles im Blick.",
                "Strategie & Konzepte": "Was möchtest du heute entwickeln?",
                "Kampagnen": "Was möchtest du heute bekannt machen?",
                "Social Media": "Was möchtest du heute veröffentlichen?",
                "Content-Studio": "Was möchtest du heute gestalten?",
                "Bibliothek": "Deine Inhalte. Schnell gefunden.",
                "Newsletter": "Was möchtest du heute mitteilen?",
                "Website": "Was möchtest du an deiner Website ändern?",
                "Kalender": "Was steht als Nächstes an?",
                "Einstellungen": "StudioONE einfach verwalten.",
              } as Record<string,string>)[tab] || "Was möchtest du heute erledigen?"}</h2>
              <p>{({
                "Kunden": "Kundeninformationen übersichtlich verwalten und gemeinsam weiterbearbeiten.",
                "Strategie & Konzepte": "Beschreibe deine Idee. StudioONE unterstützt dich bei Konzept und Umsetzung.",
                "Kampagnen": "Von der Idee zur Kampagne – einfach planen, erstellen und freigeben.",
                "Social Media": "Beiträge für deine Kanäle vorbereiten und übersichtlich verwalten.",
                "Content-Studio": "Bilder, Videos und Inhalte gestalten – mit Unterstützung durch KI.",
                "Bibliothek": "Bilder, Dokumente und Vorlagen an einem Ort.",
                "Newsletter": "Newsletter erstellen, bearbeiten und für den Versand vorbereiten.",
                "Website": "Inhalte und Projekte deiner Website an einem Ort bearbeiten.",
                "Kalender": "Deine geplanten Aktivitäten und Termine auf einen Blick.",
                "Einstellungen": "Die wichtigsten Einstellungen übersichtlich an einem Ort.",
              } as Record<string,string>)[tab] || "Starte direkt mit deiner Aufgabe."}</p>
            </section>
          )}
          {acquisitionTabs.includes(tab) && (
            <nav className="hub-subnav" aria-label="Akquise-Navigation">
              {["Mail-Studio", "Kontakte", "Versandhistorie"].map((n) => (
                <button
                  className={tab === n ? "" : "secondary"}
                  key={n}
                  onClick={() => setTab(n)}
                >
                  {n}
                </button>
              ))}
              <details>
                <summary>Weitere Ansichten</summary>
                {["E-Mail-Entwürfe", "Freigaben"].map((n) => (
                  <button
                    className={tab === n ? "" : "secondary"}
                    key={n}
                    onClick={() => setTab(n)}
                  >
                    {n}
                  </button>
                ))}
              </details>
            </nav>
          )}
          {(tab === "Kampagnen" ||
            tab === "Social Media" ||
            tab === "Website" ||
            tab === "Mail-Studio") && (
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
          {tab === "Mail-Studio" && (
            <MailStudio
              initialDraftIds={mailDraftIds}
              drafts={data.drafts}
              contacts={data.contacts}
              refresh={refresh}
              openDraft={(id) => {
                const d = data.drafts.find((d) => d.id === id);
                if (d) openDraft(d);
              }}
            />
          )}
          {tab === "Kontakte" && mailContactIds.length > 0 && (
            <ContactMailFlow
              ids={mailContactIds}
              contacts={data.contacts}
              refresh={refresh}
              back={() => setMailContactIds([])}
              onReady={(ids) => {
                setMailDraftIds(ids);
                setMailContactIds([]);
                setTab("Mail-Studio");
              }}
            />
          )}
          {tab === "Kontakte" && !mailContactIds.length && (
            <section className="panel">
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
                    {Object.entries(labels)
                      .slice(0, 12)
                      .map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const result = await post("contacts/sheets", {});
                      return `Masterliste übernommen: ${result.imported ?? 0} neue Kontakte, ${result.duplicates ?? 0} bereits vorhanden. Keine Versandfreigabe erteilt.`;
                    })
                  }
                >
                  {busy ? "Import läuft …" : "Masterliste importieren"}
                </button>
                <label className="file-button">
                  CSV / XLSX importieren
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
              </div>
              <div className="table-note">
                {contacts.length} Kontakte · {selected.length} ausgewählt ·
                Importe erhalten keine Versandfreigabe.
              </div>
              <ContactTable
                contacts={contacts}
                selected={selected}
                setSelected={setSelected}
                open={openContact}
              />
              {selected.length > 0 && (
                <div className="mail-selection-bar">
                  <strong>{selected.length} Kontakte ausgewählt</strong>
                  <button
                    disabled={busy || selected.length > 200}
                    onClick={() => setMailContactIds([...selected])}
                  >
                    {selected.length} Mails vorbereiten →
                  </button>
                </div>
              )}
            </section>
          )}
          {["E-Mail-Entwürfe", "Freigaben"].includes(tab) && (
            <section className="panel">
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
          )}
          {tab === "Versandhistorie" && (
            <MailSchedule
              drafts={data.drafts}
              openDraft={(id) => {
                const d = data.drafts.find((d) => d.id === id);
                if (d) openDraft(d);
              }}
            />
          )}
          {tab === "Versandhistorie" && (
            <section className="panel">
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
                        <td>{date(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.deliveries.length && (
                <p className="empty">Keine Nachrichten. {mailLabel}.</p>
              )}
            </section>
          )}
          {tab === "Einstellungen" && (
            <>
              <div className="settings-grid">
                <section className="panel padded">
                  <h2>Verbindungen & Sicherheit</h2>
                  <dl>
                    <dt>Metanet SMTP</dt>
                    <dd>jovinus.metanet.ch</dd>
                    <dt>Absender</dt>
                    <dd>njeker@studiojeker.ch</dd>
                    <dt>Port / Verschlüsselung</dt>
                    <dd>
                      {data.smtpPort
                        ? `${data.smtpPort} / ${data.smtpSecure ? "TLS" : "STARTTLS"}`
                        : "Noch durch Metanet zu bestätigen"}
                    </dd>
                    <dt>Externer Versand</dt>
                    <dd>
                      {data.externalSending ? (
                        mailLabel
                      ) : (
                        <Badge value="BLOCKED" />
                      )}
                    </dd>
                    <dt>IMAP</dt>
                    <dd>Header-Zuordnung vorbereitet · nicht verbunden</dd>
                    <dt>Google Sheets</dt>
                    <dd>Manueller, lesender Import</dd>
                  </dl>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        () => post("contacts/sheets", {}),
                        "Sheets-Import abgeschlossen; neue Kontakte bleiben ungeprüft.",
                      )
                    }
                  >
                    Google Sheets synchronisieren ↗
                  </button>
                  <p className="muted">
                    Bestehende Dubletten werden übersprungen. Keine
                    Statusübernahme, keine Versandwarteschlange.
                  </p>
                  <h3>Interne Testmail</h3>
                  <p>
                    Sendet einen neutralen Verbindungstest ausschliesslich an
                    njeker@studiojeker.ch. Es wird kein Akquisekontakt
                    freigegeben.
                  </p>
                  <button
                    disabled={
                      busy || data.mailMode !== "test" || !data.externalSending
                    }
                    onClick={() =>
                      action(async () => {
                        const result = await post("smtp/test", {
                          confirmed: true,
                          requestId: crypto.randomUUID(),
                        });
                        return result.message;
                      })
                    }
                  >
                    Testmail an njeker@studiojeker.ch senden
                  </button>
                  <p className="muted">
                    Benötigt den internen SMTP-Testmodus. Höchstens ein Test pro
                    Minute.
                  </p>
                  <h3>Berechtigte Konten</h3>
                  {data.users.map((u) => (
                    <p key={u.id}>{u.name} · Verwaltung & Freigabe</p>
                  ))}
                </section>
                <section className="panel padded">
                  <h2>Zentrale Sperrliste</h2>
                  <p className="muted">
                    Widersprüche sperren alle Entwürfe dieser Adresse sofort.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      action(
                        () =>
                          post("suppression", {
                            email: f.get("email"),
                            reason: f.get("reason"),
                          }),
                        "Adresse gesperrt.",
                      );
                    }}
                  >
                    <label>
                      E-Mail
                      <input name="email" type="email" required />
                    </label>
                    <label>
                      Grund
                      <input name="reason" minLength={3} required />
                    </label>
                    <button disabled={busy}>Adresse sperren</button>
                  </form>
                  {data.suppressions.map((s) => (
                    <div className="suppression" key={s.email}>
                      <strong>{s.email}</strong>
                      <p>{s.reason}</p>
                    </div>
                  ))}
                </section>
              </div>
              <section className="panel">
                <div className="section-head">
                  <h2>Audit-Protokoll</h2>
                  <span>Letzte 100 Einträge</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Aktion</th>
                        <th>Benutzer</th>
                        <th>Zeitpunkt</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audits.map((a) => (
                        <tr key={a.id}>
                          <td>{a.action}</td>
                          <td>{a.user.name}</td>
                          <td>{date(a.createdAt)}</td>
                          <td className="mono">{JSON.stringify(a.detail)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <footer>
            STUDIOJEKER · WE CREATE VISIBILITY.{" "}
            <span>StudioONE V1 / intern</span>
          </footer>
        </main>
      </div>
      {showContact && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
          >
            <div className="section-head">
              <h2 id="contact-title">
                {contact ? "Kontakt bearbeiten" : "Kontakt erfassen"}
              </h2>
              <button
                className="quiet"
                aria-label="Schliessen"
                onClick={() => setShowContact(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={saveContact}>
              <div className="form-grid">
                {(
                  [
                    ["organisation", "Organisation"],
                    ["industry", "Branche"],
                    ["region", "Ort / Region"],
                    ["firstName", "Vorname"],
                    ["lastName", "Nachname"],
                    ["position", "Aktuelle Funktion"],
                    ["email", "Geschäftliche E-Mail-Adresse"],
                    ["website", "Website"],
                    ["sourceUrl", "Quellen-URL"],
                    ["verifiedAt", "Letzte Verifikation"],
                    ["service", "Empfohlene Dienstleistung"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type={
                        key === "email"
                          ? "email"
                          : key === "verifiedAt"
                            ? "date"
                            : ["website", "sourceUrl"].includes(key)
                              ? "url"
                              : "text"
                      }
                      value={form[key]}
                      required={[
                        "organisation",
                        "firstName",
                        "lastName",
                      ].includes(key)}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Vertrauensstatus
                  <select
                    value={form.confidence}
                    onChange={(e) =>
                      setForm({ ...form, confidence: e.target.value })
                    }
                  >
                    <option value="UNCONFIRMED">Unbestätigt</option>
                    <option value="ESTIMATED">Geschätzt</option>
                    <option value="GENERAL">Allgemeine Adresse</option>
                    <option value="VERIFIED">
                      Persönliche Adresse verifiziert
                    </option>
                  </select>
                </label>
                <label>
                  Rechtliche Kontaktkategorie
                  <select
                    value={form.legalCategory}
                    onChange={(e) =>
                      setForm({ ...form, legalCategory: e.target.value })
                    }
                  >
                    <option value="UNASSESSED">Ungeprüft</option>
                    <option value="CONSENT_DOCUMENTED">
                      Einwilligung dokumentiert
                    </option>
                    <option value="EXISTING_RELATIONSHIP">
                      Bestehende Beziehung
                    </option>
                    <option value="OTHER_REVIEW_REQUIRED">
                      Separate Prüfung erforderlich
                    </option>
                    <option value="PUBLIC_AUTHORITY">
                      Öffentlicher Auftraggeber
                    </option>
                  </select>
                </label>
                <label>
                  Verantwortlich
                  <select
                    value={form.owner}
                    onChange={(e) =>
                      setForm({ ...form, owner: e.target.value })
                    }
                  >
                    <option value="">Nicht zugewiesen</option>
                    {data.users.map((u) => (
                      <option key={u.id}>{u.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Dokumentierter Anknüpfungspunkt
                <textarea
                  rows={3}
                  value={form.hook}
                  onChange={(e) => setForm({ ...form, hook: e.target.value })}
                />
              </label>
              <label>
                Interne Notizen
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.publicAuthority}
                  onChange={(e) =>
                    setForm({ ...form, publicAuthority: e.target.checked })
                  }
                />
                Öffentlicher Auftraggeber · beschaffungsrechtliche Prüfung
                erforderlich
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.newsletterConsent}
                  onChange={(e) =>
                    setForm({ ...form, newsletterConsent: e.target.checked })
                  }
                />
                Separate Newsletter-Einwilligung dokumentiert
              </label>
              <label>
                Nachweis der Newsletter-Einwilligung
                <input
                  value={form.newsletterEvidence}
                  onChange={(e) =>
                    setForm({ ...form, newsletterEvidence: e.target.value })
                  }
                />
              </label>
              <p className="warning">
                Jede Kontaktänderung macht bestehende Freigaben und die
                rechtliche Prüfung ungültig.
              </p>
              <div className="actions">
                <button disabled={busy}>Kontakt speichern</button>
                {contact && (
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        await post("drafts", { contactId: contact.id });
                        setShowContact(false);
                        setTab("E-Mail-Entwürfe");
                      }, "Lokaler Entwurf erstellt.")
                    }
                  >
                    Entwurf vorbereiten ↗
                  </button>
                )}
              </div>
            </form>
            {contact && (
              <section className="legal">
                <h3>Separate rechtliche Versandprüfung</h3>
                <p>
                  Eine publizierte Geschäftsadresse ist keine Werbeeinwilligung.
                  Die Kategorie allein erteilt keine Freigabe.
                </p>
                <p>
                  Letzte Prüfung:{" "}
                  {contact.legalReviews[0]
                    ? contact.legalReviews[0].allowed
                      ? "Zulässig"
                      : "Nicht zulässig"
                    : "Ausstehend"}
                </p>
                <label>
                  Rechtsgrundlage und Nachweis
                  <textarea
                    minLength={15}
                    rows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={procurement}
                    onChange={(e) => setProcurement(e.target.checked)}
                  />
                  Beschaffungsrecht separat geprüft
                </label>
                <div className="actions">
                  <button
                    disabled={busy || rationale.trim().length < 15}
                    onClick={() =>
                      action(async () => {
                        await post("legal", {
                          contactId: contact.id,
                          revision: contact.revision,
                          allowed: true,
                          rationale,
                          procurementReviewed: procurement,
                        });
                        setShowContact(false);
                      }, "Rechtliche Prüfung dokumentiert.")
                    }
                  >
                    Zulässigkeit dokumentieren
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || rationale.trim().length < 15}
                    onClick={() =>
                      action(async () => {
                        await post("legal", {
                          contactId: contact.id,
                          revision: contact.revision,
                          allowed: false,
                          rationale,
                          procurementReviewed: procurement,
                        });
                        setShowContact(false);
                      })
                    }
                  >
                    Nicht zulässig
                  </button>
                </div>
              </section>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
      {draft && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-title"
          >
            <div className="section-head">
              <h2 id="draft-title">Nachricht prüfen · Version {version}</h2>
              <button
                className="quiet"
                aria-label="Schliessen"
                onClick={() => setDraft(null)}
              >
                ✕
              </button>
            </div>
            <p className="muted">
              {
                data.contacts.find((c) => c.id === draft.contactId)
                  ?.organisation
              }{" "}
              · Absender: Nora Jeker, njeker@studiojeker.ch
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  await post("drafts/" + draft.id, { version, ...message });
                  setDraft(null);
                }, "Neue Version gespeichert. Bisherige Freigaben sind ungültig.");
              }}
            >
              <label>
                Empfänger
                <input
                  type="email"
                  required
                  value={message.recipient}
                  onChange={(e) => {
                    setMessage({ ...message, recipient: e.target.value });
                    setRead(false);
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
}: {
  contacts: C[];
  selected: string[];
  setSelected: (v: string[]) => void;
  open: (c: C) => void;
}) {
  return (
    <div className="table-wrap">
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
                  setSelected(e.target.checked ? contacts.map((c) => c.id) : [])
                }
              />
            </th>
            <th>Organisation / Kontakt</th>
            <th>Branche / Region</th>
            <th>Verifikation</th>
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
                  {c.firstName} {c.lastName} · {c.position || "Funktion offen"}
                </small>
                {c.publicAuthority && (
                  <small className="public">Öffentlicher Auftraggeber</small>
                )}
              </td>
              <td>
                {c.industry || "–"}
                <small>{c.region || "–"}</small>
              </td>
              <td>
                <span
                  className={c.confidence === "VERIFIED" ? "verified" : "muted"}
                >
                  {c.confidence === "VERIFIED"
                    ? "● Verifiziert"
                    : "○ Ungeprüft"}
                </span>
              </td>
              <td>
                <Badge value={c.status} />
              </td>
              <td>
                <button
                  className="quiet"
                  aria-label={`${c.organisation} bearbeiten`}
                  onClick={() => open(c)}
                >
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
