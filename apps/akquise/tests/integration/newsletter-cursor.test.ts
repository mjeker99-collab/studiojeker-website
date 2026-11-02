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
const { handoffNewsletter, refreshNewsletterCursor, resetCursorRateLimit } =
  await import("../../lib/cursor/newsletter");

const key = "synthetic-cursor-key-not-real";
const edition = {
  templateId: "newsletter-02",
  prUrl: "https://github.com/mjeker99-collab/studiojeker-website/pull/900001",
};
const agentId = "bc-11111111-1111-4111-8111-111111111111";
const runId = "run-22222222-2222-4222-8222-222222222222";
let actor = "";
let contentId = "";
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
  assert.equal(JSON.stringify(init?.headers).includes(key), false);
  assert.equal(target.startsWith("https://api.cursor.com/"), true);
  if (
    target === "https://api.cursor.com/v1/agents" &&
    init?.method === "POST"
  ) {
    assert.equal(body.includes(key), false);
    const parsed = JSON.parse(body) as {
      autoCreatePR: boolean;
      workOnCurrentBranch: boolean;
      repos: { url: string; prUrl: string }[];
    };
    assert.equal(parsed.autoCreatePR, false);
    assert.equal(parsed.workOnCurrentBranch, true);
    assert.equal(parsed.repos[0].prUrl, edition.prUrl);
    return json({
      agent: { id: agentId, url: `https://cursor.com/agents/${agentId}` },
      run: { id: runId, agentId, status: "CREATING" },
    });
  }
  if (
    target === `https://api.cursor.com/v1/agents/${agentId}` &&
    init?.method === "GET"
  )
    return json({ id: agentId, latestRunId: runId, status: "ACTIVE" });
  if (
    target === `https://api.cursor.com/v1/agents/${agentId}/runs/${runId}` &&
    init?.method === "GET"
  )
    return json({
      id: runId,
      agentId,
      status: "FINISHED",
      git: { branches: [{ prUrl: edition.prUrl }] },
    });
  if (
    target === `https://api.cursor.com/v1/agents/${agentId}/runs` &&
    init?.method === "POST"
  )
    return json({ run: { id: runId, agentId, status: "CREATING" } }, 409);
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
  const newsletter = newsletterDefaults("newsletter-02");
  const saved = await saveContent(actor, {
    kind: "NEWSLETTER",
    title: "Synthetischer Newsletter",
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
  contentId = saved.id;
});

after(async () => {
  await db.$disconnect();
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await client.$disconnect();
});

test("Ohne Schlüssel, geschützte Ausgabe und fremdes Ziel entsteht kein Auftrag", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  await assert.rejects(
    handoffNewsletter(actor, contentId, "Kürzer formulieren.", {
      env: { CURSOR_API_KEY: "" },
      fetchImpl,
      editions: [edition],
    }),
    /Cursor noch nicht verbunden/,
  );
  const protectedNewsletter = newsletterDefaults("newsletter-03");
  const locked = await saveContent(actor, {
    kind: "NEWSLETTER",
    title: "Geschützte Ausgabe",
    ownerId: actor,
    campaignId: null,
    scheduledAt: null,
    subject: "Test",
    preheader: "Test",
    body: newsletterText(protectedNewsletter),
    audience: "Interner Test",
    variants: [],
    newsletter: protectedNewsletter,
  });
  await assert.rejects(
    handoffNewsletter(actor, locked.id, "Text ändern.", {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
      editions: [{ templateId: "newsletter-03", prUrl: edition.prUrl }],
    }),
    /geschützt/,
  );
  await assert.rejects(
    handoffNewsletter(actor, contentId, "Kürzer formulieren.", {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
    }),
    /kein freigegebener Arbeitsstand/,
  );
  assert.equal(calls.length, 0);
  assert.equal(await db.newsletterCursorTask.count(), 0);
});

test("Bestätigter Start speichert die echten IDs und bleibt nach dem Reload sichtbar", async () => {
  resetCursorRateLimit();
  calls.length = 0;
  const started = await handoffNewsletter(
    actor,
    contentId,
    "Den Einstieg kürzer formulieren.",
    {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
      editions: [edition],
    },
  );
  assert.equal(started.task.status, "HANDED_OFF");
  assert.equal(started.task.label, "An Cursor übergeben");
  assert.equal(started.task.previewUrl, "");
  const stored = await db.newsletterCursorTask.findUniqueOrThrow({
    where: { contentId },
  });
  assert.equal(stored.agentId, agentId);
  assert.equal(stored.runId, runId);
  assert.equal(stored.templateId, "newsletter-02");
  await assert.rejects(
    handoffNewsletter(actor, contentId, "Noch einmal.", {
      env: { CURSOR_API_KEY: key },
      fetchImpl,
      editions: [edition],
    }),
    /läuft bereits/,
  );
  assert.equal(calls.length, 1);
  const refreshed = await refreshNewsletterCursor(actor, contentId, {
    env: { CURSOR_API_KEY: key },
    fetchImpl,
    editions: [edition],
  });
  assert.equal(refreshed.task?.status, "PREVIEW_READY");
  assert.equal(refreshed.task?.label, "Vorschau bereit");
  assert.equal(refreshed.task?.previewUrl, edition.prUrl);
  assert.equal(
    refreshed.task?.reviewUrl,
    `https://cursor.com/agents/${agentId}`,
  );
  const again = await db.newsletterCursorTask.findUniqueOrThrow({
    where: { contentId },
  });
  assert.equal(again.status, "PREVIEW_READY");
  const audits = await db.audit.findMany({
    where: { entityId: contentId, action: { startsWith: "CURSOR_NEWSLETTER" } },
  });
  assert.equal(JSON.stringify(audits).includes(key), false);
  assert.equal(JSON.stringify(audits).includes("Den Einstieg"), false);
});
