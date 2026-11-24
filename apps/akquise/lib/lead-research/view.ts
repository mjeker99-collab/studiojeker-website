import { dailyScore } from "./pipeline";
import { promoActive } from "./time";
import { LEAD_RESEARCH_DEFAULTS, type JobRecord, type LeadResearchView } from "./types";

const LABELS: Record<string, string> = {
  QUALIFIED: "Neu belegt",
  OPEN: "Offen zur Prüfung",
  DUPLICATE: "Bereits vorhanden",
  EXCLUDED: "Ausgeschlossen",
};

export function statusLabel(job: JobRecord | null, shortfall: number): string {
  if (!job || job.status === "QUEUED") return "Bereit zum Start";
  if (job.status === "RUNNING") return "Recherche läuft";
  if (job.status === "PAUSED") return "Pausiert";
  if (job.status === "ABORTED") return "Abgebrochen";
  if (job.status === "BLOCKED") return "Blockiert";
  if (shortfall === 0) return "Tagesziel erreicht";
  return "Beendet, Tagesziel nicht erreicht";
}

export function toView(
  job: JobRecord | null,
  options: { enabled: boolean; modeLabel: string },
): LeadResearchView {
  const config = job?.config;
  const metrics = job
    ? dailyScore(job.candidates, job.dayKey, job.config.target, job.legacyOpen)
    : {
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
      };
  return {
    enabled: options.enabled,
    status: job?.status ?? "IDLE",
    statusLabel: job ? statusLabel(job, metrics.shortfall) : "Bereit zum Start",
    region: config?.regionLabel ?? LEAD_RESEARCH_DEFAULTS.regionLabel,
    radiusKm: config?.radiusKm ?? LEAD_RESEARCH_DEFAULTS.radiusKm,
    target: config?.target ?? LEAD_RESEARCH_DEFAULTS.target,
    audience: config?.audience ?? LEAD_RESEARCH_DEFAULTS.audience,
    employeeMin: config?.employeeMin ?? LEAD_RESEARCH_DEFAULTS.employeeMin,
    employeeMax: config?.employeeMax ?? LEAD_RESEARCH_DEFAULTS.employeeMax,
    priceChf: config?.priceChf ?? LEAD_RESEARCH_DEFAULTS.priceChf,
    promoUntil: config?.promoUntil ?? LEAD_RESEARCH_DEFAULTS.promoUntil,
    promoActive: promoActive(job?.dayKey ?? LEAD_RESEARCH_DEFAULTS.promoUntil, config?.promoUntil ?? LEAD_RESEARCH_DEFAULTS.promoUntil),
    industries: config ? [...config.industries] : [...LEAD_RESEARCH_DEFAULTS.industries],
    metrics,
    blockers: job?.blockers ?? [],
    lastError: job?.lastError ?? "",
    modeLabel: options.modeLabel,
    sendBlocked: true,
    results: (job?.candidates ?? []).slice(-8).reverse().map((candidate) => ({
      organisation: candidate.organisation || "Unbekannte Firma",
      place: candidate.place || "Ort offen",
      label: LABELS[candidate.status] ?? candidate.status,
    })),
    exportReady: metrics.exportReady,
  };
}

