import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  newsletterDefaults,
  newsletterText,
} from "../../lib/hub/newsletter-template";
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank erlaubt.");
const schema = "cursor_newsletter_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { saveContent } = await import("../../lib/hub/workflow");
const {
  createV4Edition,
  handoffNewsletter,
  newsletterCursorState,
  refreshNewsletterCursor,
  resetCursorRateLimit,
} = await import("../../lib/cursor/newsletter");

const key = "synthetic-cursor-key-not-real";
const agentId = "bc-11111111-1111-4111-8111-111111111111";
const runId = "run-22222222-2222-4222-8222-222222222222";
const freshPr =
  "https://github.com/mjeker99-collab/studiojeker-website/pull/900001";
let actor = "";
const calls: { url: string; body: string }[] = [];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchImpl: typeof fetch = async (input, init) => {
  const target = String(input);
  const body = typeof init?.body === "string" ? init.body : "";
  calls.push({ url: target, body });
  assert.equal(target.startsWith("https://api.cursor.com/"), true);
  assert.equal(body.includes(key), false);
  if (
    target === "https://api.cursor.com/v1/agents" &&
    init?.method === "POST"
  ) {
    const parsed = JSON.parse(body) as {
      autoCreatePR: boolean;
      workOnCurrentBranch: boolean;
      repos: { url: string; startingRef?: string; prUrl?: string }[];
    };
    assert.equal(
      parsed.repos[0].url,
      "https://github.com/mjeker99-collab/studiojeker-website",
    );
    assert.equal(parsed.repos[0].prUrl, undefined);
    assert.equal(
      parsed.repos[0].startingRef,
      "feat/akquise-production-readiness",
    );
    assert.equal(parsed.autoCreatePR, true);
    assert.equal(parsed.workOnCurrentBranch, false);
    assert.equal(body.includes("/pull/313"), false);
    assert.equal(body.includes("/pull/305"), false);
    return json({
      agent: { id: agentId, url: `https://cursor.com/agents/${agentId}` },
      run: { id: runId, agentId, status: "CREATING" },
    });
  }
  if (
    target === `https://api.cursor.com/v1/agents/${agentId}` &&
    init?.method === "GET"
  )
    return json({ id: agentId, latestRunId: runId });
  if (
    target === `https://api.cursor.com/v1/agents/${agentId}/runs/${runId}` &&
    init?.method === "GET"
  )
    return json({
      id: runId,
      status: "FINISHED",
      previewUrl: freshPr,
      htmlPreviewUrl: "https://preview.studiojeker.ch/newsletter/v4.html",
      git: {
        branches: [
          {
            prUrl:
              "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
          },
          { prUrl: freshPr },
        ],
      },
    });
  return json({ code: "unexpected" }, 500);
};

before(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      timeout: 30000,
      stdio: "pipe",
    },
  );
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin-cursor@example.test",
        passwordHash: "synthetic",
      },
    })
  ).id;
});

after(async () => {
  await db.$disconnect();
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await client.$disconnect();
});

test("V3 kann nie an Cursor gehen und ohne Ausgabe gibt es einen Folgeschritt", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  const newsletter = newsletterDefaults("newsletter-03");
  const saved = await saveContent(actor, {
    kind: "NEWSLETTER",
    title: "Geschützte Ausgabe",
    ownerId: actor,
    campaignId: null,
    scheduledAt: null,
    subject: "Test",
    preheader: "Test",
    body: newsletterText(newsletter),
    audience: "Interner Test",
    variants: [],
    newsletter,
  });
  await assert.rejects(
    handoffNewsletter(actor, saved.id, "Layout der Vorlage ändern.", {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
    }),
    /geschützt/,
  );
  assert.equal(calls.length, 0);
  assert.equal(await db.newsletterEdition.count(), 0);
});

