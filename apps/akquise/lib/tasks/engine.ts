import { Prisma } from "@prisma/client";
import { db } from "../db";
import { audit } from "../workflow";
import { hubActor, saveContentInTx, contentHash } from "../hub/workflow";
import { contentInput, type ContentInput } from "../hub/input";
import { newsletterText, renderNewsletter } from "../hub/newsletter-template";
import { PolicyError } from "../policy";
import { ProviderFailure } from "../studio/provider";
import { studioConfig } from "../studio/config";
import { connectionRegistry } from "./adapters";
import { layoutDecision, CURSOR_ADAPTER_BLOCK, type LayoutReport } from "./layout";
import { statusHeadline, nextStepText } from "./messages";
import { acceptTextProposal, editableTextSlots, mergeTextSlots } from "./proposal";
import { proposeNewsletterText } from "./revise";
import {
  LEASE_MS,
  RetryableTaskError,
  TaskBlocked,
  backoffMs,
  idempotencyKey,
  readResult,
  requiresApproval,
  taskInput,
  type StoredResult,
  type TaskType,
  type TextSlot,
} from "./types";

type Propose = typeof proposeNewsletterText;

type Deps = {
  providerReady: () => boolean;
  propose: Propose;
  now: () => Date;
  layout: (input: {
    taskId: string;
    instruction: string;
    contentVersion: number;
  }) => Promise<LayoutReport>;
  beforeApply?: () => Promise<void>;
};

const defaultDeps: Deps = {
  providerReady: () => studioConfig().connected,
  propose: proposeNewsletterText,
  now: () => new Date(),
  layout: async () => ({ blocked: CURSOR_ADAPTER_BLOCK }),
};

let deps: Deps = { ...defaultDeps };

export function setTaskDeps(next: Partial<Deps>) {
  deps = { ...defaultDeps, ...next };
}

export function resetTaskDeps() {
  deps = { ...defaultDeps };
}

const AI_MISSING =
  "Die Textüberarbeitung ist noch nicht verbunden. Ein Administrator muss die KI-Anbindung aktivieren.";
const APPROVAL_HELD =
  "Freigabe ist gespeichert. Versand, Veröffentlichung und ähnliche Aktionen bleiben in diesem Pilot ausgeschaltet.";
const VERSION_CONFLICT =
  "Der Newsletter wurde inzwischen geändert. Nichts wurde überschrieben.";

function dayStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function presentTask(
  task: Prisma.GptTaskGetPayload<{ include?: { steps: true } }> & {
    steps?: { name: string; status: string; detail: string; createdAt: Date }[];
  },
) {
  const result = readResult(task.result);
  return {
    id: task.id,
    contentId: task.contentId,
    contentVersion: task.contentVersion,
    customerId: task.customerId,
    campaignId: task.campaignId,
    type: task.type,
    instruction: task.instruction,
    status: task.status,
    step: task.step,
    attempt: task.attempt,
    externalJobId: task.externalJobId,
    error: task.error,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    result: result.version
      ? {
          version: result.version,
          changedSlots: result.changedSlots || [],
          previewReady: result.previewReady === true,
        }
      : null,
    headline: statusHeadline(task.status, task.error),
    nextStep: nextStepText(task.status),
    steps: (task.steps || []).map((step) => ({
      name: step.name,
      status: step.status,
      detail: step.detail,
      createdAt: step.createdAt,
    })),
  };
}

async function recordStep(
  tx: Prisma.TransactionClient,
  taskId: string,
  name: string,
  status: string,
  detail: string,
  attempt: number,
) {
  await tx.gptTaskStep.create({
    data: { taskId, name, status, detail, attempt },
  });
}

