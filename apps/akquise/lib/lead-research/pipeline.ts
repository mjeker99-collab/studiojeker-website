import { createHash, randomBytes } from "node:crypto";
import { evaluateObservation, observePages, toContactInput } from "./candidate";
import { syncSheets, type SheetsGateway } from "./sheets";
import { buildQuery, planPlaces, SOURCE_FAMILIES } from "./sources";
import { groupWebsitePages } from "./website";
import { zurichDay } from "./time";
import type {
  Blocker,
  Candidate,
  Cursor,
  FetchedPage,
  JobRecord,
  LeadResearchMetrics,
  ResearchConfig,
} from "./types";
import type { DedupeRecord } from "./dedupe";

export interface ProviderResult {
  pages: FetchedPage[];
  estimatedCostUsd: number;
  transient?: boolean;
  error?: string;
}

export interface ResearchProvider {
  mode: "live" | "fixture" | "unconfigured";
  blocker: string | null;
  reserveUsd: number;
  next(query: string): Promise<ProviderResult>;
}

export interface StepDeps {
  provider: ResearchProvider;
  corpus: DedupeRecord[];
  reconciliationComplete: boolean;
  reconciliationBlocker: string;
  sheets: SheetsGateway | null;
  admit: ((candidate: Candidate) => Promise<void>) | null;
}

export interface StepOutcome {
  job: JobRecord;
  continue: boolean;
  waitMs: number;
}

function hashConfig(config: ResearchConfig): string {
  return createHash("sha256")
    .update(JSON.stringify([
      config.regionLabel,
      config.radiusKm,
      config.target,
      config.audience,
      config.employeeMin,
      config.employeeMax,
    ]))
    .digest("hex")
    .slice(0, 12);
}

export function createJob(config: ResearchConfig, now: Date, legacyOpen = 0): JobRecord {
  const dayKey = zurichDay(now);
  return {
    id: `lr_${randomBytes(8).toString("hex")}`,
    idempotencyKey: `lead-research:${dayKey}:${hashConfig(config)}`,
    dayKey,
    status: "RUNNING",
    revision: 1,
    leaseOwner: "",
    leaseUntil: null,
    config,
    cursor: { sourceIndex: 0, industryIndex: 0, placeIndex: 0, pass: 0, exhausted: false },
    candidates: [],
    blockers: [],
    costUsd: 0,
    fetches: 0,
    startedAt: now.toISOString(),
    lastError: "",
    legacyOpen,
    attempts: 0,
    nextAttemptAt: null,
    sheetsPhase: "idle",
    providerMode: "unconfigured",
  };
}

export function dailyScore(
  candidates: Candidate[],
  dayKey: string,
  target: number,
  legacyOpen: number,
): LeadResearchMetrics {
  const seen = new Set<string>();
  const todays = candidates.filter((candidate) => {
    if (candidate.legacy || candidate.dayKey !== dayKey) return false;
    if (seen.has(candidate.idempotencyKey)) return false;
    seen.add(candidate.idempotencyKey);
    return true;
  });
  const verifiedNew = todays.filter((candidate) => candidate.status === "QUALIFIED").length;
  return {
    target,
    verifiedNew,
    duplicates: todays.filter((candidate) => candidate.status === "DUPLICATE").length,
    excluded: todays.filter((candidate) => candidate.status === "EXCLUDED").length,
    openReviews: todays.filter((candidate) => candidate.status === "OPEN").length,
    legacyOpen,
    draftsComplete: todays.filter((candidate) => candidate.draftComplete && !candidate.legacy).length,
    exportReady: candidates.length > 0,
    sheetsConfirmed: todays.filter((candidate) => candidate.sheetsConfirmed).length,
    shortfall: Math.max(0, target - verifiedNew),
  };
}

function addBlocker(job: JobRecord, blocker: Blocker) {
  if (!job.blockers.some((item) => item.id === blocker.id)) job.blockers.push(blocker);
}

