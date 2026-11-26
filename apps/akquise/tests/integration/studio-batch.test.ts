import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Integrationstests nur gegen lokale PostgreSQL-Instanz.");
const schema = "test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { hashPassword } = await import("../../lib/auth");
const { createSeriesBatch } = await import("../../lib/studio/batch");
let actor: string;

before(async () => {
  execFileSync(
    "node",
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      stdio: "pipe",
      timeout: 20000,
    },
  );
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: hashPassword("synthetisch-martin-123"),
      },
    })
  ).id;
});

after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({
    datasourceUrl: new URL(process.env.DATABASE_URL!).toString(),
  });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});

function brief(title: string, campaignId: string | null = null) {
  return {
    title,
    topic: "Synthetischer Testinhalt für einen privaten Entwurf.",
    offer: "",
    goal: "Social-Media-Beiträge vorbereiten",
    audience: "KMU in der Schweiz",
    tone: "Persönlich und professionell",
    channels: ["FACEBOOK", "INSTAGRAM", "LINKEDIN"],
    count: 6,
    formats: ["4:5"],
    campaignId,
    customerId: null,
    referenceAssetIds: [],
    brandRules: ["tone", "services", "audiences"],
    workspace: "CONTENT_DRAFT",
  };
}

test("Content-Studio batch is atomic and idempotent", async () => {
  const requestKey = randomUUID();
  const items = Array.from({ length: 4 }, (_, index) =>
    brief(`Synthetischer Bereich ${index + 1}/4`),
  );
  const first = await createSeriesBatch(actor, { requestKey, items });
  assert.equal(first.replayed, false);
  assert.equal(first.series.length, 4);
  const ids = first.series.map((series) => series.id);
  assert.equal(
    await db.marketingContent.count({
      where: { studioSeriesId: { in: ids }, workspace: "CONTENT_DRAFT" },
    }),
    24,
  );
  const replay = await createSeriesBatch(actor, { requestKey, items });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.series.map((series) => series.id), ids);
  assert.equal(
    await db.studioSeries.count({ where: { id: { in: ids } } }),
    4,
  );
});

test("Content-Studio batch rolls back every series when one item is invalid", async () => {
  const before = await db.studioSeries.count({ where: { organizationId: "studiojeker" } });
  const items = [
    brief("Synthetischer gültiger Bereich"),
    brief("Synthetischer ungültiger Bereich", "missing-campaign"),
  ];
  await assert.rejects(
    createSeriesBatch(actor, { requestKey: randomUUID(), items }),
  );
  const afterCount = await db.studioSeries.count({ where: { organizationId: "studiojeker" } });
  assert.equal(afterCount, before);
});
