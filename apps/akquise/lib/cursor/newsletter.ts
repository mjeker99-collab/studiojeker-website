import { db } from "../db";
import { PolicyError } from "../policy";
import { audit, type Tx } from "../workflow";
import { hubActor } from "../hub/workflow";
import {
  approvedEdition,
  handoffInput,
  blockReason,
  buildPrompt,
  cleanInstruction,
  createAgentBody,
  cursorRequest,
  cursorUserMessage,
  CursorApiError,
  followUpBody,
  matchingPr,
  parseAgentResponse,
  parseCreateResponse,
  parseFollowUpResponse,
  parseRunResponse,
  readCursorKey,
  type NewsletterEdition,
} from "./contract";
import {
  CURSOR_STATUS_LABEL,
  isAgentId,
  isCursorStatus,
  isRunId,
  openableCursorHref,
  statusFromRun,
  type CursorStatus,
  type PublicCursorTask,
} from "./status";

export { handoffInput };

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const ACTIVE = new Set<CursorStatus>(["HANDED_OFF", "IN_PROGRESS"]);

export function resetCursorRateLimit() {
  hits.clear();
}

function limit(key: string, max: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= max)
    throw new PolicyError("Zu viele Anfragen. Bitte kurz warten.", 429);
  recent.push(now);
  hits.set(key, recent);
}

function asPolicy(error: unknown) {
  if (error instanceof PolicyError) return error;
  if (error instanceof CursorApiError) {
    const mapped = cursorUserMessage(error.status, error.code);
    return new PolicyError(mapped.message, mapped.status);
  }
  return new PolicyError(
    "Die Änderung konnte nicht gestartet werden. Bitte versuche es erneut.",
    502,
  );
}

type TaskRow = {
  contentId: string;
  version: number;
  instruction: string;
  status: string;
  agentId: string;
  runId: string;
  agentUrl: string;
  prUrl: string;
  errorMessage: string;
  pendingUntil: Date | null;
};

export function toPublicTask(row: TaskRow): PublicCursorTask {
  const status: CursorStatus = isCursorStatus(row.status)
    ? row.status
    : "ERROR";
  const previewUrl =
    status === "PREVIEW_READY" ? openableCursorHref(row.prUrl) : "";
  const reviewUrl =
    status === "PREVIEW_READY"
      ? openableCursorHref(row.agentUrl) || previewUrl
      : "";
  return {
    contentId: row.contentId,
    version: row.version,
    instruction: row.instruction.slice(0, 4000),
    status,
    label: CURSOR_STATUS_LABEL[status],
    pending: Boolean(row.pendingUntil && row.pendingUntil > new Date()),
    errorMessage: row.errorMessage.slice(0, 300),
    previewUrl,
    reviewUrl,
  };
}

function templateIdFrom(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const newsletter = (payload as { newsletter?: { templateId?: unknown } })
    .newsletter;
  return typeof newsletter?.templateId === "string"
    ? newsletter.templateId
    : "";
}

export async function newsletterCursorState(
  contents: { id: string; kind: string; versions: { payload: unknown }[] }[],
) {
  const tasks = await db.newsletterCursorTask.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return {
    connected: Boolean(readCursorKey()),
    tasks: tasks.map(toPublicTask),
    handoffs: contents
      .filter((content) => content.kind === "NEWSLETTER")
      .map((content) => ({
        contentId: content.id,
        block: blockReason(templateIdFrom(content.versions[0]?.payload)),
      })),
  };
}

type Hooks = {
  env?: NodeJS.ProcessEnv | { CURSOR_API_KEY?: string };
  fetchImpl?: typeof fetch;
  editions?: readonly NewsletterEdition[];
};

function hooks(options?: Hooks) {
  if (process.env.NODE_ENV === "production")
    return { env: process.env, fetchImpl: fetch, editions: undefined };
  return {
    env: options?.env ?? process.env,
    fetchImpl: options?.fetchImpl ?? fetch,
    editions: options?.editions,
  };
}