export async function createTask(actor: string, raw: unknown) {
  const input = taskInput.parse(raw);
  const task = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const since = dayStart(deps.now());
    const today = await tx.gptTask.count({
      where: { userId: actor, createdAt: { gte: since } },
    });
    if (today >= studioConfig().dailyRequests)
      throw new PolicyError(
        "Heute sind keine weiteren Aufträge möglich.",
        429,
      );
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + input.contentId}))`;
    const content = await tx.marketingContent.findFirst({
      where: { id: input.contentId, organizationId: "studiojeker" },
      include: { campaign: true },
    });
    if (!content || content.kind !== "NEWSLETTER")
      throw new PolicyError("Newsletter nicht gefunden.", 404);
    if (content.version !== input.version)
      throw new PolicyError("Newsletter wurde geändert. Neu laden.", 409);
    const version = await tx.marketingVersion.findUnique({
      where: {
        contentId_version: { contentId: content.id, version: content.version },
      },
    });
    const payload = version ? contentInput.safeParse(version.payload) : null;
    if (!payload?.success || !payload.data.newsletter)
      throw new PolicyError(
        "Dieser Newsletter hat keine gespeicherte Vorlage.",
        409,
      );
    const key = idempotencyKey({ ...input, userId: actor });
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"gpt-task:" + key}))`;
    const existing = await tx.gptTask.findUnique({
      where: { idempotencyKey: key },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) return existing;
    const approval = requiresApproval(input.type);
    const layout = input.type === "NEWSLETTER_LAYOUT";
    const aiMissing =
      input.type === "NEWSLETTER_REVISE_TEXT" && !deps.providerReady();
    const status = approval
      ? "WAITING_APPROVAL"
      : layout || aiMissing
        ? "BLOCKED"
        : "QUEUED";
    const error = approval
      ? null
      : layout
        ? CURSOR_ADAPTER_BLOCK
        : aiMissing
          ? AI_MISSING
          : null;
    const step = approval ? "approval" : status === "BLOCKED" ? "blocked" : "queued";
    const created = await tx.gptTask.create({
      data: {
        userId: actor,
        customerId: content.campaign?.customerId ?? null,
        campaignId: content.campaignId,
        contentId: content.id,
        contentVersion: content.version,
        type: input.type,
        instruction: input.instruction,
        status,
        step,
        error,
        idempotencyKey: key,
        organizationId: "studiojeker",
      },
      include: { steps: true },
    });
    await recordStep(
      tx,
      created.id,
      step,
      status,
      error || "Auftrag gespeichert.",
      0,
    );
    await audit(tx, actor, "GPT_TASK_QUEUED", created.id, {
      type: input.type,
      contentId: content.id,
      version: content.version,
      status,
    });
    return tx.gptTask.findUniqueOrThrow({
      where: { id: created.id },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
  });
  if (task.status === "QUEUED") kickTaskWorker();
  return presentTask(task);
}

export async function approveTask(actor: string, taskId: string, version: number) {
  const task = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const current = await tx.gptTask.findUnique({ where: { id: taskId } });
    if (!current) throw new PolicyError("Auftrag nicht gefunden.", 404);
    if (current.userId !== actor)
      throw new PolicyError("Keine Berechtigung.", 403);
    if (current.status !== "WAITING_APPROVAL")
      throw new PolicyError("Für diesen Auftrag fehlt keine Freigabe.", 409);
    if (!requiresApproval(current.type as TaskType))
      throw new PolicyError("Dieser Auftrag braucht keine Freigabe.", 409);
    if (current.contentVersion !== version)
      throw new PolicyError("Freigabe gilt nur für die gespeicherte Version.", 409);
    const content = await tx.marketingContent.findUnique({
      where: { id: current.contentId },
    });
    if (!content || content.version !== version)
      throw new PolicyError(VERSION_CONFLICT, 409);
    const saved = await tx.marketingVersion.findUnique({
      where: { contentId_version: { contentId: content.id, version } },
    });
    if (!saved) throw new PolicyError("Gespeicherte Version fehlt.", 409);
    await tx.gptTaskApproval.create({
      data: {
        taskId,
        actionType: current.type,
        contentVersion: version,
        hash: saved.hash,
        userId: actor,
      },
    });
    const updated = await tx.gptTask.update({
      where: { id: taskId },
      data: {
        status: "BLOCKED",
        step: "not_executable",
        error: APPROVAL_HELD,
        leaseOwner: null,
        leaseUntil: null,
      },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
    await recordStep(tx, taskId, "not_executable", "BLOCKED", APPROVAL_HELD, current.attempt);
    await audit(tx, actor, "GPT_TASK_APPROVED", taskId, {
      version,
      hash: saved.hash,
      executed: false,
    });
    return updated;
  });
  return presentTask(task);
}

