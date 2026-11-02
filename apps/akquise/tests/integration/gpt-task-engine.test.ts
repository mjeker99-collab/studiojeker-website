import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { contentInput } from "../../lib/hub/input";
import {
  newsletterDefaults,
  newsletterText,
  renderNewsletter,
} from "../../lib/hub/newsletter-template";
import { editableTextSlots } from "../../lib/tasks/proposal";
import { RetryableTaskError } from "../../lib/tasks/types";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "gpt_task_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.GPT_TASK_AUTORUN = "0";
process.env.CONTENT_AI_ENABLED = "false";
delete process.env.OPENAI_API_KEY;
process.env.APP_URL = "http://localhost:3100";

const { db } = await import("../../lib/db");
const { saveCampaign, saveContent } = await import("../../lib/hub/workflow");
const engine = await import("../../lib/tasks/engine");

let actor = "";
let campaignId = "";
let contentId = "";
let textKey = "";
let imageKey = "";
const baseNewsletter = newsletterDefaults("newsletter-03");

function payload(newsletter = baseNewsletter, title = "Newsletter · Auftrag") {
  return contentInput.parse({
    kind: "NEWSLETTER",
    title,
    ownerId: actor,
    campaignId,
    scheduledAt: null,
    subject: "Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.",
    preheader: "Synthetische Vorschau ohne Versand",
    body: newsletterText(newsletter),
    audience: "Synthetische Zielgruppe",
    variants: [],
    newsletter,
  });
}

before(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      stdio: "pipe",
      timeout: 60000,
    },
  );
  await db.studioOrganization.upsert({
    where: { id: "studiojeker" },
    create: { id: "studiojeker", name: "Studiojeker", brand: {} },
    update: {},
  });
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin-task@example.test",
        passwordHash: "not-used",
      },
    })
  ).id;
  const customer = await db.customer.create({
    data: { organizationId: "studiojeker", name: "Synthetische Kundin" },
  });
  const campaign = await saveCampaign(actor, {
    customerId: customer.id,
    title: "Synthetische Kampagne",
    goal: "Den Newslettertext kürzen, ohne etwas zu versenden.",
    audience: "Synthetische Zielgruppe",
    ownerId: actor,
    startsAt: "2026-11-01T08:00:00.000Z",
    endsAt: "2026-11-30T18:00:00.000Z",
  });
  campaignId = campaign.id;
  const content = await saveContent(actor, payload());
  contentId = content.id;
  textKey = editableTextSlots(baseNewsletter.templateId, baseNewsletter.fields)[0].key;
  imageKey = Object.keys(baseNewsletter.fields).find((key) => key.includes("image"))!;
});

after(async () => {
  engine.resetTaskDeps();
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});

async function currentVersion() {
  const content = await db.marketingContent.findUniqueOrThrow({
    where: { id: contentId },
  });
  return content.version;
}

test("missing AI blocks before any provider call", async () => {
  let calls = 0;
  engine.setTaskDeps({
    propose: async () => {
      calls += 1;
      return { slots: [], requestId: null };
    },
  });
  const task = await engine.createTask(actor, {
    contentId,
    version: await currentVersion(),
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Text redaktionell kürzen, ohne KI",
  });
  assert.equal(task.status, "BLOCKED");
  assert.match(task.headline, /nicht verbunden/);
  assert.equal(calls, 0);
  const claimed = await engine.runTaskWorker("blocked");
  assert.equal(claimed.length, 0);
});

test("happy path saves one text revision and a real preview", async () => {
  let calls = 0;
  const version = await currentVersion();
  engine.setTaskDeps({
    providerReady: () => true,
    propose: async () => {
      calls += 1;
      return {
        slots: [
          { key: textKey, text: "Kurzer synthetischer Newslettertext." },
          { key: imageKey, text: "https://evil.example/bild.png" },
        ],
        requestId: "req-happy",
      };
    },
  });
  const first = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Text redaktionell kürzen",
  });
  const second = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Text redaktionell kürzen",
  });
  assert.equal(second.id, first.id);
  assert.equal(first.campaignId, campaignId);
  assert.ok(first.customerId);
  const claimed = await engine.runTaskWorker("happy");
  assert.deepEqual(claimed, [first.id]);
  const again = await engine.runTaskWorker("happy-2");
  assert.equal(again.length, 0);
  assert.equal(calls, 1);
  const row = await db.gptTask.findUniqueOrThrow({
    where: { id: first.id },
    include: { steps: true },
  });
  assert.equal(row.status, "SUCCEEDED");
  assert.equal(row.externalJobId, "req-happy");
  const saved = await db.marketingVersion.findUniqueOrThrow({
    where: {
      contentId_version: { contentId, version: (row.result as { version: number }).version },
    },
  });
  const body = saved.payload as {
    newsletter: { fields: Record<string, string> };
    subject: string;
    preheader: string;
  };
  assert.equal(body.newsletter.fields[textKey], "Kurzer synthetischer Newslettertext.");
  assert.equal(body.newsletter.fields[imageKey], baseNewsletter.fields[imageKey]);
  const html = renderNewsletter({
    subject: body.subject,
    preheader: body.preheader,
    newsletter: body.newsletter as never,
  });
  assert.match(html, /Kurzer synthetischer Newslettertext/);
  assert.match(html, /https:\/\//);
  assert.doesNotMatch(html, /evil\.example/);
  assert.equal(calls, 1);
});

