"use client";
import { useEffect, useState } from "react";
import "./lead-research.css";
import { promoLabel } from "../lib/lead-research/time";
import { LEAD_RESEARCH_DEFAULTS, type LeadResearchView } from "../lib/lead-research/types";

const empty: LeadResearchView = {
  enabled: false,
  status: "IDLE",
  statusLabel: "Status wird geladen",
  region: LEAD_RESEARCH_DEFAULTS.regionLabel,
  radiusKm: LEAD_RESEARCH_DEFAULTS.radiusKm,
  target: LEAD_RESEARCH_DEFAULTS.target,
  audience: LEAD_RESEARCH_DEFAULTS.audience,
  employeeMin: LEAD_RESEARCH_DEFAULTS.employeeMin,
  employeeMax: LEAD_RESEARCH_DEFAULTS.employeeMax,
  priceChf: LEAD_RESEARCH_DEFAULTS.priceChf,
  promoUntil: LEAD_RESEARCH_DEFAULTS.promoUntil,
  promoActive: true,
  industries: [...LEAD_RESEARCH_DEFAULTS.industries],
  metrics: {
    target: LEAD_RESEARCH_DEFAULTS.target,
    verifiedNew: 0,
    duplicates: 0,
    excluded: 0,
    openReviews: 0,
    legacyOpen: 0,
    draftsComplete: 0,
    exportReady: false,
    sheetsConfirmed: 0,
    shortfall: LEAD_RESEARCH_DEFAULTS.target,
  },
  blockers: [],
  lastError: "",
  modeLabel: "",
  sendBlocked: true,
  results: [],
  exportReady: false,
};

async function readJson(response: Response): Promise<LeadResearchView> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Die Anfrage ist fehlgeschlagen.");
  return body as LeadResearchView;
}