function advance(cursor: Cursor, config: ResearchConfig): Cursor {
  const places = planPlaces(config).length;
  const industries = config.industries.length;
  const sources = SOURCE_FAMILIES.length;
  let { sourceIndex, industryIndex, placeIndex, pass } = cursor;
  placeIndex += 1;
  if (placeIndex >= places) {
    placeIndex = 0;
    industryIndex += 1;
  }
  if (industryIndex >= industries) {
    industryIndex = 0;
    sourceIndex += 1;
  }
  if (sourceIndex >= sources) {
    sourceIndex = 0;
    pass += 1;
  }
  if (pass >= config.passes) {
    return { sourceIndex, industryIndex, placeIndex, pass, exhausted: true };
  }
  return { sourceIndex, industryIndex, placeIndex, pass, exhausted: false };
}

function finish(job: JobRecord, status: JobRecord["status"], blocker?: Blocker): StepOutcome {
  job.status = status;
  if (blocker) addBlocker(job, blocker);
  return { job, continue: false, waitMs: 0 };
}

export async function stepJob(job: JobRecord, deps: StepDeps, now: Date): Promise<StepOutcome> {
  const next: JobRecord = {
    ...job,
    config: { ...job.config, industries: [...job.config.industries] },
    cursor: { ...job.cursor },
    candidates: job.candidates.map((candidate) => ({ ...candidate, hooks: [...candidate.hooks] })),
    blockers: [...job.blockers],
  };
  if (next.status === "PAUSED" || next.status === "ABORTED" || next.status === "COMPLETED" || next.status === "BLOCKED") {
    return { job: next, continue: false, waitMs: 0 };
  }
  next.status = "RUNNING";
  if (!next.startedAt) next.startedAt = now.toISOString();
  const score = () => dailyScore(next.candidates, next.dayKey, next.config.target, next.legacyOpen);
  if (score().verifiedNew >= next.config.target) {
    return finish(next, "COMPLETED");
  }
  if (next.nextAttemptAt && new Date(next.nextAttemptAt).getTime() > now.getTime()) {
    return {
      job: next,
      continue: true,
      waitMs: new Date(next.nextAttemptAt).getTime() - now.getTime(),
    };
  }
  const runtimeMs = next.config.maxRuntimeMinutes * 60_000;
  if (now.getTime() - new Date(next.startedAt).getTime() > runtimeMs) {
    return finish(next, "COMPLETED", {
      id: "time_limit",
      message: "Die maximale Laufzeit ist erreicht. Das Tagesziel ist damit nicht automatisch erfüllt.",
    });
  }
  if (next.fetches >= next.config.maxFetches) {
    return finish(next, "COMPLETED", {
      id: "fetch_limit",
      message: "Die maximale Anzahl Abrufe ist erreicht.",
    });
  }
  if (next.costUsd + deps.provider.reserveUsd > next.config.maxCostUsd) {
    return finish(next, "COMPLETED", {
      id: "cost_limit",
      message: "Das Kostenlimit ist erreicht. Es wird kein weiterer kostenpflichtiger Abruf gemacht.",
    });
  }
  if (deps.provider.blocker) {
    next.providerMode = deps.provider.mode;
    return finish(next, "BLOCKED", { id: "provider", message: deps.provider.blocker });
  }
  next.providerMode = deps.provider.mode;
  if (!deps.reconciliationComplete && deps.reconciliationBlocker) {
    addBlocker(next, { id: "reconciliation", message: deps.reconciliationBlocker });
  }
  if (next.cursor.exhausted) {
    return finish(next, "COMPLETED", {
      id: "sources_exhausted",
      message: "Die hinterlegten Quellen, Branchen und Orte sind durchsucht. Fehlende Leads werden nicht aufgefüllt.",
    });
  }
  const planned = buildQuery(next.config, next.cursor);
  if (!planned) {
    next.cursor = { ...next.cursor, exhausted: true };
    return finish(next, "COMPLETED", {
      id: "sources_exhausted",
      message: "Es gibt keine weitere Suchkombination.",
    });
  }
  let result: ProviderResult;
  try {
    result = await deps.provider.next(planned.text);
  } catch (error) {
    result = {
      pages: [],
      estimatedCostUsd: 0,
      transient: true,
      error: error instanceof Error ? error.message : "Quelle nicht erreichbar.",
    };
  }
  if (next.costUsd + result.estimatedCostUsd > next.config.maxCostUsd) {
    return finish(next, "COMPLETED", {
      id: "cost_limit",
      message: "Das Kostenlimit ist erreicht. Es wird kein weiterer kostenpflichtiger Abruf gemacht.",
    });
  }
  next.costUsd += result.estimatedCostUsd;
  next.fetches += 1;
  if (result.transient) {
    next.attempts += 1;
    next.lastError = result.error || "Vorübergehender Fehler der Quelle.";
    if (next.attempts >= 4) {
      addBlocker(next, {
        id: `source_${next.cursor.sourceIndex}`,
        message: `Quelle «${planned.label}» übersprungen: ${next.lastError}`,
      });
      next.cursor = advance(next.cursor, next.config);
      next.attempts = 0;
      next.nextAttemptAt = null;
    } else {
      const wait = Math.min(60_000, 500 * 2 ** next.attempts);
      next.nextAttemptAt = new Date(now.getTime() + wait).toISOString();
      return { job: next, continue: true, waitMs: wait };
    }
  } else {
    next.attempts = 0;
    next.nextAttemptAt = null;
    if (result.error) next.lastError = result.error;
    const pageGroups = deps.provider.mode === "live" ? groupWebsitePages(result.pages) : [result.pages];
    for (const pages of pageGroups) {
      if (score().verifiedNew >= next.config.target) break;
      const observation = observePages(pages, next.config.industries[next.cursor.industryIndex] || "", planned.label);
      if (!observation) continue;
      const candidate = evaluateObservation(
        observation,
        next.config,
        next.dayKey,
        [...deps.corpus, ...next.candidates.map(asRecord)],
        planned.label,
        now.toISOString(),
      );
      candidate.holdAdmission = !deps.reconciliationComplete;
      if (!next.candidates.some((item) => item.idempotencyKey === candidate.idempotencyKey)) {
        next.candidates.push(candidate);
      }
    }
    next.cursor = advance(next.cursor, next.config);
  }
  await persistCandidates(next, deps);
  if (score().verifiedNew >= next.config.target || next.cursor.exhausted) {
    return finish(
      next,
      "COMPLETED",
      next.cursor.exhausted && score().verifiedNew < next.config.target
        ? {
            id: "sources_exhausted",
            message: "Die hinterlegten Quellen sind ausgeschöpft. Das Tagesziel bleibt ein Ziel, keine Garantie.",
          }
        : undefined,
    );
  }
  return { job: next, continue: true, waitMs: next.config.minIntervalMs };
}

