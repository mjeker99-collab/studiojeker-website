import { randomUUID } from "node:crypto";
import { contactInput } from "../import";
import { PolicyError } from "../policy";
import { importContacts } from "../workflow";
import { db } from "../db";
import { ORG } from "../studio/input";
import { emailDomain, hostOf, normalizeEmail } from "./normalize";
import { assessTabs, type DedupeRecord } from "./dedupe";
import { leadResearchEnabled, researchConfig } from "./config";
import { toCsv, toXlsx } from "./export-file";
import { createGoogleSheetsGateway } from "./google-sheets";
import {
  createJob,
  runStep,
  type ResearchProvider,
  type StepDeps,
} from "./pipeline";
import { PrismaLeadStore, storageMessage } from "./prisma-store";
import { createProvider } from "./providers";
import { SHEET_HEADERS, type JobRecord, type LeadResearchView, type ResearchConfig } from "./types";
import { toView } from "./view";
import { zurichDay } from "./time";

const loops = new Set<string>();

function store(): PrismaLeadStore {
  return new PrismaLeadStore();
}

async function localRecords(jobId: string | null): Promise<{ records: DedupeRecord[]; legacyOpen: number }> {
  const [contacts, customers, suppressions, previous] = await Promise.all([
    db.contact.findMany({
      where: { organizationId: ORG },
      select: { email: true, organisation: true, firstName: true, lastName: true, website: true },
    }),
    db.customer.findMany({
      where: { organizationId: ORG },
      select: { name: true, contactEmail: true, website: true },
    }),
    db.suppression.findMany({ select: { email: true, reason: true } }),
    db.leadResearchJob.findMany({
      where: { organizationId: ORG, ...(jobId ? { id: { not: jobId } } : {}) },
      select: { state: true },
    }),
  ]);
  const records: DedupeRecord[] = [
    ...contacts.map((contact) => ({
      email: contact.email,
      organisation: contact.organisation,
      person: `${contact.firstName} ${contact.lastName}`,
      domain: emailDomain(contact.email) || hostOf(contact.website),
      source: "contact" as const,
      label: "StudioONE-Kontakte",
    })),
    ...customers.map((customer) => ({
      email: customer.contactEmail,
      organisation: customer.name,
      person: "",
      domain: emailDomain(customer.contactEmail) || hostOf(customer.website),
      source: "customer" as const,
      label: "Bestandskunden",
    })),
    ...suppressions.map((entry) => ({
      email: entry.email,
      organisation: "",
      person: "",
      domain: emailDomain(entry.email),
      source: "suppression" as const,
      label: "Sperrliste",
    })),
  ];
  let legacyOpen = 0;
  for (const row of previous) {
    const state = row.state as unknown as JobRecord;
    for (const candidate of state.candidates ?? []) {
      if (candidate.status === "OPEN" || candidate.status === "QUALIFIED") legacyOpen += candidate.status === "OPEN" ? 1 : 0;
      records.push({
        email: candidate.email,
        organisation: candidate.organisation,
        person: `${candidate.firstName} ${candidate.lastName}`,
        domain: emailDomain(candidate.email),
        source: "supplement",
        label: "Frühere Recherche",
      });
    }
  }
  return { records, legacyOpen };
}

async function buildDeps(env: NodeJS.ProcessEnv, jobId: string, userId: string | null, provider: ResearchProvider): Promise<StepDeps> {
  const local = await localRecords(jobId).catch((error) => {
    const message = storageMessage(error);
    if (message) throw new Error(message);
    throw error;
  });
  const write = env.LEAD_RESEARCH_SHEETS_WRITE === "true";
  const gateway = createGoogleSheetsGateway(env, write);
  let records = local.records;
  let complete = false;
  let blocker = "Die Masterliste ist nicht konfiguriert. Neue Leads bleiben gespeichert und werden nicht in Google Sheets geschrieben.";
  if (gateway) {
    const read = await gateway.readTabs();
    if (read.failure) {
      blocker = read.failure.message;
    } else {
      const assessed = assessTabs(read.tabs, SHEET_HEADERS);
      records = [...records, ...assessed.records];
      complete = assessed.complete;
      blocker = assessed.blocker;
    }
  }
  return {
    provider,
    corpus: records,
    reconciliationComplete: complete,
    reconciliationBlocker: blocker,
    sheets: write && complete ? gateway : null,
    admit: env.LEAD_RESEARCH_ADMIT_CONTACTS === "true" && userId
      ? async (candidate) => {
          const row = contactInput.parse({
            organisation: candidate.organisation,
            industry: candidate.industry,
            region: candidate.place,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            position: candidate.role,
            email: normalizeEmail(candidate.email),
            website: candidate.website,
            sourceUrl: candidate.hooks[0]?.url || "",
            confidence: "UNCONFIRMED",
            hook: candidate.hooks.map((hook) => hook.excerpt).join(" | "),
            notes: candidate.hints.slice(0, 4000),
            newsletterConsent: false,
            legalCategory: "UNASSESSED",
          });
          await importContacts(userId, [row], { dedupeEmails: true });
        }
      : null,
  };
}

function disabledView(): LeadResearchView {
  return toView(null, {
    enabled: false,
    modeLabel: "Die Recherche ist noch nicht eingeschaltet. Eine Administratorin aktiviert sie serverseitig. Es wird nichts gesucht und nichts versendet.",
  });
}

async function currentJob(now = new Date()): Promise<JobRecord | null> {
  const active = await store().active();
  if (active) return active;
  const jobs = await store().listDay(zurichDay(now));
  return jobs.find((job) => job.status === "RUNNING" || job.status === "PAUSED" || job.status === "QUEUED")
    ?? jobs.at(-1)
    ?? null;
}

