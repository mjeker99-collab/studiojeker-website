import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { emptyKnowledge } from "../../lib/customer-knowledge";
import { ProviderFailure } from "../../lib/studio/provider";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "customer_assistant_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { assistCustomer } = await import("../../lib/customer-assistant/service");
const { studioState, runJob, applyJob } =
  await import("../../lib/studio/service");
let actor: string;
const input = () => ({
  requestKey: randomUUID(),
  name: "Example AG",
  website: "https://example.com",
  knowledge: emptyKnowledge,
  mode: "RESEARCH",
});
const result = {
  knowledge: { ...emptyKnowledge, company: "Example AG" },
  citations: [],
  sources: [],
  questions: [],
  researchedAt: new Date().toISOString(),
  mode: "RESEARCH" as const,
};
const provider = async () => ({ result, usage: {}, requestId: "synthetic" });
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
  process.env.CONTENT_AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "synthetic-never-used";
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});
test("authorization, single-start, caching, shared budget, failure isolation and no customer writes", async () => {
  let calls = 0;
  await assert.rejects(
    assistCustomer("missing-user", input(), provider),
    /Berechtigung/,
  );
  const data = input();
  const response = await assistCustomer(actor, data, async () => {
    calls++;
    return provider();
  });
  assert.deepEqual(response, result);
  assert.deepEqual(
    await assistCustomer(actor, data, async () => {
      calls++;
      return provider();
    }),
    result,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    assistCustomer(actor, { ...data, name: "Different customer" }, provider),
    /anders verwendet/,
  );
  const job = await db.studioJob.findUniqueOrThrow({
    where: { requestKey: data.requestKey },
  });
  assert.equal(job.seriesId, null);
  assert.equal(job.status, "SUCCEEDED");
  assert.equal(await db.customer.count(), 0);
  assert.equal(await db.studioSeries.count(), 0);
  assert.equal((await studioState(actor)).jobs.length, 0);
  await assert.rejects(runJob(actor, job.id), /nicht zugänglich/);
  await assert.rejects(applyJob(actor, job.id), /Auftrag erforderlich/);
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "1";
  await assert.rejects(assistCustomer(actor, input(), provider), /Tageslimit/);
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "20";
  process.env.CONTENT_DAILY_BUDGET_USD = "0.4";
  await assert.rejects(assistCustomer(actor, input(), provider), /Tageslimit/);
  process.env.CONTENT_DAILY_BUDGET_USD = "5";
  const failure = input();
  await assert.rejects(
    assistCustomer(actor, failure, async () => {
      throw new ProviderFailure(true, "Timeout; keine Wiederholung");
    }),
    /Timeout/,
  );
  assert.equal(
    (
      await db.studioJob.findUniqueOrThrow({
        where: { requestKey: failure.requestKey },
      })
    ).status,
    "UNKNOWN",
  );
  await assert.rejects(assistCustomer(actor, failure, provider), /Timeout/);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = assistCustomer(actor, input(), async () => {
    started();
    await gate;
    return provider();
  });
  await ready;
  try {
    await assert.rejects(
      assistCustomer(actor, input(), provider),
      /läuft bereits/,
    );
  } finally {
    release();
    await pending;
  }
  process.env.CONTENT_AI_ENABLED = "false";
  await assert.rejects(
    assistCustomer(actor, input(), provider),
    /nicht verbunden/,
  );
});

test("Mail assistant saves sourced leads without approval, deduplicates imports and binds texts to draft versions", async () => {
  const { assistMail, applyMailAssistant } =
    await import("../../lib/mail-assistant/service");
  const { newDraft } = await import("../../lib/workflow");
  process.env.CONTENT_AI_ENABLED = "true";
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "1000";
  process.env.CONTENT_DAILY_BUDGET_USD = "1000";
  const lead = {
    organisation: "Test Lead AG",
    firstName: "Anna",
    lastName: "Lead",
    email: "anna@lead.example",
    industry: "Architektur",
    region: "Bern",
    position: "Partnerin",
    website: "https://lead.example",
    sourceUrl: "https://lead.example/team",
    hook: "Wohnbauten in Bern.",
    service: "Architekturvisualisierungen",
  };
  const input = {
    requestKey: randomUUID(),
    mode: "RESEARCH",
    briefing: "Architekturbüros in Bern",
  };
  const provider = async () => ({
    result: { leads: [lead], mails: [], note: "" },
    usage: {},
    requestId: "test",
  });
  await assert.rejects(assistMail("missing", input, provider), /Berechtigung/);
  const generated = await assistMail(actor, input, provider);
  const cached = await assistMail(actor, input, async () => {
    throw new Error("Must not run again");
  });
  assert.equal(cached.id, generated.id);
  const imported = await applyMailAssistant(actor, { id: generated.id });
  assert.ok("imported" in imported);
  assert.equal(imported.imported, 1);
  const duplicate = await applyMailAssistant(actor, { id: generated.id });
  assert.ok("duplicates" in duplicate);
  assert.equal(duplicate.duplicates, 1);
  const c = await db.contact.findFirstOrThrow({ where: { email: lead.email } });
  assert.equal(c.confidence, "UNCONFIRMED");
  assert.equal(await db.approval.count({ where: { contactId: c.id } }), 0);
  await db.contact.update({
    where: { id: c.id },
    data: { confidence: "VERIFIED", verifiedAt: new Date() },
  });
  const draft = await newDraft(actor, c.id);
  const write = await assistMail(
    actor,
    {
      requestKey: randomUUID(),
      mode: "WRITE",
      briefing: "Persönlich und knapp schreiben",
      items: [{ id: draft.id, version: 1 }],
    },
    async () => ({
      result: {
        leads: [],
        mails: [
          {
            id: draft.id,
            version: 1,
            subject: "Persönlicher Vorschlag",
            body: "Guten Tag Anna Lead\n\nIhr Wohnbauprojekt.",
          },
        ],
        note: "",
      },
      usage: {},
      requestId: "test",
    }),
  );
  const applied = await applyMailAssistant(actor, { id: write.id });
  assert.ok("results" in applied);
  assert.ok(applied.results[0].ok);
  const again = await applyMailAssistant(actor, { id: write.id });
  assert.ok("results" in again);
  assert.ok(again.results[0].ok);
  assert.equal(
    (await db.draft.findUniqueOrThrow({ where: { id: draft.id } })).version,
    2,
  );
  assert.equal(await db.delivery.count(), 0);
});