export async function listTasks(actor: string, contentId: string) {
  if (!contentId || contentId.length > 80)
    throw new PolicyError("Newsletter fehlt.", 400);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const content = await tx.marketingContent.findFirst({
      where: { id: contentId, organizationId: "studiojeker", kind: "NEWSLETTER" },
    });
    if (!content) throw new PolicyError("Newsletter nicht gefunden.", 404);
  });
  kickTaskWorker();
  const tasks = await db.gptTask.findMany({
    where: { contentId, organizationId: "studiojeker" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });
  return { tasks: tasks.map(presentTask), connections: connectionRegistry() };
}

let pumping = false;
export function kickTaskWorker() {
  if (process.env.GPT_TASK_AUTORUN === "0" || pumping) return;
  pumping = true;
  setImmediate(() => {
    runTaskWorker(`web-${process.pid}`)
      .catch((error) => {
        console.error("GPT task worker failed.", error instanceof Error ? error.name : "error");
      })
      .finally(() => {
        pumping = false;
      });
  });
}

export async function claimTasks(owner: string, limit: number, now = deps.now()) {
  const until = new Date(now.getTime() + LEASE_MS);
  const rows = await db.$queryRaw<{ id: string }[]>`
    WITH candidate AS (
      SELECT id FROM "GptTask"
      WHERE status IN ('QUEUED'::"GptTaskStatus", 'RUNNING'::"GptTaskStatus")
        AND "nextAttemptAt" <= ${now}
        AND ("leaseUntil" IS NULL OR "leaseUntil" < ${now})
        AND attempt < "maxAttempts"
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "GptTask" AS task
    SET status = 'RUNNING'::"GptTaskStatus",
        "leaseOwner" = ${owner},
        "leaseUntil" = ${until},
        attempt = task.attempt + 1,
        step = 'running',
        "updatedAt" = ${now}
    FROM candidate
    WHERE task.id = candidate.id
    RETURNING task.id
  `;
  return rows.map((row) => row.id);
}

async function settle(
  id: string,
  owner: string,
  data: {
    status: "QUEUED" | "BLOCKED" | "FAILED" | "SUCCEEDED" | "RUNNING";
    step: string;
    error?: string | null;
    result?: StoredResult;
    externalJobId?: string | null;
    nextAttemptAt?: Date;
  },
  detail: string,
) {
  return db.$transaction(async (tx) => {
    const current = await tx.gptTask.findUnique({ where: { id } });
    if (!current || current.leaseOwner !== owner || current.status !== "RUNNING")
      return false;
    await tx.gptTask.update({
      where: { id },
      data: {
        status: data.status,
        step: data.step,
        error: data.error ?? null,
        result: (data.result ?? readResult(current.result)) as Prisma.InputJsonValue,
        externalJobId:
          data.externalJobId === undefined ? current.externalJobId : data.externalJobId,
        nextAttemptAt: data.nextAttemptAt ?? current.nextAttemptAt,
        leaseOwner: data.status === "RUNNING" ? owner : null,
        leaseUntil: data.status === "RUNNING" ? current.leaseUntil : null,
      },
    });
    await recordStep(tx, id, data.step, data.status, detail, current.attempt);
    await audit(tx, current.userId, `GPT_TASK_${data.status}`, id, {
      step: data.step,
    });
    return true;
  });
}

async function loadPayload(contentId: string) {
  const content = await db.marketingContent.findUnique({ where: { id: contentId } });
  if (!content) return null;
  const row = await db.marketingVersion.findUnique({
    where: { contentId_version: { contentId, version: content.version } },
  });
  const parsed = row ? contentInput.safeParse(row.payload) : null;
  if (!parsed?.success || !parsed.data.newsletter) return null;
  return { content, payload: parsed.data };
}

