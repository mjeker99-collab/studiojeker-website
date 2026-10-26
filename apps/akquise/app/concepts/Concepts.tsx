"use client";
import { useEffect, useState } from "react";
import ProjectSave from "../projects/ProjectSave";
import { agencyStarters } from "@/lib/concepts/agency";
import {
  chapters,
  emptyConcept,
  type Chapter,
  type ConceptInput,
} from "@/lib/concepts/input";

type Version = {
  version: number;
  payload: ConceptInput;
  createdAt: string;
  createdBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  handoffCampaignId: string | null;
};
type Job = {
  id: string;
  status: string;
  input: { request?: { message?: string }; strategy?: { version?: number } };
  result: { reply?: string } | null;
  error: string | null;
};
type Document = {
  id: string;
  seriesId: string;
  version: number;
  versions: Version[];
  series: { jobs: Job[] };
};
type Index = {
  concepts: { id: string; versions: Version[] }[];
  customers: { id: string; name: string; status: string }[];
  campaigns: { id: string; title: string; customerId: string | null }[];
  users: { id: string; name: string }[];
  config: { connected: boolean; textReserve: number };
};
async function api(path: string, body?: unknown) {
  const response = await fetch(
    `/api/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(115000),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Anfrage fehlgeschlagen.");
  return data;
}
export default function Concepts({
  openCampaigns,
  onDirtyChange,
}: {
  openCampaigns: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [index, setIndex] = useState<Index | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [form, setForm] = useState<ConceptInput>({ ...emptyConcept });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [target, setTarget] = useState<Chapter>("briefing");
  const [history, setHistory] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const current = doc?.versions[0];
  const dirty =
    JSON.stringify(form) !== JSON.stringify(current?.payload ?? emptyConcept);
  const pending = doc?.series.jobs.some((job) =>
    ["QUEUED", "RUNNING"].includes(job.status),
  );
  useEffect(() => {
    void api("concepts")
      .then(setIndex)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function load(id: string) {
    const next: Document = await api(`concepts/${id}`);
    setDoc(next);
    setForm(next.versions[0].payload);
    setHistory(next.version);
    setReviewed(false);
    setIndex(await api("concepts"));
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function choose(id: string) {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?"))
      return;
    await action(async () => {
      if (id) await load(id);
      else {
        setDoc(null);
        setForm({ ...emptyConcept });
        setHistory(0);
      }
      setMessage("");
      setConsent(false);
      setReviewed(false);
    });
  }
  async function send() {
    if (busy || pending || !index?.config.connected) return;
    if (!message.trim()) {
      setError("Beschreibe zuerst, was du entwickeln möchtest.");
      document.getElementById("concept-message")?.focus();
      return;
    }
    if (!consent) {
      setError("Bitte bestätige zuerst die Weitergabe der Angaben an GPT.");
      document.getElementById("concept-consent")?.focus();
      return;
    }
    await action(async () => {
      // Workspace snapshots are not native concepts. New concepts need a
      // title even if the user started in the GPT chat, not the editor.
      const conceptData = {
        ...form,
        title: form.title.trim() ||
          (message.includes("Redaktionsplan") ? "Redaktionsplan" :
           message.includes("Kampagne") ? "Kampagnenkonzept" :
           "Kommunikationskonzept"),
      };
      if (!form.title.trim()) setForm(conceptData);
      // Save the current editor state first, including brand-new concepts.
      // Do not reload the form here: that would overwrite the user's prompt.
      const active: Document = dirty || !doc
        ? await (async () => {
            const saved = await api(
              doc ? `concepts/${doc.id}` : "concepts",
              doc ? { version: doc.version, data: conceptData } : conceptData,
            );
            return api(`concepts/${saved.id}`);
          })()
        : doc;
      setDoc(active);
      setHistory(active.version);
      let queued = false;
      try {
        const job = await api("studio/jobs", {
          seriesId: active.seriesId,
          kind: "CHAT",
          conceptVersion: active.version,
          message: message.trim(),
          contentId: null,
          requestKey: crypto.randomUUID(),
          referenceIds: [],
          referenceRights: true,
          referenceTransfer: true,
          confirmedCosts: true,
        });
        queued = true;
        setMessage("");
        await api(`studio/run/${job.id}`, { confirmedCosts: true });
      } catch (e) {
        throw new Error(
          (e instanceof Error ? e.message : "GPT-Anfrage fehlgeschlagen.") +
            (queued
              ? " Auftrag gespeichert. Status prüfen, bevor du eine neue Nachricht sendest."
              : ""),
        );
      } finally {
        // Preserve the saved editor state; fetching the complete conversation also recovers after a network timeout.
        const next: Document = await api(`concepts/${active.id}`);
        setDoc(next);
        // Index refresh is informational and must never prevent GPT requests.
        void api("concepts").then(setIndex).catch(() => {});
      }
    });
  }
  const name = (id: string | null) =>
    index?.users.find((user) => user.id === id)?.name || "Unbekannt";
  const oldVersion = doc?.versions.find((v) => v.version === history);
  return (
    <section className="concepts" aria-label="Konzeptentwicklung">
      <p>Thema eingeben, mit GPT entwickeln und Ergebnisse ins Konzept übernehmen.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!index ? (
        <p role="status">
          {error
            ? "Konzepte konnten nicht geladen werden."
            : "Konzepte werden geladen …"}
          <button
            className="secondary"
            onClick={() =>
              void action(async () => setIndex(await api("concepts")))
            }
          >
            Erneut laden
          </button>
        </p>
      ) : (
        <>
          <div className="studio-chat-controls">
            <button
              type="submit"
              form="concept-gpt-message"
              className="primary"
              disabled={
                busy || !index.config.connected || pending
              }
              aria-label="Mit GPT entwickeln"
            >
              {busy ? "Konzept wird bearbeitet …" : "✦ Mit GPT entwickeln"}
            </button>
            <label>
              Konzept auswählen
              <select
                disabled={busy}
                value={doc?.id || ""}
                onChange={(e) => void choose(e.target.value)}
              >
                <option value="">Neues Konzept</option>
                {index.concepts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.versions[0].payload.title} · V
                    {item.versions[0].version}
                    {item.versions[0].approvedAt
                      ? " · Freigegeben"
                      : " · Entwurf"}
                  </option>
                ))}
              </select>
            </label>
            {doc && <button type="button" className="secondary" disabled={busy}
              onClick={() => void choose(doc.id)}>Zurücksetzen</button>}
          </div>

          <details className="concept-advanced-save">
            <summary>Weitere Optionen: Arbeitsstand sichern oder wiederherstellen</summary>
            <ProjectSave
            area="Konzepte"
            identity={doc?.id || ""}
            suggestedTitle={form.title || "Neues Konzept"}
            busy={busy}
            value={{
              nativeId: doc?.id || "",
              nativeVersion: doc?.version || 0,
              form,
              message,
              target,
              startsAt,
              endsAt,
            }}
            restore={async (draft) => {
              const next: Document | null = draft.nativeId
                ? await api(`concepts/${draft.nativeId}`)
                : null;
              setDoc(next ? { ...next, version: draft.nativeVersion } : null);
              setForm(draft.form);
              setMessage(draft.message);
              setTarget(draft.target);
              setStartsAt(draft.startsAt);
              setEndsAt(draft.endsAt);
              setHistory(draft.nativeVersion);
              setConsent(false);
              setReviewed(false);
            }}
            />
          </details>
          <div className="concept-columns">
            <section
              className="studio-chat"
              aria-labelledby="concept-chat-title"
            >
              <h2 id="concept-chat-title">1. Thema und Auftrag</h2>
              <p className="muted">Beschreibe dein Vorhaben oder wähle einen Einstieg. GPT legt das Konzept automatisch an.</p>
              <div
                className="studio-chat-controls"
                aria-label="Einstieg in die Konzeptarbeit"
              >
                {agencyStarters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    className="secondary"
                    disabled={busy || pending}
                    onClick={() => {
                      if (
                        message.trim() &&
                        !window.confirm(
                          "Ungesendete Nachricht durch den gewählten Einstieg ersetzen?",
                        )
                      )
                        return;
                      setMessage(starter.message);
                      if (!form.title.trim()) {
                        setForm({ ...form, title: starter.label });
                      }
                    }}
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
              <div
                className="studio-chat-transcript"
                role="log"
                aria-label="Konzeptgespräch"
                aria-live="polite"
              >
                {!doc?.series.jobs.length && (
                  <p>
                    Zum Beispiel: «Entwickle mit mir ein Kommunikationskonzept
                    für ein Architekturbüro in Solothurn. Welche Angaben
                    brauchst du?»
                  </p>
                )}
                {doc?.series.jobs.map((job) => (
                  <article key={job.id}>
                    <p>
                      <strong>Du</strong> · Konzept V
                      {job.input.strategy?.version ?? "–"}
                    </p>
                    <p className="studio-chat-message">
                      {job.input.request?.message}
                    </p>
                    <p>
                      <strong>GPT</strong>
                    </p>
                    <p className="studio-chat-message">
                      {job.result?.reply ||
                        job.error ||
                        ({
                          QUEUED: "Wartet auf Start",
                          RUNNING: "Antwort wird erstellt …",
                          UNKNOWN:
                            "Ergebnis unklar. Nicht automatisch wiederholen.",
                          CANCELLED: "Auftrag abgebrochen",
                        }[job.status] ??
                          "Keine Antwort verfügbar")}
                    </p>
                    {job.result?.reply && (
                      <button
                        className="secondary"
                        disabled={busy || job.result.reply.length > 4000}
                        onClick={() => {
                          if (
                            form[target] &&
                            !window.confirm(
                              `Vorhandenen Text in «${chapters.find(([key]) => key === target)![1]}» ersetzen?`,
                            )
                          )
                            return;
                          setForm({ ...form, [target]: job.result!.reply! });
                          setReviewed(false);
                          setNotice(
                            "Vorschlag übernommen. Prüfen und als neue Version speichern.",
                          );
                        }}
                      >
                        Antwort ins gewählte Kapitel übernehmen
                      </button>
                    )}
                    {job.result?.reply && job.result.reply.length > 4000 && (
                      <p>
                        Antwort zu lang für ein Kapitel. GPT um eine kürzere
                        Fassung bitten oder einen Ausschnitt kopieren.
                      </p>
                    )}
                    {job.status === "QUEUED" && (
                      <button
                        disabled={busy || !consent}
                        onClick={() =>
                          void action(async () => {
                            await api(`studio/run/${job.id}`, {
                              confirmedCosts: true,
                            });
                            setDoc(await api(`concepts/${doc.id}`));
                          })
                        }
                      >
                        Gespeicherten Auftrag starten
                      </button>
                    )}
                    {["QUEUED", "RUNNING", "UNKNOWN"].includes(job.status) && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await api(`studio/reconcile/${job.id}`, {});
                            setDoc(await api(`concepts/${doc.id}`));
                          })
                        }
                      >
                        Auftragsstatus prüfen / abbrechen
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <label>
                Zielkapitel für spätere Übernahme
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as Chapter)}
                >
                  {chapters.map(([key, title]) => (
                    <option key={key} value={key}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              <form
                id="concept-gpt-message"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label>
                  Was möchtest du entwickeln?
                  <textarea
                    id="concept-message"
                    aria-label="Was möchtest du entwickeln?"
                    rows={5}
                    maxLength={4000}
                    placeholder="Zum Beispiel: Entwickle ein Kommunikationskonzept für StudioONE."
                    value={message}
                    disabled={busy}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    id="concept-consent"
                    checked={consent}
                    disabled={busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Ich bin einverstanden, dass mein Konzept und die benötigten
                  Kundenangaben an GPT übermittelt werden. Kostenlimit pro
                  Anfrage: USD {index.config.textReserve.toFixed(2)}.
                </label>
                {(!doc || dirty) && (
                  <p className="muted">
                    Beim GPT-Start wird dein Konzept automatisch angelegt und gespeichert.
                  </p>
                )}
                {!index.config.connected && (
                  <p>
                    GPT ist noch nicht verbunden. Der bestehende OpenAI-Zugang
                    muss aktiviert sein.
                  </p>
                )}
                {/* The primary GPT action is in the header, linked to this form. */}
              </form>
              <p className="muted">
                GPT-Vorschläge werden erst nach deiner Prüfung in die Kapitel übernommen.
              </p>
            </section>
            <section
              className="concept-document"
              aria-labelledby="concept-document-title"
            >
              <h2 id="concept-document-title">
                2. Dein Konzept{doc ? ` · Version ${doc.version}` : ""}
              </h2>
              <p role="status">
                {dirty
                  ? "Entwurf – Änderungen werden beim GPT-Start automatisch gespeichert"
                  : current?.approvedAt
                    ? `Freigegeben von ${name(current.approvedBy)}`
                    : "Entwurf"}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    const payload = {
                      ...form,
                      title: form.title.trim() || "Neues Kommunikationskonzept",
                    };
                    const saved = await api(
                      doc ? `concepts/${doc.id}` : "concepts",
                      doc ? { version: doc.version, data: payload } : payload,
                    );
                    await load(saved.id);
                    setNotice("Konzept gespeichert. Du kannst mit GPT weiterarbeiten.");
                  });
                }}
              >
                <fieldset disabled={busy}>
                  <legend className="sr-only">Konzept bearbeiten</legend>
                  <label>
                    Titel
                    <input
                      required
                      maxLength={200}
                      placeholder="Wird beim GPT-Start automatisch ergänzt"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Kunde
                    <select
                      disabled={!!doc}
                      value={form.customerId || ""}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          customerId: e.target.value || null,
                          campaignId: null,
                        });
                        setConsent(false);
                      }}
                    >
                      <option value="">Studiojeker · Eigenes Konzept</option>
                      {index.customers.map((customer) => (
                        <option
                          key={customer.id}
                          value={customer.id}
                          disabled={
                            customer.status !== "ACTIVE" &&
                            customer.id !== form.customerId
                          }
                        >
                          {customer.name}
                          {customer.status !== "ACTIVE" ? " (inaktiv)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Bestehende Kampagne / Projekt
                    <select
                      value={form.campaignId || ""}
                      onChange={(e) =>
                        setForm({ ...form, campaignId: e.target.value || null })
                      }
                    >
                      <option value="">Ohne Zuordnung</option>
                      {index.campaigns
                        .filter(
                          (campaign) => campaign.customerId === form.customerId,
                        )
                        .map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  {chapters.map(([key, title]) => (
                    <label key={key}>
                      {title}
                      <textarea
                        aria-label={title}
                        rows={5}
                        maxLength={4000}
                        value={form[key]}
                        onChange={(e) => {
                          setForm({ ...form, [key]: e.target.value });
                          setReviewed(false);
                        }}
                      />
                    </label>
                  ))}
                  <button type="submit" className="secondary" disabled={!dirty}>
                    {doc ? "Änderungen speichern" : "Entwurf speichern"}
                  </button>
                </fieldset>
              </form>
              {doc && (
                <>
                  <div
                    className="actions concept-exports"
                    aria-label="Konzept exportieren"
                  >
                    <a
                      href={`/api/concepts/${doc.id}/docx?version=${doc.version}`}
                    >
                      Gespeicherte Version als Word
                    </a>
                    <a
                      href={`/api/concepts/${doc.id}/print?version=${doc.version}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF / Druckansicht
                    </a>
                  </div>
                  <p className="muted">
                    Exporte enthalten nur die gespeicherte Version. In der
                    Druckansicht «Als PDF speichern» wählen.
                  </p>
                  {!current?.approvedAt && (
                    <>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={reviewed && !dirty}
                          disabled={dirty || busy}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />
                        Ich habe diese Version vollständig geprüft.
                      </label>
                      <button
                        disabled={
                          busy ||
                          dirty ||
                          !reviewed ||
                          chapters.some(([key]) => !form[key].trim())
                        }
                        onClick={() =>
                          void action(async () => {
                            await api(`concepts/${doc.id}/approve`, {
                              version: doc.version,
                              confirmed: true,
                            });
                            await load(doc.id);
                            setNotice("Konzeptversion freigegeben.");
                          })
                        }
                      >
                        Version {doc.version} freigeben
                      </button>
                    </>
                  )}
                  {current?.approvedAt && (
                    <section aria-label="Kampagne aus Konzept">
                      <h3>Als Kampagnenbriefing übernehmen</h3>
                      {current.handoffCampaignId ? (
                        <>
                          <p>Diese Version wurde bereits übernommen.</p>
                          <button
                            className="secondary"
                            disabled={busy || dirty}
                            onClick={openCampaigns}
                          >
                            Kampagnen öffnen
                          </button>
                        </>
                      ) : (
                        <>
                          <p>
                            Erstellt eine neue Kampagne. GPT verwendet das
                            vollständige freigegebene Konzept für ihre
                            Content-Serien.
                          </p>
                          <label>
                            Kampagnenbeginn
                            <input
                              type="date"
                              value={startsAt}
                              onChange={(e) => setStartsAt(e.target.value)}
                            />
                          </label>
                          <label>
                            Kampagnenende
                            <input
                              type="date"
                              value={endsAt}
                              min={startsAt}
                              onChange={(e) => setEndsAt(e.target.value)}
                            />
                          </label>
                          <button
                            disabled={
                              busy ||
                              dirty ||
                              !startsAt ||
                              !endsAt ||
                              endsAt < startsAt
                            }
                            onClick={() =>
                              void action(async () => {
                                await api(`concepts/${doc.id}/handoff`, {
                                  version: doc.version,
                                  startsAt: new Date(
                                    `${startsAt}T12:00:00Z`,
                                  ).toISOString(),
                                  endsAt: new Date(
                                    `${endsAt}T12:00:00Z`,
                                  ).toISOString(),
                                });
                                await load(doc.id);
                                setNotice(
                                  "Kampagne mit freigegebenem Konzeptbriefing erstellt.",
                                );
                              })
                            }
                          >
                            Neue Kampagne erstellen
                          </button>
                        </>
                      )}
                    </section>
                  )}
                  <details className="concept-history">
                    <summary>Gespeicherte Versionen ansehen</summary>
                    <label>
                      Version
                      <select
                        value={history}
                        onChange={(e) => setHistory(Number(e.target.value))}
                      >
                        {doc.versions.map((version) => (
                          <option key={version.version} value={version.version}>
                            Version {version.version} ·{" "}
                            {new Date(version.createdAt).toLocaleString(
                              "de-CH",
                            )}
                            {version.approvedAt
                              ? " · Freigegeben"
                              : " · Entwurf"}
                          </option>
                        ))}
                      </select>
                    </label>
                    {oldVersion && (
                      <>
                        <p>
                          Erstellt von {name(oldVersion.createdBy)}
                          {oldVersion.approvedBy
                            ? ` · Freigegeben von ${name(oldVersion.approvedBy)}`
                            : ""}
                        </p>
                        <h3>{oldVersion.payload.title}</h3>
                        {chapters.map(([key, title]) => (
                          <section key={key}>
                            <h4>{title}</h4>
                            <p className="studio-chat-message">
                              {oldVersion.payload[key] || "Noch offen"}
                            </p>
                          </section>
                        ))}
                      </>
                    )}
                  </details>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
