import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { cmsTemplates } from "../../lib/cms/input";
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank erlaubt.");
const schema = "cms_test_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { importSanityNewsletter } = await import("../../lib/cms/service");
const originalFetch = globalThis.fetch;
let actor: string;
const t = cmsTemplates[0];
let document = {
  _id: "synthetic",
  _rev: "rev1",
  _type: t.type,
  title: "SYNTHETISCH Sanity",
  subject: "Test",
  preheader: "Test",
  audience: "Interner Test",
  ...Object.fromEntries(t.fields.map((f) => [f.name, f.value])),
};
before(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      timeout: 20000,
      stdio: "pipe",
    },
  );
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: "synthetic",
      },
    })
  ).id;
  globalThis.fetch = async () => Response.json({ result: document });
});
after(async () => {
  globalThis.fetch = originalFetch;
  await db.$disconnect();
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await client.$disconnect();
});
test("Sanity imports are authorised, revision-bound, idempotent drafts", async () => {
  await assert.rejects(
    importSanityNewsletter("unknown", { id: "synthetic", revision: "rev1" }),
  );
  await assert.rejects(
    importSanityNewsletter(actor, { id: "synthetic", revision: "stale" }),
  );
  assert.equal(await db.marketingContent.count(), 0);
  const results = await Promise.all(
    [1, 2].map(() =>
      importSanityNewsletter(actor, { id: "synthetic", revision: "rev1" }),
    ),
  );
  assert.equal(results.filter((r) => r.imported).length, 1);
  assert.equal(await db.marketingContent.count(), 1);
  assert.equal((await db.marketingContent.findFirstOrThrow()).status, "DRAFT");
  document = { ...document, _rev: "rev2", title: "Geändert" };
  await importSanityNewsletter(actor, { id: "synthetic", revision: "rev2" });
  assert.equal(await db.marketingContent.count(), 2);
  assert.equal(await db.marketingApproval.count(), 0);
  assert.equal(await db.mailchimpTransfer.count(), 0);
  assert.equal(
    await db.audit.count({ where: { action: "SANITY_NEWSLETTER_IMPORTED" } }),
    2,
  );
  await db.user.update({ where: { id: actor }, data: { active: false } });
  await assert.rejects(
    importSanityNewsletter(actor, { id: "synthetic", revision: "rev2" }),
  );
});
