"use client";
import { useRef, useState } from "react";
import type { AssistantResult } from "../lib/mail-assistant/input";
type Job = {
  id: string;
  status: string;
  input: { mode: string; briefing: string };
  result: AssistantResult | null;
  error?: string;
  createdAt: string;
};
async function request(path: string, body?: unknown) {
  const r = await fetch(
    `/api/mail-assistant/${path}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Auftrag konnte nicht abgeschlossen werden.");
  return data;
}
export default function MailAssistant({
  mode,
  items = [],
  industry = "",
  disabled = false,
  refresh,
  onBusyChange,
}: {
  mode: "RESEARCH" | "WRITE";
  items?: { id: string; version: number }[];
  industry?: string;
  disabled?: boolean;
  refresh: () => Promise<void>;
  onBusyChange?: (value: boolean) => void;
}) {
  const [briefing, setBriefing] = useState("");
  const [region, setRegion] = useState("");
  const [count, setCount] = useState(10);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [job, setJob] = useState<{
    id: string;
    result: AssistantResult;
  } | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [history, setHistory] = useState<Job[]>([]);
  const lock = useRef(false);
  async function loadHistory() {
    try {
      setHistory(await request("history"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verlauf nicht erreichbar.");
    }
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    onBusyChange?.(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auftrag fehlgeschlagen.");
    } finally {
      setWorking(false);
      onBusyChange?.(false);
      lock.current = false;
    }
  }
  const research = mode === "RESEARCH";
  async function generate() {
    setNotice("");
    if (research) {
      const value = await request("generate", {
        requestKey: crypto.randomUUID(),
        mode,
        briefing,
        region,
        industry,
        count,
      });
      setJob(value);
      setChosen(value.result.leads.map((_: unknown, i: number) => i));
      await loadHistory();
      return;
    }
    const selection = [...items];
    let saved = 0;
    const failures: string[] = [];
    for (let offset = 0; offset < selection.length; offset += 10) {
      setNotice(
        `Mailtexte ${offset + 1}–${Math.min(offset + 10, selection.length)} von ${selection.length} werden formuliert …`,
      );
      try {
        const value = await request("generate", {
          requestKey: crypto.randomUUID(),
          mode,
          briefing,
          items: selection.slice(offset, offset + 10),
        });
        const applied = await request("apply", { id: value.id });
        saved += applied.results.filter((r: { ok: boolean }) => r.ok).length;
        failures.push(
          ...applied.results
            .filter((r: { ok: boolean }) => !r.ok)
            .map((r: { message: string }) => r.message),
        );
      } catch (e) {
        failures.push(
          e instanceof Error ? e.message : "Formulieren unterbrochen.",
        );
        break;
      }
    }
    await refresh();
    await loadHistory();
    setNotice(
      `${saved} persönliche Mailtexte gespeichert. Bitte die aktualisierte Vorschau prüfen.`,
    );
    if (failures.length) setError(failures.join(" "));
  }
  return (
    <details
      className="panel"
      onToggle={(e) => {
        if (e.currentTarget.open) void loadHistory();
      }}
    >
      <summary>
        <strong>
          {research
            ? "Neue Leads recherchieren"
            : `Personalisierte Mailtexte mit GPT (${items.length})`}
        </strong>
      </summary>
      <p>
        {research
          ? "Zielgruppe und Angebot beschreiben. GPT sucht passende Unternehmen und berufliche Ansprechpartner mit Quellen."
          : "Ein Briefing für die ganze Auswahl. GPT formuliert jeden Entwurf anhand des jeweiligen Kontakts neu und speichert ihn für die gemeinsame Vorschau."}
      </p>
      <label>
        {research
          ? "Wen möchtest du erreichen und was anbieten?"
          : "Was möchtest du diesen Kontakten anbieten?"}
        <textarea
          disabled={disabled || working}
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          placeholder={
            research
              ? "Architekturbüros, denen wir Architekturvisualisierungen anbieten können"
              : "Unser Angebot vorstellen, kurz und persönlich, mit einer Einladung zum Gespräch"
          }
        />
      </label>
      {research && (
        <div className="form-grid">
          <label>
            Region
            <input
              value={region}
              disabled={disabled || working}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Zum Beispiel Solothurn und Bern"
            />
          </label>
          <label>
            Leads pro Recherche
            <select
              disabled={disabled || working}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <button
        type="button"
        disabled={
          disabled ||
          working ||
          briefing.trim().length < 10 ||
          (!research && !items.length)
        }
        onClick={() => void run(generate)}
      >
        {working
          ? "GPT arbeitet …"
          : research
            ? "Leads recherchieren"
            : `${items.length} Mailtexte persönlich formulieren`}
      </button>
      <p className="muted">
        {research
          ? "Nur belegte Kontakte werden vorgeschlagen. Fehlende E-Mail-Adressen werden gekennzeichnet. Übernehmen versendet keine Mail."
          : "Vorhandene Texte werden als neue Version gespeichert. Der Versand braucht danach deine Freigabe."}
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {research && job && (
        <section aria-label="Gefundene Leads">
          <h3>{job.result.leads.length} Leads gefunden</h3>
          <p>{job.result.note}</p>
          <label className="check">
            <input
              type="checkbox"
              disabled={disabled || working}
              checked={
                !!job.result.leads.length &&
                chosen.length === job.result.leads.length
              }
              onChange={(e) =>
                setChosen(
                  e.target.checked ? job.result.leads.map((_, i) => i) : [],
                )
              }
            />
            Alle gefundenen Leads auswählen
          </label>
          {job.result.leads.map((lead, i) => (
            <div key={i}>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={disabled || working}
                  checked={chosen.includes(i)}
                  onChange={(e) =>
                    setChosen((old) =>
                      e.target.checked
                        ? [...old, i]
                        : old.filter((v) => v !== i),
                    )
                  }
                />
                {lead.organisation} · {lead.firstName} {lead.lastName} ·{" "}
                {lead.email || "E-Mail nicht gefunden"}
              </label>
              <p>
                {lead.hook}{" "}
                <a href={lead.sourceUrl} target="_blank" rel="noreferrer">
                  Quelle öffnen
                </a>
              </p>
            </div>
          ))}
          <button
            type="button"
            disabled={disabled || working || !chosen.length}
            onClick={() =>
              void run(async () => {
                const r = await request("apply", {
                  id: job.id,
                  indices: chosen,
                });
                await refresh();
                setNotice(
                  `${r.imported} neue Kontakte übernommen, ${r.duplicates} bereits vorhanden. Du kannst sie jetzt in der Masterliste auswählen.`,
                );
              })
            }
          >
            {chosen.length} Leads in Masterliste übernehmen
          </button>
        </section>
      )}
      {!!history.filter((j) => j.input.mode === mode).length && (
        <details>
          <summary>
            Gespeicherte {research ? "Recherchen" : "Textaufträge"}
          </summary>
          {history
            .filter((j) => j.input.mode === mode)
            .map((j) => (
              <div key={j.id}>
                <p>
                  {new Date(j.createdAt).toLocaleString("de-CH")} ·{" "}
                  {j.input.briefing}
                </p>
                {j.status === "SUCCEEDED" && j.result ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={disabled || working}
                    onClick={() => {
                      if (research) {
                        setJob({ id: j.id, result: j.result! });
                        setChosen(j.result!.leads.map((_, i) => i));
                      } else
                        void run(async () => {
                          const r = await request("apply", { id: j.id });
                          await refresh();
                          setNotice(
                            `${r.results.filter((v: { ok: boolean }) => v.ok).length} Texte übernommen.`,
                          );
                          setError(
                            r.results
                              .filter((v: { ok: boolean }) => !v.ok)
                              .map((v: { message: string }) => v.message)
                              .join(" "),
                          );
                        });
                    }}
                  >
                    {research
                      ? "Recherche öffnen"
                      : "Gespeicherte Textvorschläge übernehmen"}
                  </button>
                ) : (
                  <p>
                    {j.error ||
                      "Auftrag läuft. Verlauf zum Aktualisieren erneut öffnen."}
                  </p>
                )}
              </div>
            ))}
        </details>
      )}
    </details>
  );
}
