import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "concept_test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const concepts = await import("../../lib/concepts/service");
const studio = await import("../../lib/studio/service");
const { emptyConcept, chapters } = await import("../../lib/concepts/input");
const complete = {
  ...emptyConcept,
  title: "Synthetisches Konzept",
  ...Object.fromEntries(
    chapters.map(([key]) => [key, `Geprüfte Angaben: ${key}`]),
  ),
};
let actor: string;
before(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      stdio: "pipe",
      timeout: 30000,
    },
  );
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: "not-used",
      },
    })
  ).id;
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});
test("Concepts persist immutable versions, invalidate approval and protect optimistic concurrency", async () => {
  const doc = await concepts.saveConcept(actor, complete);
  await concepts.approveConcept(actor, doc.id, { version: 1, confirmed: true });
  const outcomes = await Promise.allSettled([
    concepts.saveConcept(
      actor,
      { version: 1, data: { ...complete, title: "A" } },
      doc.id,
    ),
    concepts.saveConcept(
      actor,
      { version: 1, data: { ...complete, title: "B" } },
      doc.id,
    ),
  ]);
  assert.equal(outcomes.filter((v) => v.status === "fulfilled").length, 1);
  const state = await concepts.conceptState(actor, doc.id);
  assert.ok("versions" in state);
  assert.equal(state.versions.length, 2);
  assert.equal(state.versions[0].approvedAt, null);
  assert.ok(state.versions[1].approvedAt);
  await assert.rejects(
    concepts.approveConcept(actor, doc.id, { version: 1, confirmed: true }),
  );
  assert.equal(await db.marketingContent.count(), 0);
});
test("Missing chapters, inactive actors and foreign customers/campaigns are rejected", async () => {
  const doc = await concepts.saveConcept(actor, {
    ...emptyConcept,
    title: "Offen",
  });
  await assert.rejects(
    concepts.approveConcept(actor, doc.id, { version: 1, confirmed: true }),
  );
  await assert.rejects(concepts.conceptState("missing-user"));
  await assert.rejects(
    concepts.saveConcept(actor, {
      ...complete,
      customerId: "missing-customer",
    }),
  );
  await assert.rejects(
    concepts.saveConcept(actor, {
      ...complete,
      campaignId: "missing-campaign",
    }),
  );
  const customer = await db.customer.create({ data: { name: "Testkunde" } });
  await assert.rejects(
    concepts.saveConcept(
      actor,
      { version: 1, data: { ...complete, customerId: customer.id } },
      doc.id,
    ),
  );
});
test("Handoff requires current approval, is idempotent and retains the approved snapshot", async () => {
  const doc = await concepts.saveConcept(actor, complete);
  const input = {
    version: 1,
    startsAt: "2026-11-01T12:00:00.000Z",
    endsAt: "2026-12-01T12:00:00.000Z",
  };
  await assert.rejects(concepts.handoffConcept(actor, doc.id, input));
  await concepts.approveConcept(actor, doc.id, { version: 1, confirmed: true });
  const [a, b] = await Promise.all([
    concepts.handoffConcept(actor, doc.id, input),
    concepts.handoffConcept(actor, doc.id, input),
  ]);
  assert.equal(a.campaignId, b.campaignId);
  await concepts.saveConcept(
    actor,
    {
      version: 1,
      data: { ...complete, messages: "Neue, ungeprüfte Botschaften" },
    },
    doc.id,
  );
  const snapshot = await db.$transaction((tx) =>
    concepts.campaignConcept(tx, a.campaignId),
  );
  assert.equal(snapshot?.version, 1);
  assert.match(snapshot!.briefing, /Geprüfte Angaben: messages/);
  assert.ok(!snapshot!.briefing.includes("ungeprüfte"));
});
test("Strategy chat uses budgeted jobs, revision checks, saved transcript and selected customer", async () => {
  process.env.CONTENT_AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "synthetic-no-network";
  const customer = await db.customer.create({
    data: {
      name: "Synthetisches Büro",
      notes: "Kundenspezifische Positionierung",
    },
  });
  const doc = await concepts.saveConcept(actor, {
    ...complete,
    customerId: customer.id,
  });
  const stored = await db.strategyConcept.findUniqueOrThrow({
    where: { id: doc.id },
  });
  const input = {
    seriesId: stored.seriesId,
    kind: "CHAT",
    conceptVersion: 1,
    message: "Bitte das Briefing schärfen",
    contentId: null,
    requestKey: randomUUID(),
    referenceIds: [],
    referenceRights: true,
    referenceTransfer: true,
    confirmedCosts: true,
  };
  await assert.rejects(studio.queueJob(actor, { ...input, conceptVersion: 2 }));
  await assert.rejects(
    studio.queueJob(actor, { ...input, referenceTransfer: false }),
  );
  await assert.rejects(studio.queueJob(actor, { ...input, kind: "TEXT" }));
  const job = await studio.queueJob(actor, input);
  assert.equal((await studio.queueJob(actor, input)).id, job.id);
  let calls = 0;
  await studio.runJob(actor, job.id, {
    chat: async (context) => {
      calls++;
      const data = context as {
        strategy: { customer: { name: string }; version: number };
      };
      assert.equal(data.strategy.customer.name, customer.name);
      assert.equal(data.strategy.version, 1);
      return { reply: "Gezielte Rückfrage", usage: {}, requestId: "synthetic" };
    },
    text: async () => {
      throw new Error("unexpected");
    },
    image: async () => {
      throw new Error("unexpected");
    },
  });
  await assert.rejects(studio.runJob(actor, job.id));
  assert.equal(calls, 1);
  const state = await concepts.conceptState(actor, doc.id);
  assert.ok("series" in state);
  assert.equal(
    (state.series.jobs[0].result as { reply: string }).reply,
    "Gezielte Rückfrage",
  );
  const studioState = await studio.studioState(actor);
  assert.ok(
    !studioState.series.some((series) => series.id === stored.seriesId),
  );
  const originalLimit = process.env.CONTENT_DAILY_REQUEST_LIMIT;
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "1";
  await assert.rejects(
    studio.queueJob(actor, { ...input, requestKey: randomUUID() }),
  );
  if (originalLimit) process.env.CONTENT_DAILY_REQUEST_LIMIT = originalLimit;
  else delete process.env.CONTENT_DAILY_REQUEST_LIMIT;
});
