import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  newsletterDefaults,
  newsletterText,
} from "../../lib/hub/newsletter-template";
import { contentInput } from "../../lib/hub/input";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "gpt_connector_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.CHATGPT_CONNECTOR_TOKEN =
  "test-connector-token-" + randomBytes(16).toString("hex");
process.env.CHATGPT_CONNECTOR_WRITE_TOKEN =
  "test-write-token-" + randomBytes(16).toString("hex");
process.env.MARTIN_EMAIL = "martin@example.test";
process.env.APP_URL = "http://localhost:3100";

const { db } = await import("../../lib/db");
const auth = await import("../../lib/gpt-connector/auth");
const service = await import("../../lib/gpt-connector/service");
const settings = await import("../../lib/gpt-connector/settings");
const drafts = await import("../../lib/gpt-connector/drafts");
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

function writeReq(
  path: string,
  init?: { method?: string; body?: unknown; ifMatch?: string },
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.CHATGPT_CONNECTOR_WRITE_TOKEN!}`,
  };
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";
  if (init?.ifMatch) headers["If-Match"] = init.ifMatch;
  return new Request(`http://localhost:3100${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

test("Connector rejects missing/wrong token and revoked access", async () => {
  await assert.rejects(
    () =>
      auth.requireGptConnector(
        bearerReq("/api/integrations/gpt/campaigns", "wrong"),
        "campaigns",
      ),
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
    () =>
      auth.requireGptConnector(
        bearerReq("/api/integrations/gpt/campaigns"),
        "campaigns",
      ),
    (e: Error & { status?: number }) => e.status === 403,
  );
  await settings.restoreGptAccess(actor);
});

test("Unshared campaign is invisible; shared Sichtbarkeit im Abo is readable", async () => {
  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq("/api/integrations/gpt/campaigns"),
    "campaigns",
  );
  const empty = await service.listSharedCampaigns();
  assert.equal(empty.campaigns.length, 0);

  await settings.setGptShare(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    shared: true,
  });

  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq("/api/integrations/gpt/campaigns"),
    "campaigns",
  );
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
  assert.ok(
    search.results.some(
      (r) => r.id === campaignId || r.campaignId === campaignId,
    ),
  );

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
    write_drafts: false,
  });
  await assert.rejects(
    () =>
      auth.requireGptConnector(
        bearerReq("/api/integrations/gpt/campaigns"),
        "campaigns",
      ),
    (e: Error & { status?: number }) => e.status === 403,
  );
  await settings.updateGptScopes(actor, {
    projects: true,
    campaigns: true,
    concepts: true,
    content: true,
    write_drafts: false,
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

  const stillThere = await db.campaign.findUnique({
    where: { id: campaignId },
  });
  assert.equal(stillThere?.title, "Sichtbarkeit im Abo");
  assert.equal(
    await db.marketingContent.count({ where: { id: contentId } }),
    1,
  );

  const status = await settings.gptConnectorStatus(actor);
  assert.equal(status.tokenConfigured, true);
  assert.equal(status.writeTokenConfigured, true);
  assert.equal(status.revoked, false);
  assert.equal(status.scopes.write_drafts, false);
  assert.equal(status.writeDraftsEnabled, false);
  assert.ok(status.lastAccessAt);
  // Never expose the raw tokens in status payloads.
  assert.equal(
    JSON.stringify(status).includes(process.env.CHATGPT_CONNECTOR_TOKEN!),
    false,
  );
  assert.equal(
    JSON.stringify(status).includes(process.env.CHATGPT_CONNECTOR_WRITE_TOKEN!),
    false,
  );
});

