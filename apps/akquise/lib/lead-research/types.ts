export const LEAD_RESEARCH_DEFAULTS = {
  regionLabel: "Solothurn",
  radiusKm: 10,
  target: 200,
  audience: "Gewerbe und kleine KMU",
  employeeMin: 5,
  employeeMax: 50,
  priceChf: 650,
  promoUntil: "2026-11-30",
  industries: [
    "Handwerk",
    "Gebäudetechnik",
    "Holz- und Metallbau",
    "Gartenbau",
    "Mobilität",
    "Lebensmittel",
    "IT",
    "Technischer Handel",
    "Energie",
  ],
} as const;

export const SHEET_HEADERS = [
  "Person",
  "Funktion",
  "Organisation",
  "Ort",
  "E-Mail",
  "Prüfstatus",
  "Prüfdatum",
  "Priorität",
  "Quellen-URL",
  "Newsletter-Einwilligung",
  "Akquise-Status",
  "Betreff",
  "E-Mail-Entwurf",
  "Herkunft",
  "Hinweise",
] as const;

export const EXPORT_HEADERS = [
  ...SHEET_HEADERS,
  "Recherche-Status",
  "Entfernung",
] as const;

export type DistanceStatus = "WITHIN" | "OUTSIDE" | "UNKNOWN";
export type CandidateStatus = "QUALIFIED" | "OPEN" | "DUPLICATE" | "EXCLUDED";
export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "ABORTED"
  | "BLOCKED";

export interface ResearchConfig {
  regionLabel: string;
  center: { lat: number; lon: number };
  radiusKm: number;
  target: number;
  audience: string;
  employeeMin: number;
  employeeMax: number;
  industries: string[];
  priceChf: number;
  promoUntil: string;
  maxCostUsd: number;
  maxRuntimeMinutes: number;
  maxFetches: number;
  passes: number;
  allowTeamMailbox: boolean;
  blockSize: number;
  minIntervalMs: number;
}

export interface Cursor {
  sourceIndex: number;
  industryIndex: number;
  placeIndex: number;
  pass: number;
  exhausted: boolean;
}

export interface Blocker {
  id: string;
  message: string;
}

export interface Evidence {
  label: string;
  url: string;
  excerpt: string;
}

export interface Candidate {
  idempotencyKey: string;
  legacy: boolean;
  dayKey: string;
  status: CandidateStatus;
  reason: string;
  organisation: string;
  place: string;
  distanceKm: number | null;
  distanceStatus: DistanceStatus;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  website: string;
  industry: string;
  employees: number | null;
  hooks: Evidence[];
  sources: Evidence[];
  evidence: Evidence[];
  checkedAt: string;
  subject: string;
  body: string;
  opening: [string, string] | null;
  draftComplete: boolean;
  newsletterConsent: false;
  akquiseStatus: "Nicht kontaktiert";
  sendBlocked: true;
  priority: "Hoch" | "Mittel" | "Niedrig";
  origin: string;
  hints: string;
  reviewStatus: string;
  sheetsConfirmed: boolean;
  admitted: boolean;
  holdAdmission: boolean;
}

export interface JobRecord {
  id: string;
  idempotencyKey: string;
  dayKey: string;
  status: JobStatus;
  revision: number;
  leaseOwner: string;
  leaseUntil: string | null;
  config: ResearchConfig;
  cursor: Cursor;
  candidates: Candidate[];
  blockers: Blocker[];
  costUsd: number;
  fetches: number;
  startedAt: string | null;
  lastError: string;
  legacyOpen: number;
  attempts: number;
  nextAttemptAt: string | null;
  sheetsPhase: "idle" | "reread" | "stopped";
  providerMode: string;
}

export interface FetchedPage {
  websiteText?: boolean;
  url: string;
  text: string;
  blockedReason?: string;
}

export interface LeadResearchMetrics {
  target: number;
  verifiedNew: number;
  duplicates: number;
  excluded: number;
  openReviews: number;
  legacyOpen: number;
  draftsComplete: number;
  exportReady: boolean;
  sheetsConfirmed: number;
  shortfall: number;
}

export interface LeadResearchView {
  enabled: boolean;
  status: JobStatus | "IDLE";
  statusLabel: string;
  region: string;
  radiusKm: number;
  target: number;
  audience: string;
  employeeMin: number;
  employeeMax: number;
  priceChf: number;
  promoUntil: string;
  promoActive: boolean;
  industries: string[];
  metrics: LeadResearchMetrics;
  blockers: Blocker[];
  lastError: string;
  modeLabel: string;
  sendBlocked: true;
  results: { organisation: string; place: string; label: string }[];
  exportReady: boolean;
}
