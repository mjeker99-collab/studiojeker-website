import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "project_draft_test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { projectDrafts, saveProjectDraft } =
  await import("../../lib/projects/service");
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

test("Draft round trip preserves unsent work, scopes users and rejects stale concurrent saves", async () => {
  const payload = {
    nativeId: "",
    message: "Noch nicht gesendet",
    referenceIds: ["reference"],
    form: { title: "Entwurf" },
  };
  const saved = await saveProjectDraft(actor, {
    area: "Kampagnen",
    title: "Testprojekt",
    payload,
  });
  const loaded = await projectDrafts(actor, "Kampagnen", saved.id);
  assert.ok(!Array.isArray(loaded));
  assert.deepEqual(loaded.payload, payload);
  const other = await db.user.create({
    data: {
      name: "Nora Jeker",
      email: "nora@example.test",
      passwordHash: "not-used",
    },
  });
  await assert.rejects(
    projectDrafts(other.id, "Kampagnen", saved.id),
    /nicht gefunden/,
  );
  await assert.rejects(
    projectDrafts(actor, "Website", saved.id),
    /nicht gefunden/,
  );
  await assert.rejects(
    saveProjectDraft(
      other.id,
      { area: "Kampagnen", title: "Fremd", payload, revision: 1 },
      saved.id,
    ),
  );
  const result = await Promise.allSettled(
    ["A", "B"].map((title) =>
      saveProjectDraft(
        actor,
        { area: "Kampagnen", title, payload, revision: 1 },
        saved.id,
      ),
    ),
  );
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const final = await projectDrafts(actor, "Kampagnen", saved.id);
  assert.ok(!Array.isArray(final));
  assert.equal(final.revision, 2);
  await assert.rejects(
    saveProjectDraft(actor, { area: "invalid", title: "X", payload }),
  );
  await assert.rejects(
    saveProjectDraft(actor, {
      area: "Website",
      title: "X",
      payload: { text: "x".repeat(1000001) },
    }),
  );
  assert.equal(await db.studioJob.count(), 0, "Saving cannot enqueue GPT jobs");
});
