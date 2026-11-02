import { db } from "../db";
import { PolicyError } from "../policy";
import { audit, type Tx } from "../workflow";
import { contentInput } from "../hub/input";
import { hubActor, saveContentInTx } from "../hub/workflow";
import {
  getNewsletterTemplate,
  newsletterDefaults,
  newsletterText,
} from "../hub/newsletter-template";
import {
  APPROVED_BASE_REF,
  V3_TEMPLATE_ID,
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
  taskRoute,
  validatedPr,
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
  route?: string;
};

export function toPublicTask(row: TaskRow): PublicCursorTask {
  const status: CursorStatus = isCursorStatus(row.status)
    ? row.status
    : "ERROR";
  const route = row.route === "gpt" ? "gpt" : "cursor";
  const previewUrl =
    status === "PREVIEW_READY" ? openableCursorHref(row.prUrl) : "";
  const reviewUrl =
    status === "PREVIEW_READY"
      ? openableCursorHref(row.agentUrl) || previewUrl
      : "";
  const note =
    status === "PREVIEW_READY"
      ? "Auftrag offen. Die Vorschau wartet auf deine Freigabe und ist nicht erledigt."
      : route === "gpt"
        ? "GPT bereitet den Text vor. Der Auftrag ist nicht erledigt."
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
    route,
    complete: false,
    note,
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
  contents: {
    id: string;
    kind: string;
    title: string;
    version: number;
    versions: { payload: unknown }[];
  }[],
) {
  const [tasks, editions] = await Promise.all([
    db.newsletterCursorTask.findMany({ orderBy: { updatedAt: "desc" } }),
    db.newsletterEdition.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);
  const registered = new Set(editions.map((edition) => edition.contentId));
  return {
    connected: Boolean(readCursorKey()),
    nextStep: editions.length ? "" : NEXT_STEP,
    tasks: tasks.map(toPublicTask),
    editions: editions.map((edition) => {
      const content = contents.find((item) => item.id === edition.contentId);
      return {
        contentId: edition.contentId,
        title: content?.title || "Newsletter V4",
        version: edition.contentVersion,
        currentVersion: content?.version ?? edition.contentVersion,
        stale: Boolean(content && content.version !== edition.contentVersion),
        prUrl: validatedPr(edition.prUrl),
      };
    }),
    handoffs: contents
      .filter((content) => content.kind === "NEWSLETTER")
      .map((content) => ({
        contentId: content.id,
        block: blockReason(
          templateIdFrom(content.versions[0]?.payload),
          registered.has(content.id),
        ),
      })),
  };
}

const NEXT_STEP = "Neue Ausgabe anlegen";

export async function createV4Edition(actor: string) {
  const template = getNewsletterTemplate(V3_TEMPLATE_ID);
  const newsletter = newsletterDefaults(V3_TEMPLATE_ID);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('newsletter-v4-edition'))`;
    const payload = contentInput.parse({
      kind: "NEWSLETTER",
      title: "Newsletter V4 · Entwurf",
      ownerId: actor,
      campaignId: null,
      scheduledAt: null,
      subject: template.subject,
      preheader: template.preheader,
      body: newsletterText(newsletter),
      audience: "Vor Versand in Mailchimp festlegen",
      variants: [],
      newsletter,
    });
    const content = await saveContentInTx(tx, actor, payload);
    const edition = await tx.newsletterEdition.create({
      data: {
        contentId: content.id,
        sourceTemplateId: V3_TEMPLATE_ID,
        contentVersion: content.version,
        baseRef: APPROVED_BASE_REF,
        userId: actor,
      },
    });
    await audit(tx, actor, "NEWSLETTER_V4_REGISTERED", content.id, {
      sourceTemplateId: V3_TEMPLATE_ID,
      version: content.version,
      baseRef: APPROVED_BASE_REF,
    });
    return {
      contentId: content.id,
      version: content.version,
      editionId: edition.id,
    };
  });
}

export async function restartEditionVersion(actor: string, contentId: string) {
  const loaded = await loadNewsletter(contentId);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lock(tx, contentId);
    const edition = await tx.newsletterEdition.findUnique({
      where: { contentId },
    });
    if (!edition)
      throw new PolicyError("Lege zuerst eine neue Ausgabe an.", 409);
    await tx.newsletterEdition.update({
      where: { contentId },
      data: { contentVersion: loaded.content.version, prUrl: "" },
    });
    await tx.newsletterCursorTask.deleteMany({ where: { contentId } });
    await audit(tx, actor, "NEWSLETTER_V4_VERSION_RESTARTED", contentId, {
      version: loaded.content.version,
    });
    return { contentId, version: loaded.content.version };
  });
}

type Hooks = {
  env?: NodeJS.ProcessEnv | { CURSOR_API_KEY?: string };
  fetchImpl?: typeof fetch;
};

function hooks(options?: Hooks) {
  if (process.env.NODE_ENV === "production")
    return { env: process.env, fetchImpl: fetch };
  return {
    env: options?.env ?? process.env,
    fetchImpl: options?.fetchImpl ?? fetch,
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
  const { env, fetchImpl } = hooks(options);
  const key = readCursorKey(env);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
  });
  limit(`handoff:${actor}`, 8);
  const instruction = cleanInstruction(rawInstruction);
  if (!instruction || instruction.length > 4000)
    throw new PolicyError(
      "Bitte beschreibe die Änderung in höchstens 4000 Zeichen.",
    );
  const loaded = await loadNewsletter(contentId);
  const edition = await db.newsletterEdition.findUnique({
    where: { contentId },
  });
  const blocked = blockReason(loaded.templateId, Boolean(edition));
  if (blocked === "protected")
    throw new PolicyError("Diese Ausgabe ist geschützt.", 403);
  if (!edition)
    throw new PolicyError(
      "Es gibt noch keine eigene Ausgabe. Lege zuerst eine neue Ausgabe als Kopie der geschützten Vorlage an.",
      409,
    );
  if (edition.contentVersion !== loaded.content.version)
    throw new PolicyError(
      `Die Ausgabe wurde geändert. Der Auftrag gilt nur für Version ${edition.contentVersion} und wird nicht übertragen.`,
      409,
    );
  const route = taskRoute(instruction);
  if (route === "editorial") {
    const saved = await db.$transaction(async (tx) => {
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
      const data = {
        userId: actor,
        version: loaded.content.version,
        templateId: loaded.templateId,
        instruction,
        route: "gpt",
        status: "NOT_SENT" as const,
        pendingUntil: null,
        errorMessage: "",
      };
      const row = existing
        ? await tx.newsletterCursorTask.update({ where: { contentId }, data })
        : await tx.newsletterCursorTask.create({
            data: { contentId, ...data },
          });
      await audit(tx, actor, "NEWSLETTER_TASK_GPT", contentId, {
        version: loaded.content.version,
      });
      return row;
    });
    return {
      connected: Boolean(key),
      route: "gpt" as const,
      task: toPublicTask(saved),
    };
  }
  if (!key) throw new PolicyError("Cursor noch nicht verbunden.", 503);
  const storedPr = validatedPr(edition.prUrl);
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
      route: "cursor",
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
        Boolean(matchingPr(body)),
        "refresh",
      );
    } else {
      const body = await cursorRequest(
        key,
        "/v1/agents",
        {
          method: "POST",
          body: storedPr
            ? createAgentBody(prompt, { prUrl: storedPr })
            : createAgentBody(prompt, { startingRef: APPROVED_BASE_REF }),
        },
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
          route: "cursor",
          prUrl: storedPr,
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
  const { env, fetchImpl } = hooks(options);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
  });
  limit(`refresh:${actor}`, 60);
  const task = await db.newsletterCursorTask.findUnique({
    where: { contentId },
  });
  const key = readCursorKey(env);
  const loaded = await loadNewsletter(contentId).catch(() => null);
  if (task && loaded && task.version !== loaded.content.version)
    throw new PolicyError(
      `Die Ausgabe wurde geändert. Der Auftrag gilt nur für Version ${task.version} und wird nicht übertragen.`,
      409,
    );
  if (!task) return { connected: Boolean(key), task: null };
  if (!key || !isAgentId(task.agentId) || !isRunId(task.runId))
    return { connected: Boolean(key), task: toPublicTask(task) };
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
    const runBody = await cursorRequest(
      key,
      `/v1/agents/${task.agentId}/runs/${runId}`,
      { method: "GET" },
      fetchImpl,
    );
    const run = parseRunResponse(runBody);
    if (run.prUrl)
      await db.newsletterEdition.updateMany({
        where: { contentId, prUrl: "" },
        data: { prUrl: run.prUrl },
      });
    const saved = await db.newsletterCursorTask.update({
      where: { contentId },
      data: {
        runId,
        status: run.status,
        prUrl: run.prUrl || task.prUrl,
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
