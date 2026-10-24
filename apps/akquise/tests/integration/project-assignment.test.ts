import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "project_assignment_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.MARTIN_EMAIL = "martin@example.test";
const { db } = await import("../../lib/db");
const { createSeries, studioState } = await import("../../lib/studio/service");
const { assignProject } = await import("../../lib/studio/projects");
let actor: string;
let customer: string;
let campaign: string;
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
  actor = (
    await db.user.create({
      data: {
        name: "Martin",
        email: "martin@example.test",
        passwordHash: "unused",
      },
    })
  ).id;
  await db.studioOrganization.upsert({
    where: { id: "studiojeker" },
    create: { id: "studiojeker", name: "Studiojeker", brand: {} },
    update: {},
  });
  customer = (
    await db.customer.create({
      data: { organizationId: "studiojeker", name: "Testkunde" },
    })
  ).id;
  campaign = (
    await db.campaign.create({
      data: {
        title: "Visibility Abo",
        customerId: customer,
        goal: "Sichtbarkeit",
        audience: "KMU",
        startsAt: new Date(),
        endsAt: new Date(),
        ownerId: actor,
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
async function fixture() {
  return createSeries(actor, {
    title: "Langes Briefing ohne Zuordnung",
    topic: "Sichtbarkeit im Abo",
    offer: "",
    goal: "Mehr Sichtbarkeit",
    audience: "KMU",
    tone: "Sachlich",
    channels: ["INSTAGRAM"],
    count: 1,
    formats: ["4:5"],
    customerId: null,
    campaignId: null,
    referenceAssetIds: [],
  });
}
const assignment = {
  title: "Visibility Abo",
  customerId: "",
  campaignId: "",
  expectedTitle: "Langes Briefing ohne Zuordnung",
  expectedCustomerId: null,
  expectedCampaignId: null,
};

test("assignment preserves GPT history and old content versions, and survives reload", async () => {
  const series = await fixture();
  const old = await db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: series.id },
    include: { versions: true },
  });
  const job = await db.studioJob.create({
    data: {
      seriesId: series.id,
      userId: actor,
      requestKey: randomBytes(12).toString("hex"),
      kind: "CHAT",
      status: "SUCCEEDED",
      input: { request: { message: "Mein Briefing" } },
      result: { reply: "Gespeicherter Kampagnenplan" },
      model: "synthetic",
      reserveUsd: 0,
    },
  });
  await assignProject(actor, series.id, {
    ...assignment,
    customerId: customer,
    campaignId: campaign,
  });
  const state = await studioState(actor, series.id);
  assert.equal(state.series[0].customerId, customer);
  assert.equal(
    (state.series[0].briefing as { campaignId: string }).campaignId,
    campaign,
  );
  assert.equal(state.series[0].title, "Visibility Abo");
  assert.deepEqual(state.jobs[0].result, job.result);
  const content = await db.marketingContent.findUniqueOrThrow({
    where: { id: old.id },
    include: { versions: { orderBy: { version: "asc" } } },
  });
  assert.equal(content.campaignId, campaign);
  assert.equal(content.version, old.version + 1);
  assert.deepEqual(content.versions[0].payload, old.versions[0].payload);
  assert.equal(
    (content.versions[1].payload as { campaignId: string }).campaignId,
    campaign,
  );
  await assert.rejects(
    () =>
      assignProject(actor, series.id, {
        ...assignment,
        customerId: customer,
        campaignId: campaign,
      }),
    /Projekt wurde geändert/,
  );
});

test("invalid campaign/customer pair and protected content roll back the whole assignment", async () => {
  const series = await fixture();
  await assert.rejects(
    () =>
      assignProject(actor, series.id, {
        ...assignment,
        customerId: null,
        campaignId: campaign,
      }),
    /Kampagne gehört nicht/,
  );
  await db.marketingContent.updateMany({
    where: { studioSeriesId: series.id },
    data: { status: "APPROVED" },
  });
  await assert.rejects(
    () =>
      assignProject(actor, series.id, {
        ...assignment,
        customerId: customer,
        campaignId: campaign,
      }),
    /Nur Entwürfe/,
  );
  const unchanged = await db.studioSeries.findUniqueOrThrow({
    where: { id: series.id },
  });
  assert.equal(unchanged.customerId, null);
  assert.equal(unchanged.title, assignment.expectedTitle);
  assert.equal(
    await db.marketingVersion.count({
      where: { content: { studioSeriesId: series.id } },
    }),
    1,
  );
  await assert.rejects(
    () =>
      assignProject("unknown-user", series.id, {
        ...assignment,
        customerId: customer,
        campaignId: campaign,
      }),
    /Keine Berechtigung/,
  );
});

test("project-specific history is not truncated by newer jobs in other projects", async () => {
  const series = await fixture();
  const other = await fixture();
  await db.studioJob.createMany({
    data: Array.from({ length: 103 }, (_, i) => ({
      seriesId: i === 0 ? series.id : other.id,
      userId: actor,
      requestKey: randomBytes(12).toString("hex"),
      kind: "CHAT",
      status: "SUCCEEDED",
      input: {},
      result: { reply: `Antwort ${i}` },
      model: "synthetic",
      reserveUsd: 0,
      createdAt: new Date(Date.now() + i * 1000),
    })),
  });
  const state = await studioState(actor, series.id);
  assert.equal(state.jobs.length, 1);
  assert.deepEqual(state.jobs[0].result, { reply: "Antwort 0" });
});