async function runText(
  task: Prisma.GptTaskGetPayload<object>,
  owner: string,
) {
  const stored = readResult(task.result);
  let proposal = stored.proposal;
  let requestId = task.externalJobId;
  if (!proposal?.length) {
    if (task.attempt > 1 && !stored.retryable) {
      await settle(
        task.id,
        owner,
        {
          status: "BLOCKED",
          step: "interrupted",
          error:
            "Die letzte Textbearbeitung wurde unterbrochen. Es gibt keine automatische Wiederholung, damit nichts doppelt erzeugt wird.",
          result: stored,
        },
        "Unterbrochen vor einem gespeicherten Vorschlag.",
      );
      return;
    }
    const loaded = await loadPayload(task.contentId);
    if (!loaded || loaded.content.version !== task.contentVersion) {
      await settle(
        task.id,
        owner,
        { status: "BLOCKED", step: "version_conflict", error: VERSION_CONFLICT, result: stored },
        VERSION_CONFLICT,
      );
      return;
    }
    const allowed = editableTextSlots(
      loaded.payload.newsletter!.templateId,
      loaded.payload.newsletter!.fields,
    );
    let produced: { slots: TextSlot[]; requestId: string | null };
    try {
      const raw = await deps.propose({
        instruction: task.instruction,
        slots: allowed,
      });
      produced = {
        requestId: raw.requestId,
        slots: acceptTextProposal(allowed, raw.slots),
      };
    } catch (error) {
      if (error instanceof TaskBlocked) {
        await settle(
          task.id,
          owner,
          { status: "BLOCKED", step: "blocked", error: error.message, result: stored },
          error.message,
        );
        return;
      }
      if (error instanceof ProviderFailure) {
        const message = error.uncertain
          ? "Die KI-Verbindung wurde unterbrochen. Es wurde nichts gespeichert."
          : "Die Textänderung konnte nicht gelesen werden. Es wurde nichts gespeichert.";
        await settle(
          task.id,
          owner,
          {
            status: error.uncertain ? "BLOCKED" : "FAILED",
            step: error.uncertain ? "provider_uncertain" : "failed",
            error: message,
            result: stored,
          },
          message,
        );
        return;
      }
      throw error;
    }
    if (!produced.slots.length) {
      await settle(
        task.id,
        owner,
        {
          status: "FAILED",
          step: "failed",
          error:
            "Es gab keine zulässige Textänderung. Bilder und Gestaltung bleiben unverändert.",
          result: { ...stored, retryable: false },
          externalJobId: produced.requestId,
        },
        "Kein zulässiger Textvorschlag.",
      );
      return;
    }
    proposal = produced.slots;
    requestId = produced.requestId;
    const kept = await settle(
      task.id,
      owner,
      {
        status: "RUNNING",
        step: "proposed",
        error: null,
        result: { proposal, requestId, retryable: false },
        externalJobId: requestId,
      },
      "Textvorschlag geprüft und zwischengespeichert.",
    );
    if (!kept) return;
  }
  if (deps.beforeApply) await deps.beforeApply();
  await applyProposal(task.id, owner, proposal);
}