test("version conflict blocks without overwriting", async () => {
  let calls = 0;
  const version = await currentVersion();
  engine.setTaskDeps({
    providerReady: () => true,
    propose: async () => {
      calls += 1;
      return {
        slots: [{ key: textKey, text: "Darf nicht gespeichert werden." }],
        requestId: "req-conflict",
      };
    },
    beforeApply: async () => {
      const content = await db.marketingContent.findUniqueOrThrow({
        where: { id: contentId },
      });
      const row = await db.marketingVersion.findUniqueOrThrow({
        where: {
          contentId_version: { contentId, version: content.version },
        },
      });
      const current = contentInput.parse(row.payload);
      current.title = "Manuell geändert";
      await saveContent(actor, current, contentId, content.version);
    },
  });
  const task = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Konfliktfall",
  });
  await engine.runTaskWorker("conflict");
  const row = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(row.status, "BLOCKED");
  assert.match(row.error || "", /inzwischen geändert/);
  assert.equal(calls, 1);
  const latest = await db.marketingContent.findUniqueOrThrow({
    where: { id: contentId },
  });
  const saved = await db.marketingVersion.findUniqueOrThrow({
    where: { contentId_version: { contentId, version: latest.version } },
  });
  const fields = (saved.payload as { newsletter: { fields: Record<string, string> } })
    .newsletter.fields;
  assert.notEqual(fields[textKey], "Darf nicht gespeichert werden.");
  assert.equal((saved.payload as { title: string }).title, "Manuell geändert");
});

test("lease expiry resumes the stored proposal without a second provider call", async () => {
  let calls = 0;
  let stolen = false;
  let taskId = "";
  const version = await currentVersion();
  engine.setTaskDeps({
    providerReady: () => true,
    propose: async () => {
      calls += 1;
      return {
        slots: [{ key: textKey, text: "Nach dem Unterbruch gespeichert." }],
        requestId: "req-resume",
      };
    },
    beforeApply: async () => {
      if (stolen) return;
      stolen = true;
      await db.gptTask.update({
        where: { id: taskId },
        data: { leaseOwner: "expired", leaseUntil: new Date(0) },
      });
      throw new RetryableTaskError("Verbindung zur Datenbank kurz weg.");
    },
  });
  const task = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Nach Unterbruch fortsetzen",
  });
  taskId = task.id;
  await engine.runTaskWorker("lease-1");
  const mid = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(mid.status, "RUNNING");
  assert.equal(calls, 1);
  engine.setTaskDeps({
    providerReady: () => true,
    now: () => new Date(Date.now() + 60_000),
    propose: async () => {
      calls += 1;
      return { slots: [], requestId: "req-should-not-run" };
    },
  });
  const claimed = await engine.claimTasks("lease-2", 1, new Date(Date.now() + 60_000));
  assert.deepEqual(claimed, [task.id]);
  await engine.processTask(task.id, "lease-2");
  const done = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(done.status, "SUCCEEDED");
  assert.equal(calls, 1);
  assert.equal(done.externalJobId, "req-resume");
});

test("transient failure retries and then saves once", async () => {
  let calls = 0;
  const version = await currentVersion();
  engine.setTaskDeps({
    providerReady: () => true,
    propose: async () => {
      calls += 1;
      if (calls === 1) throw new RetryableTaskError("Netzwerk kurz weg.");
      return {
        slots: [{ key: textKey, text: "Nach erneutem Versuch gespeichert." }],
        requestId: "req-retry",
      };
    },
  });
  const task = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Erneut versuchen",
  });
  await engine.runTaskWorker("retry-1");
  const paused = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(paused.status, "QUEUED");
  engine.setTaskDeps({
    providerReady: () => true,
    now: () => new Date(Date.now() + 60_000),
    propose: async () => {
      calls += 1;
      return {
        slots: [{ key: textKey, text: "Nach erneutem Versuch gespeichert." }],
        requestId: "req-retry",
      };
    },
  });
  await engine.runTaskWorker("retry-2");
  const done = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(done.status, "SUCCEEDED");
  assert.equal(calls, 2);
  const versions = await db.marketingVersion.count({
    where: {
      contentId,
      payload: { path: ["title"], equals: "Newsletter · Auftrag" },
    },
  });
  assert.ok(versions >= 1);
});