test("Freigegebene aktuelle V4 kann gestartet werden, Doppelstart und Versionswechsel stoppen", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  const edition = await createV4Edition(actor);
  const editorial = await handoffNewsletter(
    actor,
    edition.contentId,
    "Bitte den Betreff kürzer formulieren.",
    {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
    },
  );
  assert.equal(editorial.route, "gpt");
  assert.equal(editorial.task.complete, false);
  assert.equal(calls.length, 0);
  const started = await handoffNewsletter(
    actor,
    edition.contentId,
    "Bitte das Layout der Vorlage ändern.",
    {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
    },
  );
  assert.equal(started.task.status, "HANDED_OFF");
  assert.equal(started.task.complete, false);
  assert.equal(calls.length, 1);
  await assert.rejects(
    handoffNewsletter(
      actor,
      edition.contentId,
      "Bitte das Layout noch einmal ändern.",
      {
        env: { CURSOR_API_KEY: key },
        fetchImpl,
      },
    ),
    /läuft bereits/,
  );
  assert.equal(calls.length, 1);
  const before = await db.newsletterCursorTask.findUniqueOrThrow({
    where: { contentId: edition.contentId },
  });
  await db.marketingContent.update({
    where: { id: edition.contentId },
    data: { version: before.version + 1 },
  });
  await assert.rejects(
    handoffNewsletter(
      actor,
      edition.contentId,
      "Bitte das Layout der Vorlage ändern.",
      {
        env: { CURSOR_API_KEY: key },
        fetchImpl,
      },
    ),
    /nicht übertragen/,
  );
  const after = await db.newsletterCursorTask.findUniqueOrThrow({
    where: { contentId: edition.contentId },
  });
  assert.equal(after.version, before.version);
  assert.equal(after.agentId, before.agentId);
  assert.equal(calls.length, 1);
  await db.marketingContent.update({
    where: { id: edition.contentId },
    data: { version: before.version },
  });
  const refreshed = await refreshNewsletterCursor(actor, edition.contentId, {
    env: { CURSOR_API_KEY: key },
    fetchImpl,
  });
  assert.equal(refreshed.task?.status, "PREVIEW_READY");
  assert.equal(refreshed.task?.complete, false);
  assert.equal(
    refreshed.task?.previewUrl,
    "https://preview.studiojeker.ch/newsletter/v4.html",
  );
  assert.equal(refreshed.task?.reviewUrl, freshPr);
  assert.match(refreshed.task?.note || "", /nicht erledigt/);
  const storedEdition = await db.newsletterEdition.findUniqueOrThrow({
    where: { contentId: edition.contentId },
  });
  assert.equal(storedEdition.prUrl, freshPr);
  assert.equal(storedEdition.prUrl.includes("/313"), false);
  const storedTask = await db.newsletterCursorTask.findUniqueOrThrow({
    where: { contentId: edition.contentId },
  });
  assert.equal(
    storedTask.previewHtml,
    "https://preview.studiojeker.ch/newsletter/v4.html",
  );
  assert.equal(storedTask.previewHtml.includes("github.com"), false);
});

test("Versionswechsel unmittelbar vor dem Cursor-Aufruf verhindert die Übertragung", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  const edition = await createV4Edition(actor);
  await assert.rejects(
    handoffNewsletter(
      actor,
      edition.contentId,
      "Bitte das Layout der Vorlage ändern.",
      {
        env: { CURSOR_API_KEY: key },
        fetchImpl,
        beforeCursorCall: async () => {
          await db.marketingContent.update({
            where: { id: edition.contentId },
            data: { version: edition.version + 1 },
          });
        },
      },
    ),
    /nicht übertragen/,
  );
  assert.equal(calls.length, 0);
});

test("Ein fremdes Testkonto sieht und steuert den Newsletter eines anderen nicht", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  const other = await db.user.create({
    data: {
      name: "Externe Testperson",
      email: "extern-cursor@example.test",
      passwordHash: "synthetic",
    },
  });
  const nora = await db.user.create({
    data: {
      name: "Nora Jeker",
      email: "nora-cursor@example.test",
      passwordHash: "synthetic",
    },
  });
  const edition = await createV4Edition(actor);
  await db.newsletterCursorTask.create({
    data: {
      contentId: edition.contentId,
      userId: actor,
      version: edition.version,
      templateId: "newsletter-03",
      instruction: "Geheime Anweisung des Besitzers",
      status: "PREVIEW_READY",
      prUrl: freshPr,
      previewHtml: "https://preview.studiojeker.ch/newsletter/secret.html",
      route: "cursor",
    },
  });
  const content = {
    id: edition.contentId,
    kind: "NEWSLETTER",
    title: "Newsletter V4 · Entwurf",
    version: edition.version,
    ownerId: actor,
    organizationId: "studiojeker",
    versions: [{ payload: { newsletter: { templateId: "newsletter-03" } } }],
  };
  const hidden = await newsletterCursorState(other.id, [content]);
  assert.equal(hidden.tasks.length, 0);
  assert.equal(hidden.editions.length, 0);
  assert.equal(JSON.stringify(hidden).includes("Geheime Anweisung"), false);
  assert.equal(JSON.stringify(hidden).includes(freshPr), false);
  assert.equal(JSON.stringify(hidden).includes("secret.html"), false);
  await assert.rejects(
    handoffNewsletter(
      other.id,
      edition.contentId,
      "Bitte das Layout der Vorlage ändern.",
      {
        env: { CURSOR_API_KEY: key },
        fetchImpl,
      },
    ),
    /Keine Berechtigung/,
  );
  await assert.rejects(
    refreshNewsletterCursor(other.id, edition.contentId, {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
    }),
    /Keine Berechtigung/,
  );
  assert.equal(calls.length, 0);
  const shared = await newsletterCursorState(nora.id, [content]);
  assert.equal(shared.tasks.length, 1);
  assert.equal(shared.tasks[0]?.reviewUrl, freshPr);
});
