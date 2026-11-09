import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Nur lokale Testdatenbank.");
const schema = "newsletter_chat_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.MARTIN_EMAIL = "martin@example.test";
const { db } = await import("../../lib/db");
const { saveContent } = await import("../../lib/hub/workflow");
const { contentInput } = await import("../../lib/hub/input");
const { newsletterSession, applyNewsletterJob } = await import("../../lib/hub/newsletter-chat");
const { newsletterDefaults, newsletterText, getNewsletterTemplate } = await import("../../lib/hub/newsletter-template");
let actor: string;
before(async () => {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, NODE_TEST_CONTEXT: undefined }, stdio: "pipe", timeout: 60000,
  });
  actor = (await db.user.create({ data: { name: "Martin", email: "martin@example.test", passwordHash: "unused" } })).id;
  await db.studioOrganization.upsert({ where: { id: "studiojeker" }, create: { id: "studiojeker", name: "Test", brand: {} }, update: {} });
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});

async function fixture() {
  const newsletter = newsletterDefaults("newsletter-02");
  const payload = contentInput.parse({ kind: "NEWSLETTER", title: "Dialogtest", ownerId: actor,
    campaignId: null, scheduledAt: null, subject: "Alt", preheader: "", audience: "Test",
    body: newsletterText(newsletter), newsletter, variants: [] });
  const content = await saveContent(actor, payload);
  const sessions = await Promise.all([newsletterSession(actor, { id: content.id, version: 1 }), newsletterSession(actor, { id: content.id, version: 1 })]);
  assert.equal(sessions[0].seriesId, sessions[1].seriesId);
  assert.equal(await db.marketingContent.count({ where: { studioSeriesId: sessions[0].seriesId } }), 1);
  const key = getNewsletterTemplate(newsletter.templateId).slots.find((s) => !s.special && s.kind === "text")!.key;
  const job = await db.studioJob.create({ data: {
    seriesId: sessions[0].seriesId, userId: actor, kind: "CHAT", status: "SUCCEEDED",
    requestKey: randomBytes(16).toString("hex"), model: "synthetic", reserveUsd: 0,
    input: { request: { newsletterEdit: { id: content.id, version: 1 } } },
    result: { reply: JSON.stringify({ reply: "Angepasst", subject: "Neu", preheader: null, changes: [{ key, value: "Neue Headline" }] }) },
  } });
  return { content, payload, job, key };
}

test("newsletter dialogue persists, applies once, and keeps old versions without publishing", async () => {
  const { content, job, key } = await fixture();
  await assert.rejects(() => applyNewsletterJob("unknown-user", job.id), /Keine Berechtigung/);
  await applyNewsletterJob(actor, job.id);
  await applyNewsletterJob(actor, job.id);
  const current = await db.marketingContent.findUniqueOrThrow({ where: { id: content.id }, include: { versions: { orderBy: { version: "desc" } }, publications: true } });
  assert.equal(current.version, 2);
  assert.equal(current.status, "DRAFT");
  assert.equal(current.publications.length, 0);
  assert.equal(current.versions.length, 2);
  assert.equal(contentInput.parse(current.versions[0].payload).newsletter!.fields[key], "Neue Headline");
  assert.equal(contentInput.parse(current.versions[1].payload).subject, "Alt");
});

test("a late GPT reply cannot overwrite a newer newsletter version", async () => {
  const { content, payload, job } = await fixture();
  await saveContent(actor, { ...payload, subject: "Manuell geändert" }, content.id, 1);
  await assert.rejects(() => applyNewsletterJob(actor, job.id), /inzwischen geändert/);
  const latest = await db.marketingVersion.findUniqueOrThrow({ where: { contentId_version: { contentId: content.id, version: 2 } } });
  assert.equal(contentInput.parse(latest.payload).subject, "Manuell geändert");
});