async function applyProposal(id: string, owner: string, proposal: TextSlot[]) {
  await db.$transaction(async (tx) => {
    const task = await tx.gptTask.findUnique({ where: { id } });
    if (!task || task.leaseOwner !== owner || task.status !== "RUNNING") return;
    if (readResult(task.result).version) return;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + task.contentId}))`;
    const content = await tx.marketingContent.findUnique({
      where: { id: task.contentId },
    });
    const row = content
      ? await tx.marketingVersion.findUnique({
          where: {
            contentId_version: {
              contentId: content.id,
              version: content.version,
            },
          },
        })
      : null;
    const parsed = row ? contentInput.safeParse(row.payload) : null;
    if (
      !content ||
      !parsed?.success ||
      !parsed.data.newsletter ||
      content.version !== task.contentVersion
    ) {
      await tx.gptTask.update({
        where: { id },
        data: {
          status: "BLOCKED",
          step: "version_conflict",
          error: VERSION_CONFLICT,
          leaseOwner: null,
          leaseUntil: null,
        },
      });
      await recordStep(tx, id, "version_conflict", "BLOCKED", VERSION_CONFLICT, task.attempt);
      await audit(tx, task.userId, "GPT_TASK_BLOCKED", id, { step: "version_conflict" });
      return;
    }
    const newsletter = parsed.data.newsletter;
    const safe = acceptTextProposal(
      editableTextSlots(newsletter.templateId, newsletter.fields),
      proposal,
    );
    if (!safe.length) {
      await tx.gptTask.update({
        where: { id },
        data: {
          status: "FAILED",
          step: "failed",
          error:
            "Es gab keine zulässige Textänderung. Bilder und Gestaltung bleiben unverändert.",
          leaseOwner: null,
          leaseUntil: null,
        },
      });
      await recordStep(tx, id, "failed", "FAILED", "Kein zulässiger Textvorschlag.", task.attempt);
      return;
    }
    const fields = mergeTextSlots(newsletter.fields, safe);
    const next: ContentInput = {
      ...parsed.data,
      newsletter: { ...newsletter, fields },
      body: "",
    };
    next.body = newsletterText(next.newsletter!).trim();
    const preview = renderNewsletter({
      subject: next.subject,
      preheader: next.preheader,
      newsletter: next.newsletter!,
    });
    if (!preview.includes("<html"))
      throw new TaskBlocked(
        "Die Vorschau konnte nicht erzeugt werden. Es wurde nichts gespeichert.",
      );
    const saved = await saveContentInTx(
      tx,
      task.userId,
      next,
      content.id,
      content.version,
    );
    const hash = contentHash(next);
    const result: StoredResult = {
      proposal: safe,
      requestId: task.externalJobId,
      version: saved.version,
      hash,
      changedSlots: safe.map((slot) => slot.key),
      previewReady: true,
      retryable: false,
    };
    await tx.gptTask.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        step: "saved",
        error: null,
        result: result as Prisma.InputJsonValue,
        leaseOwner: null,
        leaseUntil: null,
      },
    });
    await recordStep(
      tx,
      id,
      "saved",
      "SUCCEEDED",
      `Version ${saved.version} gespeichert.`,
      task.attempt,
    );
    await audit(tx, task.userId, "GPT_TASK_SUCCEEDED", id, {
      version: saved.version,
      hash,
    });
  });
}

async function runLayout(task: Prisma.GptTaskGetPayload<object>, owner: string) {
  const report = await deps.layout({
    taskId: task.id,
    instruction: task.instruction,
    contentVersion: task.contentVersion,
  });
  const decision = layoutDecision(report);
  await settle(
    task.id,
    owner,
    {
      status: "BLOCKED",
      step: "layout_blocked",
      error: decision.error,
      externalJobId: decision.externalJobId,
      result: readResult(task.result),
    },
    decision.error,
  );
}

async function handleFailure(id: string, owner: string, error: unknown) {
  const task = await db.gptTask.findUnique({ where: { id } });
  if (!task || task.leaseOwner !== owner) return;
  const stored = readResult(task.result);
  const retryable = error instanceof RetryableTaskError;
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Die Bearbeitung wurde unterbrochen.";
  if (retryable && task.attempt < task.maxAttempts && !stored.version) {
    await settle(
      task.id,
      owner,
      {
        status: "QUEUED",
        step: "retry",
        error: "Die Bearbeitung wird erneut versucht.",
        result: { ...stored, retryable: !stored.proposal?.length },
        nextAttemptAt: new Date(deps.now().getTime() + backoffMs(task.attempt)),
      },
      message,
    );
    return;
  }
  await settle(
    task.id,
    owner,
    {
      status: retryable ? "BLOCKED" : "FAILED",
      step: retryable ? "interrupted" : "failed",
      error: retryable
        ? "Die Bearbeitung wurde mehrfach unterbrochen. Es wurde nichts veröffentlicht."
        : "Die Bearbeitung ist fehlgeschlagen. Es wurde nichts veröffentlicht.",
      result: stored,
    },
    message,
  );
}

export async function processTask(id: string, owner: string) {
  const task = await db.gptTask.findUnique({ where: { id } });
  if (!task || task.status !== "RUNNING" || task.leaseOwner !== owner) return;
  try {
    if (task.type === "NEWSLETTER_REVISE_TEXT") await runText(task, owner);
    else if (task.type === "NEWSLETTER_LAYOUT") await runLayout(task, owner);
    else
      await settle(
        task.id,
        owner,
        {
          status: "BLOCKED",
          step: "not_executable",
          error: APPROVAL_HELD,
          result: readResult(task.result),
        },
        APPROVAL_HELD,
      );
  } catch (error) {
    if (error instanceof TaskBlocked) {
      await settle(
        task.id,
        owner,
        {
          status: "BLOCKED",
          step: "blocked",
          error: error.message,
          result: readResult((await db.gptTask.findUnique({ where: { id } }))?.result),
        },
        error.message,
      );
      return;
    }
    await handleFailure(task.id, owner, error);
  }
}

export async function runTaskWorker(owner = `tick-${process.pid}`, limit = 2) {
  const ids = await claimTasks(owner, limit);
  for (const id of ids) await processTask(id, owner);
  return ids;
}