async function persistCandidates(next: JobRecord, deps: StepDeps) {
  if (deps.reconciliationComplete && deps.sheets && next.sheetsPhase !== "stopped") {
    await syncSheets(next, deps.sheets);
  }
  if (deps.reconciliationComplete && deps.admit) {
    for (const candidate of next.candidates) {
      if (candidate.status !== "QUALIFIED" || candidate.admitted || candidate.holdAdmission || candidate.legacy) continue;
      const row = toContactInput(candidate);
      if (row.newsletterConsent !== false) throw new Error("Versandfreigabe ist blockiert.");
      await deps.admit(candidate);
      candidate.admitted = true;
    }
  }
}

function asRecord(candidate: Candidate): DedupeRecord {
  return {
    email: candidate.email,
    organisation: candidate.organisation,
    person: `${candidate.firstName} ${candidate.lastName}`,
    domain: candidate.email.split("@")[1] || "",
    source: "legacy",
    label: "dieser Lauf",
  };
}

export interface LeadStore {
  get(id: string): Promise<JobRecord | null>;
  getByKey(key: string): Promise<JobRecord | null>;
  listDay(dayKey: string): Promise<JobRecord[]>;
  insert(job: JobRecord): Promise<void>;
  save(job: JobRecord, expectedRevision: number): Promise<boolean>;
}