async function lock(tx: Tx, contentId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"cursor-newsletter:" + contentId}))`;
}

async function loadNewsletter(contentId: string) {
  const content = await db.marketingContent.findFirst({
    where: {
      id: contentId,
      kind: "NEWSLETTER",
      organizationId: "studiojeker",
      archivedAt: null,
    },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!content?.versions[0])
    throw new PolicyError("Newsletter nicht gefunden.", 404);
  const templateId = templateIdFrom(content.versions[0].payload);
  if (!templateId)
    throw new PolicyError(
      "Dieser Newsletter hat keine gespeicherte Vorlage.",
      400,
    );
  return { content, templateId };
}

export async function handoffNewsletter(
  actor: string,
  contentId: string,
  rawInstruction: string,
  options?: Hooks,
) {
  const { env, fetchImpl, editions } = hooks(options);
  const key = readCursorKey(env);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
  });
  limit(`handoff:${actor}`, 5);
  const instruction = cleanInstruction(rawInstruction);
  if (!instruction || instruction.length > 4000)
    throw new PolicyError(
      "Bitte beschreibe die Änderung in höchstens 4000 Zeichen.",
    );
  if (!key) throw new PolicyError("Cursor noch nicht verbunden.", 503);
  const loaded = await loadNewsletter(contentId);
  const blocked = blockReason(loaded.templateId, editions);
  if (blocked === "protected")
    throw new PolicyError("Diese Ausgabe ist geschützt.", 403);
  const edition = approvedEdition(loaded.templateId, editions);
  if (!edition)
    throw new PolicyError(
      "Für diese Ausgabe ist noch kein freigegebener Arbeitsstand hinterlegt.",
      409,
    );
  const mode = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, contentId);
    const existing = await tx.newsletterCursorTask.findUnique({
      where: { contentId },
    });
    if (
      existing?.agentId &&
      isCursorStatus(existing.status) &&
      ACTIVE.has(existing.status)
    )
      throw new PolicyError(
        "Für diesen Newsletter läuft bereits eine Änderung.",
        409,
      );
    if (existing?.pendingUntil && existing.pendingUntil > new Date())
      throw new PolicyError("Die Übergabe wird bereits geprüft.", 409);
    const followUp = Boolean(
      existing?.agentId &&
      isAgentId(existing.agentId) &&
      existing.runId &&
      isRunId(existing.runId),
    );
    const pendingUntil = new Date(Date.now() + 60_000);
    const data = {
      userId: actor,
      version: loaded.content.version,
      templateId: loaded.templateId,
      instruction,
      pendingUntil,
      errorMessage: "",
    };
    if (existing)
      await tx.newsletterCursorTask.update({ where: { contentId }, data });
    else
      await tx.newsletterCursorTask.create({
        data: { contentId, ...data, status: "NOT_SENT" },
      });
    return {
      followUp,
      agentId: existing?.agentId ?? "",
    };
  });
  try {
    const prompt = buildPrompt(
      {
        instruction,
        templateId: loaded.templateId,
        version: loaded.content.version,
        title: loaded.content.title,
      },
      key,
    );
    let agentId = mode.agentId;
    let runId = "";
    let agentUrl = "";
    let status: CursorStatus = "ERROR";
    if (mode.followUp) {
      const body = await cursorRequest(
        key,
        `/v1/agents/${mode.agentId}/runs`,
        { method: "POST", body: followUpBody(prompt) },
        fetchImpl,
      );
      const run = parseFollowUpResponse(body);
      runId = run.runId;
      agentUrl = `https://cursor.com/agents/${mode.agentId}`;
      status = statusFromRun(
        run.runStatus,
        Boolean(matchingPr(body, edition.prUrl)),
        "refresh",
      );
    } else {
      const body = await cursorRequest(
        key,
        "/v1/agents",
        { method: "POST", body: createAgentBody(prompt, edition.prUrl) },
        fetchImpl,
      );
      const created = parseCreateResponse(body);
      agentId = created.agentId;
      runId = created.runId;
      agentUrl = created.agentUrl;
      status = created.status;
    }
    const saved = await db.$transaction(async (tx) => {
      await lock(tx, contentId);
      const row = await tx.newsletterCursorTask.update({
        where: { contentId },
        data: {
          status,
          agentId,
          runId,
          agentUrl: openableCursorHref(agentUrl),
          prUrl: status === "PREVIEW_READY" ? edition.prUrl : "",
          pendingUntil: null,
          errorMessage:
            status === "ERROR"
              ? "Die Änderung konnte nicht abgeschlossen werden."
              : "",
        },
      });
      await audit(
        tx,
        actor,
        mode.followUp
          ? "CURSOR_NEWSLETTER_FOLLOWUP"
          : "CURSOR_NEWSLETTER_HANDOFF",
        contentId,
        {
          version: loaded.content.version,
          templateId: loaded.templateId,
          status,
        },
      );
      return row;
    });
    return { connected: true, task: toPublicTask(saved) };
  } catch (error) {
    const policy = asPolicy(error);
    const keep = policy.status === 409;
    await db
      .$transaction(async (tx) => {
        await lock(tx, contentId);
        const current = await tx.newsletterCursorTask.findUnique({
          where: { contentId },
        });
        if (!current) return;
        await tx.newsletterCursorTask.update({
          where: { contentId },
          data: {
            pendingUntil: null,
            ...(keep
              ? {}
              : current.agentId
                ? { errorMessage: policy.message }
                : {
                    status: "ERROR",
                    errorMessage: policy.message,
                  }),
          },
        });
        if (!keep)
          await audit(tx, actor, "CURSOR_NEWSLETTER_ERROR", contentId, {
            status: policy.status,
          });
      })
      .catch(() => undefined);
    throw policy;
  }
}

export async function refreshNewsletterCursor(
  actor: string,
  contentId: string,
  options?: Hooks,
) {
  const { env, fetchImpl, editions } = hooks(options);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
  });
  limit(`refresh:${actor}`, 60);
  const task = await db.newsletterCursorTask.findUnique({
    where: { contentId },
  });
  const key = readCursorKey(env);
  if (!task) return { connected: Boolean(key), task: null };
  if (!key || !isAgentId(task.agentId) || !isRunId(task.runId))
    return { connected: Boolean(key), task: toPublicTask(task) };
  const edition = approvedEdition(task.templateId, editions);
  try {
    const agent = parseAgentResponse(
      await cursorRequest(
        key,
        `/v1/agents/${task.agentId}`,
        { method: "GET" },
        fetchImpl,
      ),
    );
    const runId = agent.latestRunId || task.runId;
    const run = parseRunResponse(
      await cursorRequest(
        key,
        `/v1/agents/${task.agentId}/runs/${runId}`,
        { method: "GET" },
        fetchImpl,
      ),
      edition?.prUrl ?? "",
    );
    const saved = await db.newsletterCursorTask.update({
      where: { contentId },
      data: {
        runId,
        status: run.status,
        prUrl: run.prUrl,
        pendingUntil: null,
        errorMessage:
          run.status === "ERROR"
            ? "Die Änderung konnte nicht abgeschlossen werden."
            : "",
      },
    });
    return { connected: true, task: toPublicTask(saved) };
  } catch (error) {
    throw asPolicy(error);
  }
}
