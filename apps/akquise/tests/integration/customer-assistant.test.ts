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