export class MemoryLeadStore implements LeadStore {
  jobs: JobRecord[] = [];
  async get(id: string) {
    return this.jobs.find((job) => job.id === id) ?? null;
  }
  async getByKey(key: string) {
    return this.jobs.find((job) => job.idempotencyKey === key) ?? null;
  }
  async listDay(dayKey: string) {
    return this.jobs.filter((job) => job.dayKey === dayKey);
  }
  async insert(job: JobRecord) {
    if (this.jobs.some((item) => item.idempotencyKey === job.idempotencyKey)) {
      throw new Error("Lauf existiert bereits.");
    }
    this.jobs.push(structuredClone(job));
  }
  async save(job: JobRecord, expectedRevision: number) {
    const index = this.jobs.findIndex((item) => item.id === job.id);
    if (index < 0 || this.jobs[index].revision !== expectedRevision) return false;
    this.jobs[index] = structuredClone({ ...job, revision: expectedRevision + 1 });
    return true;
  }
}

export function leaseHeld(job: JobRecord, owner: string, now: Date): boolean {
  if (!job.leaseUntil || !job.leaseOwner || job.leaseOwner === owner) return false;
  return new Date(job.leaseUntil).getTime() > now.getTime();
}

export async function runStep(
  store: LeadStore,
  deps: StepDeps,
  jobId: string,
  owner: string,
  now: Date,
): Promise<StepOutcome & { saved: boolean }> {
  const loaded = await store.get(jobId);
  if (!loaded) throw new Error("Lauf nicht gefunden.");
  if (
    leaseHeld(loaded, owner, now) ||
    loaded.status === "PAUSED" ||
    loaded.status === "ABORTED" ||
    loaded.status === "COMPLETED" ||
    loaded.status === "BLOCKED"
  ) {
    return { job: loaded, continue: false, waitMs: loaded.status === "RUNNING" ? 1000 : 0, saved: false };
  }
  const leased: JobRecord = {
    ...loaded,
    leaseOwner: owner,
    leaseUntil: new Date(now.getTime() + 180_000).toISOString(),
  };
  const locked = await store.save(leased, loaded.revision);
  if (!locked) return { job: loaded, continue: false, waitMs: 200, saved: false };
  const lockedJob = await store.get(jobId);
  if (!lockedJob) return { job: loaded, continue: false, waitMs: 0, saved: false };
  const stepped = await stepJob(
    { ...lockedJob, status: "RUNNING" },
    { ...deps, sheets: null, admit: null },
    now,
  );
  const checkpoint = { ...stepped.job, status: "RUNNING" as const };
  const checkpointed = await store.save(checkpoint, lockedJob.revision);
  if (!checkpointed) return { job: (await store.get(jobId)) ?? loaded, continue: false, waitMs: 0, saved: false };

  await persistCandidates(stepped.job, deps);
  const waitingForReadback = stepped.job.sheetsPhase === "reread";
  const stored: JobRecord = {
    ...stepped.job,
    status: waitingForReadback ? "RUNNING" : stepped.job.status,
    revision: lockedJob.revision + 1,
    leaseOwner: "",
    leaseUntil: null,
  };
  const saved = await store.save(stored, stored.revision);
  const after = (await store.get(jobId)) ?? stored;
  return { job: after, continue: saved && (stepped.continue || waitingForReadback) && after.status === "RUNNING", waitMs: waitingForReadback ? 5000 : stepped.waitMs, saved };
}