export function LeadResearchPanel({
  live = true,
  seed,
}: {
  live?: boolean;
  seed?: LeadResearchView;
}) {
  const [view, setView] = useState<LeadResearchView>(seed ?? empty);
  const [region, setRegion] = useState(seed?.region ?? empty.region);
  const [radiusKm, setRadiusKm] = useState(seed?.radiusKm ?? empty.radiusKm);
  const [target, setTarget] = useState(seed?.target ?? empty.target);
  const [audience, setAudience] = useState(seed?.audience ?? empty.audience);
  const [employeeMin, setEmployeeMin] = useState(seed?.employeeMin ?? empty.employeeMin);
  const [employeeMax, setEmployeeMax] = useState(seed?.employeeMax ?? empty.employeeMax);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live) return;
    let stop = false;
    async function load() {
      try {
        const response = await fetch("/api/lead-research/status", { cache: "no-store" });
        const next = await readJson(response);
        if (stop) return;
        setView(next);
        setRegion(next.region);
        setRadiusKm(next.radiusKm);
        setTarget(next.target);
        setAudience(next.audience);
        setEmployeeMin(next.employeeMin);
        setEmployeeMax(next.employeeMax);
      } catch (error) {
        if (!stop) setMessage(error instanceof Error ? error.message : "Status nicht geladen.");
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (view.status !== "RUNNING" && view.status !== "QUEUED") return;
      void fetch("/api/lead-research/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then(readJson)
        .then((next) => {
          if (!stop) setView(next);
        })
        .catch(() => undefined);
    }, 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [live, view.status]);

  async function download(format: "xlsx" | "csv") {
    if (!live) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/lead-research/export?format=${format}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Export fehlgeschlagen.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "csv" ? "lead-recherche.csv" : "lead-recherche.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function send(path: string, body?: unknown) {
    if (!live) {
      setView((current) => ({
        ...current,
        status: path === "pause" ? "PAUSED" : path === "abort" ? "ABORTED" : "RUNNING",
        statusLabel: path === "pause" ? "Pausiert" : path === "abort" ? "Abgebrochen" : "Recherche läuft",
      }));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/lead-research/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      setView(await readJson(response));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(false);
    }
  }

  const running = view.status === "RUNNING" || view.status === "QUEUED";
  const paused = view.status === "PAUSED";
  const primary = running
    ? { label: "Pause", action: () => send("pause") }
    : paused
      ? { label: "Fortsetzen", action: () => send("resume") }
      : {
          label: "Recherche starten",
          action: () => send("start", { regionLabel: region, radiusKm, target, audience, employeeMin, employeeMax }),
        };
  const metrics: [string, string | number][] = [
    ["Tagesziel", view.metrics.target],
    ["Neue belegte Leads", view.metrics.verifiedNew],
    ["Dubletten", view.metrics.duplicates],
    ["Ausgeschlossen", view.metrics.excluded],
    ["Offene Prüfungen", view.metrics.openReviews],
    ["Alte Nachträge", view.metrics.legacyOpen],
    ["Fertige Entwürfe", view.metrics.draftsComplete],
    ["Excel bereit", view.exportReady ? "Ja" : "Nein"],
    ["Sheets rückgelesen", view.metrics.sheetsConfirmed],
    ["Fehlbestand", view.metrics.shortfall],
  ];

  return (
    <section className="lead-research" aria-labelledby="lead-research-title">
      <p className="studioone-area-kicker">STUDIOONE · AKQUISE</p>
      <h2 id="lead-research-title">Neue Betriebe in der Region finden</h2>
      <p>
        Gewerbe und kleine Firmen rund um Solothurn. Nur belegte Kontakte, immer ohne Versand.
      </p>
      <div className="lead-research-grid">
        <label>
          Region
          <input value={region} onChange={(event) => setRegion(event.target.value)} autoComplete="off" />
        </label>
        <label>
          Umkreis in km
          <input
            type="number"
            min={1}
            max={50}
            inputMode="numeric"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
          />
        </label>
        <label>
          Tagesziel
          <input
            type="number"
            min={1}
            max={200}
            inputMode="numeric"
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
          />
        </label>
      </div>
      <details>
        <summary>Weitere Angaben</summary>
        <div className="lead-research-grid">
          <label>
            Zielgruppe
            <input value={audience} onChange={(event) => setAudience(event.target.value)} />
          </label>
          <label>
            Mitarbeitende von
            <input type="number" min={1} inputMode="numeric" value={employeeMin} onChange={(event) => setEmployeeMin(Number(event.target.value))} />
          </label>
          <label>
            Mitarbeitende bis
            <input type="number" min={1} inputMode="numeric" value={employeeMax} onChange={(event) => setEmployeeMax(Number(event.target.value))} />
          </label>
        </div>
        <p>Branchen: {view.industries.join(", ")}.</p>
        <p>Quellen: Gewerbevereine, HESO, Handelskammer, IHVG, VSSM, suissetec, EIT.swiss und offizielle Firmenwebsites.</p>
        <p>Visibility Abo ab CHF {view.priceChf} pro Monat. {promoLabel(view.promoUntil, view.promoActive)}</p>
      </details>
      <p className="lead-research-note" role="status">
        {view.statusLabel}. {view.modeLabel} Es wird nichts versendet. Neue Kontakte bleiben «Nicht kontaktiert».
      </p>
      <div className="lead-research-actions">
        <button
          type="button"
          className="primary-slot"
          disabled={busy || (!view.enabled && live)}
          onClick={primary.action}
        >
          {busy ? "Bitte warten" : primary.label}
        </button>
        {running || paused ? (
          <button type="button" className="secondary" disabled={busy} onClick={() => send("abort")}>
            Abbrechen
          </button>
        ) : null}
        {view.exportReady ? (
          <>
            <button type="button" className="secondary" disabled={busy} onClick={() => download("xlsx")}>
              Excel exportieren
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => download("csv")}>
              CSV exportieren
            </button>
          </>
        ) : null}
      </div>
      {message ? <p className="lead-research-blocker">{message}</p> : null}
      <div className="lead-research-metrics" aria-live="polite">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {view.blockers.map((blocker) => (
        <p key={blocker.id} className="lead-research-blocker">{blocker.message}</p>
      ))}
      {view.results.length ? (
        <ul>
          {view.results.map((result) => (
            <li key={`${result.organisation}-${result.place}-${result.label}`}>
              {result.organisation}, {result.place}: {result.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