test("Write drafts: auth, grants, create/read, locking, idempotency, no side effects", async () => {
  auth.resetConnectorRateLimit();

  // Read token must not authorize writes.
  await assert.rejects(
    () =>
      auth.requireGptWrite(
        bearerReq(
          "/api/integrations/gpt/drafts",
          process.env.CHATGPT_CONNECTOR_TOKEN!,
        ),
      ),
    (e: Error & { status?: number }) => e.status === 401,
  );

  // write_drafts still off → 403 even with write token.
  await assert.rejects(
    () => auth.requireGptWrite(writeReq("/api/integrations/gpt/drafts")),
    (e: Error & { status?: number }) => e.status === 403,
  );

  await settings.updateGptScopes(actor, {
    projects: true,
    campaigns: true,
    concepts: true,
    content: true,
    write_drafts: true,
  });
  auth.resetConnectorRateLimit();
  await auth.requireGptWrite(writeReq("/api/integrations/gpt/drafts"));

  const newsletter = newsletterDefaults("newsletter-03");
  const createBody = {
    kind: "NEWSLETTER" as const,
    title: "Newsletter 3 · Visibility Abo Entwurf",
    campaignId,
    subject: "Sichtbarkeit im Abo – Entwurf aus ChatGPT",
    preheader: "Promotion bis 30. November 2026",
    body: newsletterText(newsletter),
    audience: "Abo-Interessenten",
    newsletter,
    idempotencyKey: "nl3-visibility-abo-test-key",
  };

  // No write grant yet → 403
  await assert.rejects(
    () => drafts.createDraft(actor, createBody),
    (e: Error & { status?: number }) => e.status === 403,
  );

  await settings.setGptWriteGrant(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    granted: true,
  });

  const created = await drafts.createDraft(actor, createBody);
  assert.equal(created.type, "MARKETING");
  assert.equal(created.kind, "NEWSLETTER");
  assert.equal(created.status, "DRAFT");
  assert.equal(created.version, 1);
  assert.match(String(created.draft?.subject), /Sichtbarkeit im Abo/);
  assert.equal(created.draft?.newsletter?.templateId, "newsletter-03");

  // Second call with same idempotency key does not duplicate.
  const privateRead = await db.gptShare.findUnique({
    where: {
      entityType_entityId: { entityType: "CAMPAIGN", entityId: campaignId },
    },
  });
  await db.gptShare.deleteMany({
    where: { entityType: "CAMPAIGN", entityId: campaignId },
  });
  await assert.rejects(
    () => drafts.getDraft(created.id, undefined, false),
    /nicht freigegeben/,
  );
  assert.equal((await drafts.getDraft(created.id)).id, created.id);
  if (privateRead) await db.gptShare.create({ data: privateRead });
  const ungrantedSeries = await db.studioSeries.create({
    data: { title: "Nicht freigegeben", ownerId: actor, briefing: {} },
  });
  await assert.rejects(
    () =>
      drafts.createDraft(actor, {
        ...createBody,
        seriesId: ungrantedSeries.id,
        idempotencyKey: "ungranted-combination-test",
      }),
    /nicht freigegeben/,
  );
  const replay = await drafts.createDraft(actor, createBody);
  assert.equal(replay.id, created.id);
  assert.equal(replay.idempotentReplay, true);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      drafts.createDraft(actor, {
        ...createBody,
        title: "Concurrent test draft",
        idempotencyKey: "concurrent-draft-test-key",
      }),
    ),
  );
  assert.equal(concurrent[0].id, concurrent[1].id);
  await settings.setGptWriteGrant(actor, {
    entityType: "SERIES",
    entityId: ungrantedSeries.id,
    granted: true,
  });
  const linked = await drafts.createDraft(actor, {
    ...createBody,
    seriesId: ungrantedSeries.id,
    idempotencyKey: "linked-series-draft-test",
  });
  const linkedUpdated = await drafts.updateDraft(actor, linked.id, {
    expectedVersion: 1,
    subject: "Geändert im selben Projekt",
  });
  assert.equal(linkedUpdated.seriesId, ungrantedSeries.id);
  assert.equal(
    await db.marketingContent.count({
      where: { title: "Concurrent test draft" },
    }),
    1,
  );
  assert.equal(
    await db.marketingContent.count({
      where: { title: "Newsletter 3 · Visibility Abo Entwurf" },
    }),
    1,
  );

  // Read back via getDraft
  const read = await drafts.getDraft(created.id);
  assert.equal(read.id, created.id);
  assert.equal(read.status, "DRAFT");
  assert.equal(read.type, "MARKETING");
  assert.match(
    String(read.type === "MARKETING" ? read.draft?.preheader : ""),
    /30\. November 2026/,
  );

  // First update succeeds and bumps version.
  const ok = await drafts.updateDraft(
    actor,
    created.id,
    { expectedVersion: 1, subject: "Aktualisierter Betreff Visibility Abo" },
    "1",
  );
  assert.equal(ok.version, 2);
  assert.equal(ok.status, "DRAFT");

  // Stale expectedVersion → 409
  await assert.rejects(
    () =>
      drafts.updateDraft(actor, created.id, {
        expectedVersion: 1,
        subject: "should-conflict",
      }),
    (e: Error & { status?: number }) => e.status === 409,
  );

  // Forbidden fields rejected by schema
  await assert.rejects(
    () =>
      drafts.updateDraft(actor, created.id, {
        expectedVersion: 2,
        status: "APPROVED",
      } as never),
    (e: Error & { name?: string }) => e.name === "ZodError",
  );

  // No Mailchimp / publication / export side effects
  assert.equal(
    await db.newsletterExport.count({ where: { contentId: created.id } }),
    0,
  );
  assert.equal(
    await db.mailchimpTransfer.count({ where: { contentId: created.id } }),
    0,
  );
  assert.equal(
    await db.manualPublication.count({ where: { contentId: created.id } }),
    0,
  );

  const audits = await db.audit.findMany({
    where: {
      entityId: created.id,
      action: {
        in: [
          "GPT_DRAFT_CREATED",
          "GPT_DRAFT_UPDATED",
          "MARKETING_VERSION_SAVED",
        ],
      },
    },
  });
  assert.ok(audits.some((a) => a.action === "GPT_DRAFT_CREATED"));
  assert.ok(audits.some((a) => a.action === "GPT_DRAFT_UPDATED"));

  // Unshare write grant → further updates blocked
  await settings.setGptWriteGrant(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    granted: false,
  });
  await assert.rejects(
    () =>
      drafts.updateDraft(actor, created.id, {
        expectedVersion: 2,
        subject: "blocked",
      }),
    (e: Error & { status?: number }) => e.status === 403,
  );

  // Reading existing shared content still works with read token.
  await settings.setGptShare(actor, {
    entityType: "CAMPAIGN",
    entityId: campaignId,
    shared: true,
  });
  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq(`/api/integrations/gpt/campaigns/${campaignId}`),
    "campaigns",
  );
  const stillReadable = await service.getSharedCampaign(campaignId);
  assert.ok(
    stillReadable.contents.some(
      (c) => c.id === contentId || c.id === created.id,
    ),
  );

  const status = await settings.gptConnectorStatus(actor);
  assert.equal(status.scopes.write_drafts, true);
  assert.ok(status.lastWriteAccessAt);
});

test("Write token missing disables writes without affecting reads", async () => {
  const previous = process.env.CHATGPT_CONNECTOR_WRITE_TOKEN;
  delete process.env.CHATGPT_CONNECTOR_WRITE_TOKEN;
  auth.resetConnectorRateLimit();
  await assert.rejects(
    () =>
      auth.requireGptWrite(
        new Request("http://localhost:3100/api/integrations/gpt/drafts", {
          headers: { Authorization: `Bearer ${previous}` },
        }),
      ),
    (e: Error & { status?: number }) => e.status === 503,
  );
  process.env.CHATGPT_CONNECTOR_WRITE_TOKEN = previous;
  auth.resetConnectorRateLimit();
  await auth.requireGptConnector(
    bearerReq("/api/integrations/gpt/campaigns"),
    "campaigns",
  );
  const listed = await service.listSharedCampaigns();
  assert.ok(listed.campaigns.length >= 0);
});