export async function leadResearchStatus(): Promise<LeadResearchView> {
  if (!leadResearchEnabled()) return disabledView();
  try {
    const provider = createProvider();
    const job = await currentJob();
    const view = toView(job, {
      enabled: true,
      modeLabel: provider.blocker ?? "Suchquelle ist verbunden. Es wird nichts versendet.",
    });
    if (!provider.blocker) return view;
    return {
      ...view,
      blockers: view.blockers.some((item) => item.id === "provider")
        ? view.blockers
        : [...view.blockers, { id: "provider", message: provider.blocker }],
    };
  } catch (error) {
    const message = storageMessage(error) ?? (error instanceof Error ? error.message : "Status nicht lesbar.");
    const view = toView(null, { enabled: true, modeLabel: message });
    return { ...view, blockers: [{ id: "storage", message }] };
  }
}

async function loop(jobId: string, userId: string | null) {
  const owner = `worker:${randomUUID()}`;
  try {
    for (let step = 0; step < 5000; step += 1) {
      const provider = createProvider();
      const existing = await store().get(jobId);
      if (!existing || !["RUNNING", "QUEUED"].includes(existing.status)) break;
      const deps = await buildDeps(process.env, existing.id, userId, provider);
      const result = await runStep(store(), deps, jobId, owner, new Date());
      if (!result.continue) break;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, Math.max(50, result.waitMs)));
    }
  } catch {
    // Keep the checkpoint and let the next scheduler tick retry after the lease.
    console.error("Lead-Recherche unterbrochen. Der gespeicherte Lauf wird erneut aufgenommen.");
  } finally {
    loops.delete(jobId);
  }
}

export function kickLeadResearch(jobId: string, userId: string | null) {
  if (!leadResearchEnabled() || loops.has(jobId)) return;
  loops.add(jobId);
  void loop(jobId, userId);
}

export async function leadResearchStart(userId: string | null, raw: unknown) {
  if (!leadResearchEnabled()) {
    throw new PolicyError("Die Recherche ist nicht eingeschaltet.", 403);
  }
  const override = raw && typeof raw === "object" ? raw as Partial<ResearchConfig> : {};
  const config = researchConfig(process.env, override);
  const now = new Date();
  const draft = createJob(config, now);
  const existing = await store().getByKey(draft.idempotencyKey);
  if (existing) {
    if (existing.status === "PAUSED") return toView(existing, { enabled: true, modeLabel: "Pausiert. Fortsetzen startet denselben Lauf." });
    if (existing.status === "RUNNING" || existing.status === "QUEUED") kickLeadResearch(existing.id, userId);
    return toView(existing, { enabled: true, modeLabel: createProvider().blocker ?? "Lauf ist gespeichert. Es wird nichts versendet." });
  }
  let local: Awaited<ReturnType<typeof localRecords>>;
  try {
    local = await localRecords(null);
  } catch (error) {
    throw new PolicyError(error instanceof Error ? error.message : "Speichern nicht möglich.", 503);
  }
  let job = createJob(config, now, local.legacyOpen);
  job.providerMode = createProvider().mode;
  try {
    job = await store().start(job);
  } catch (error) {
    const message = storageMessage(error) ?? "Der Lauf konnte nicht gespeichert werden. Es wurde nichts überschrieben.";
    throw new PolicyError(message, 503);
  }
  kickLeadResearch(job.id, userId);
  return toView(job, { enabled: true, modeLabel: createProvider().blocker ?? "Recherche gestartet. Es wird nichts versendet." });
}

async function setStatus(userId: string, status: JobRecord["status"]) {
  if (!leadResearchEnabled()) throw new PolicyError("Die Recherche ist nicht eingeschaltet.", 403);
  const job = await currentJob();
  if (!job) return leadResearchStatus();
  if (status === "RUNNING" && !["PAUSED", "BLOCKED"].includes(job.status)) return leadResearchStatus();
  if (status !== "RUNNING" && !["RUNNING", "QUEUED", "PAUSED"].includes(job.status)) return leadResearchStatus();
  const saved = await store().save({ ...job, status }, job.revision);
  if (!saved) return leadResearchStatus();
  if (status === "RUNNING") kickLeadResearch(job.id, userId);
  const fresh = await store().get(job.id);
  return toView(fresh, { enabled: true, modeLabel: "Es wird nichts versendet." });
}

export function leadResearchPause(userId: string) {
  return setStatus(userId, "PAUSED");
}
export function leadResearchResume(userId: string) {
  return setStatus(userId, "RUNNING");
}
export function leadResearchAbort(userId: string) {
  return setStatus(userId, "ABORTED");
}

export async function leadResearchTick(userId: string | null) {
  if (!leadResearchEnabled()) return leadResearchStatus();
  const job = await currentJob();
  if (job && (job.status === "RUNNING" || job.status === "QUEUED")) {
    kickLeadResearch(job.id, userId);
  } else if (
    userId === null && process.env.LEAD_RESEARCH_DAILY === "true" &&
    !createProvider().blocker
  ) {
    return leadResearchStart(null, {});
  }
  return leadResearchStatus();
}

export async function leadResearchExport(format: "xlsx" | "csv") {
  if (!leadResearchEnabled()) throw new PolicyError("Die Recherche ist nicht eingeschaltet.", 403);
  const job = await currentJob();
  if (!job || !job.candidates.length) throw new PolicyError("Es gibt noch keine gespeicherten Ergebnisse.");
  if (format === "csv") {
    return {
      body: Buffer.from(toCsv(job.candidates), "utf8"),
      type: "text/csv; charset=utf-8",
      filename: "lead-recherche.csv",
    };
  }
  return {
    body: await toXlsx(job.candidates),
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "lead-recherche.xlsx",
  };
}