test("uncertain resume does not call the provider again", async () => {
  let calls = 0;
  const version = await currentVersion();
  engine.setTaskDeps({
    providerReady: () => true,
    propose: async () => {
      calls += 1;
      return { slots: [{ key: textKey, text: "Nein." }], requestId: "req-no" };
    },
  });
  const task = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Unklarer Abbruch",
  });
  await db.gptTask.update({
    where: { id: task.id },
    data: {
      status: "RUNNING",
      attempt: 2,
      leaseOwner: "uncertain",
      leaseUntil: new Date(Date.now() + 60_000),
      result: {},
    },
  });
  await engine.processTask(task.id, "uncertain");
  const row = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(row.status, "BLOCKED");
  assert.equal(calls, 0);
});

test("unknown user is rejected", async () => {
  await assert.rejects(
    () =>
      engine.createTask("missing-user", {
        contentId,
        version: 1,
        type: "NEWSLETTER_REVISE_TEXT",
        instruction: "Nicht erlaubt",
      }),
    (error: { status?: number }) => error.status === 403,
  );
});

test("publish stays waiting and approval never sends", async () => {
  const version = await currentVersion();
  const task = await engine.createTask(actor, {
    contentId,
    version,
    type: "NEWSLETTER_SEND",
    instruction: "Bitte versenden",
  });
  assert.equal(task.status, "WAITING_APPROVAL");
  const claimed = await engine.runTaskWorker("approval");
  assert.equal(claimed.includes(task.id), false);
  const still = await db.gptTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(still.status, "WAITING_APPROVAL");
  await assert.rejects(
    () => engine.approveTask(actor, task.id, version + 9),
    (error: { status?: number }) => error.status === 409,
  );
  const approved = await engine.approveTask(actor, task.id, version);
  assert.equal(approved.status, "BLOCKED");
  assert.match(approved.error || "", /ausgeschaltet/);
  const consent = await db.gptTaskApproval.findUniqueOrThrow({
    where: { taskId: task.id },
  });
  assert.equal(consent.userId, actor);
  assert.equal(consent.contentVersion, version);
  assert.equal(await db.delivery.count(), 0);
  assert.equal(await db.mailchimpTransfer.count(), 0);
});

test("layout delegation waits for Cursor and does not finish from a link", async () => {
  const created = await engine.createTask(actor, {
    contentId,
    version: await currentVersion(),
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Mehr Abstand im Hero",
  });
  assert.equal(created.type, "NEWSLETTER_LAYOUT");
  assert.equal(created.status, "QUEUED");
  await engine.runTaskWorker("layout-missing");
  const blocked = await db.gptTask.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(blocked.status, "BLOCKED");
  assert.match(blocked.error || "", /kein Cursor-Auftrag/);
  await db.gptTask.update({
    where: { id: created.id },
    data: { status: "QUEUED", step: "queued", error: null, attempt: 0, leaseOwner: null, leaseUntil: null },
  });
  let calls = 0;
  engine.setTaskDeps({
    now: () => new Date(),
    layout: async (input) => {
      calls += 1;
      if (!input.externalJobId)
        return { state: "running", externalJobId: "cursor:content" };
      return {
        state: "finished",
        externalJobId: input.externalJobId,
        url: "https://github.com/mjeker99-collab/studiojeker-website/pull/400",
      };
    },
  });
  await engine.runTaskWorker("layout-handoff");
  const waiting = await db.gptTask.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(waiting.status, "QUEUED");
  assert.equal(waiting.externalJobId, "cursor:content");
  assert.notEqual(waiting.status, "SUCCEEDED");
  engine.setTaskDeps({
    now: () => new Date(Date.now() + 60_000),
    layout: async (input) => {
      calls += 1;
      assert.equal(input.externalJobId, "cursor:content");
      return {
        state: "finished",
        externalJobId: input.externalJobId || "",
        url: "https://github.com/mjeker99-collab/studiojeker-website/pull/400",
      };
    },
  });
  await engine.runTaskWorker("layout-preview");
  const row = await db.gptTask.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(row.status, "BLOCKED");
  assert.notEqual(row.status, "SUCCEEDED");
  assert.equal(calls, 2);
  assert.match(JSON.stringify(row.result), /pull\/400/);
});
