import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { newsletterDefaults, newsletterText } from "../../lib/hub/newsletter-template";
import { contentInput } from "../../lib/hub/input";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "gpt_connector_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.CHATGPT_CONNECTOR_TOKEN = "test-connector-token-" + randomBytes(16).toString("hex");
process.env.MARTIN_EMAIL = "martin@example.test";
process.env.APP_URL = "http://localhost:3100";

const { db } = await import("../../lib/db");
const auth = await import("../../lib/gpt-connector/auth");
const service = await import("../../lib/gpt-connector/service");
const settings = await import("../../lib/gpt-connector/settings");
const { saveCampaign, saveContent } = await import("../../lib/hub/workflow");
const { contentHash } = await import("../../lib/hub/workflow");

let actor: string;
let campaignId: string;
let contentId: string;

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
        email: "martin@example.test",
        passwordHash: "not-used",
      },
    })
  ).id;

  const campaign = await saveCampaign(actor, {
    customerId: null,
    title: "Sichtbarkeit im Abo",
    goal: "Marketing-Abos und Pakete für kontinuierliche Sichtbarkeit positionieren.",
    audience: "KMU und Entscheider in der Schweiz",
    ownerId: actor,
    startsAt: "2026-10-01T08:00:00.000Z",
    endsAt: "2026-11-30T22:59:59.000Z",
  });
  campaignId = campaign.id;

  const newsletter = newsletterDefaults("newsletter-03");
  const payload = contentInput.parse({
    kind: "NEWSLETTER",
    title: "Newsletter · Sichtbarkeit im Abo",
    ownerId: actor,
    campaignId,
    scheduledAt: null,
    subject: "Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.",
    preheader: "Pakete, Claims und Promotion bis 30. November 2026",
    body: newsletterText(newsletter),
    audience: "Bestehende und potenzielle Abo-Interessenten",
    variants: [],
    newsletter,
  });
  const content = await saveContent(actor, payload);
  contentId = content.id;
});

after(async () => {
  auth.resetConnectorRateLimit();
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});

function bearerReq(path: string, token = process.env.CHATGPT_CONNECTOR_TOKEN!) {
  return new Request(`http://localhost:3100${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test("Connector rejects missing/wrong token and revoked access", async () => {
  await assert.rejects(
    () => auth.requireGptConnector(bearerReq("/api/integrations/gpt/campaigns", "wrong"), "campaigns"),
    (e: Error & { status?: number }) => e.status === 401,
  );
  await assert.rejects(
    () =>
      auth.requireGptConnector(
        new Request("http://localhost:3100/api/integrations/gpt/campaigns"),
        "campaigns",
      ),
    (e: Error & { status?: number }) => e.status === 401,
  );

  await settings.revokeGptAccess(actor);
  await assert.rejects(
    () => auth.requireGptConnector(bearerReq("/api/integrations/gpt/campaigns"), "campaigns"),
    (e: Error & { status?: number }) => e.status === 403,
  );
  await settings.restoreGptAccess(actor);
});

test("Unshared campaign is invisible; shared Sichtbarkeit im Abo is readable", async () => {
  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(bearerReq("/api/integrations/gpt/campaigns"), "campaigns");
  const empty = await service.listSharedCampaigns();
  assert.equal(empty.campaigns.length, 0);

  await settings.setGptShare(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    shared: true,
  });

  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(bearerReq("/api/integrations/gpt/campaigns"), "campaigns");
  const listed = await service.listSharedCampaigns();
  assert.equal(listed.campaigns.length, 1);
  assert.equal(listed.campaigns[0].title, "Sichtbarkeit im Abo");

  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq(`/api/integrations/gpt/campaigns/${campaignId}`),
    "campaigns",
  );
  const detail = await service.getSharedCampaign(campaignId);
  assert.equal(detail.title, "Sichtbarkeit im Abo");
  assert.equal(detail.contents.length, 1);
  assert.equal(detail.contents[0].id, contentId);
  const draft = detail.contents[0].draft!;
  assert.equal(
    draft.subject,
    "Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.",
  );
  assert.match(String(draft.preheader), /30\. November 2026/);
  assert.ok(draft.newsletter);
  assert.equal(draft.newsletter!.templateId, "newsletter-03");
  const fields = draft.newsletter!.fields;
  assert.match(JSON.stringify(fields), /Sichtbarkeit im Abo/);
  assert.match(JSON.stringify(fields), /30\. November 2026/);
  // No acquisition/contact leakage
  assert.equal((detail as { drafts?: unknown }).drafts, undefined);
  assert.equal((draft as { recipient?: unknown }).recipient, undefined);

  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq("/api/integrations/gpt/content/search?q=Abo"),
    "content",
  );
  const search = await service.searchSharedContent("Sichtbarkeit im Abo");
  assert.ok(search.count >= 1);
  assert.ok(search.results.some((r) => r.id === campaignId || r.campaignId === campaignId));

  const promo = await service.searchSharedContent("30. November 2026");
  assert.ok(promo.count >= 1);

  // Content hash of stored marketing version remains unchanged (read-only).
  const version = await db.marketingVersion.findFirst({
    where: { contentId },
    orderBy: { version: "desc" },
  });
  assert.ok(version);
  assert.equal(
    version!.hash,
    contentHash(contentInput.parse(version!.payload)),
  );
});

test("Scope disable and share revoke block access without mutating content", async () => {
  auth.resetConnectorRateLimit();
  await settings.updateGptScopes(actor, {
    projects: true,
    campaigns: false,
    concepts: true,
    content: true,
  });
  await assert.rejects(
    () => auth.requireGptConnector(bearerReq("/api/integrations/gpt/campaigns"), "campaigns"),
    (e: Error & { status?: number }) => e.status === 403,
  );
  await settings.updateGptScopes(actor, {
    projects: true,
    campaigns: true,
    concepts: true,
    content: true,
  });

  await settings.setGptShare(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    shared: false,
  });
  await assert.rejects(
    () => service.getSharedCampaign(campaignId),
    (e: Error & { status?: number }) => e.status === 404,
  );

  const stillThere = await db.campaign.findUnique({ where: { id: campaignId } });
  assert.equal(stillThere?.title, "Sichtbarkeit im Abo");
  assert.equal(await db.marketingContent.count({ where: { id: contentId } }), 1);

  const status = await settings.gptConnectorStatus(actor);
  assert.equal(status.tokenConfigured, true);
  assert.equal(status.revoked, false);
  assert.ok(status.lastAccessAt);
  // Never expose the raw token in status payloads.
  assert.equal(JSON.stringify(status).includes(process.env.CHATGPT_CONNECTOR_TOKEN!), false);
});
