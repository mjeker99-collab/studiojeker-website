import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Nur lokale Testdatenbank.");
const schema = "newsletter_trash_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.MARTIN_EMAIL = "martin@example.test";
const { db } = await import("../../lib/db");
const { saveContent } = await import("../../lib/hub/workflow");
const { contentInput } = await import("../../lib/hub/input");
const { newsletterDefaults, newsletterText } = await import("../../lib/hub/newsletter-template");
const { manageNewsletter } = await import("../../lib/hub/newsletter-manage");

let actor: string;
before(async () => {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, NODE_TEST_CONTEXT: undefined }, stdio: "pipe", timeout: 60000,
  });
  actor = (await db.user.create({ data: { name: "Martin", email: "martin@example.test", passwordHash: "unused" } })).id;
  await db.studioOrganization.create({ data: { id: "studiojeker", name: "Test", brand: {} } });
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});
async function create() {
  const newsletter = newsletterDefaults("newsletter-02");
  const payload = contentInput.parse({
    kind: "NEWSLETTER", title: "Eigene Vorlage – Entwurf", ownerId: actor,
    campaignId: null, scheduledAt: null, subject: "Test", preheader: "",
    body: newsletterText(newsletter), audience: "Test", variants: [], newsletter,
  });
  return saveContent(actor, payload);
}
test("newsletter trash is reversible, version checked and audited", async () => {
  const a = await create();
  await assert.rejects(
    () => manageNewsletter("unknown-user", a.id, { action: "trash", version: 1 }),
    /Berechtigung/,
  );
  await assert.rejects(
    () => manageNewsletter(actor, a.id, { action: "trash", version: 2 }),
    /inzwischen geändert/,
  );
  await manageNewsletter(actor, a.id, { action: "trash", version: 1 });
  const archived = await db.marketingContent.findUniqueOrThrow({ where: { id: a.id } });
  assert.ok(archived.archivedAt);
  assert.equal(archived.version, 1);
  const old = await db.marketingVersion.findUniqueOrThrow({ where: { contentId_version: { contentId: a.id, version: 1 } } });
  await assert.rejects(() => saveContent(actor, old.payload, a.id, 1), /Papierkorb/);
  await manageNewsletter(actor, a.id, { action: "restore", version: 1 });
  assert.equal((await db.marketingContent.findUniqueOrThrow({ where: { id: a.id } })).archivedAt, null);
  const events = await db.audit.findMany({ where: { entityId: a.id } });
  assert.ok(events.some(x => x.action === "NEWSLETTER_TRASHED"));
  assert.ok(events.some(x => x.action === "NEWSLETTER_RESTORED"));
});
test("permanent delete needs trash and exact title, and only removes selected draft", async () => {
  const a = await create();
  const other = await create();
  await assert.rejects(() => manageNewsletter(actor, a.id, { action: "delete", version: 1, confirmedTitle: a.title }), /Papierkorb/);
  await manageNewsletter(actor, a.id, { action: "trash", version: 1 });
  await assert.rejects(() => manageNewsletter(actor, a.id, { action: "delete", version: 1, confirmedTitle: "Wrong" }), /Titel/);
  await manageNewsletter(actor, a.id, { action: "delete", version: 1, confirmedTitle: a.title });
  assert.equal(await db.marketingContent.findUnique({ where: { id: a.id } }), null);
  assert.ok(await db.marketingContent.findUnique({ where: { id: other.id } }));
  assert.equal(await db.marketingVersion.count({ where: { contentId: a.id } }), 0);
});
test("transferred or approved newsletters cannot be permanently deleted", async () => {
  const a = await create();
  await db.marketingApproval.create({ data: {
    contentId: a.id, version: 1, hash: "hash", userId: actor, status: "APPROVED",
  } });
  await manageNewsletter(actor, a.id, { action: "trash", version: 1 });
  await assert.rejects(
    () => manageNewsletter(actor, a.id, { action: "delete", version: 1, confirmedTitle: a.title }),
    /freigegeben/,
  );
  assert.ok(await db.marketingContent.findUnique({ where: { id: a.id } }));
});
