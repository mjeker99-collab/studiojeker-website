import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "customer_import_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { customerMasterlist, importCustomers, saveCustomer } =
  await import("../../lib/customers");
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
        passwordHash: "unused",
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
test("master import is scoped, repeatable, concurrent-safe and preserves existing profiles and contacts", async () => {
  await assert.rejects(customerMasterlist("missing"), /Berechtigung/);
  await assert.rejects(
    importCustomers("missing", { contactIds: ["missing"] }),
    /Berechtigung/,
  );
  const existing = await saveCustomer(actor, {
    name: "Existing AG",
    website: "",
    contactName: "Original",
    contactEmail: "",
    notes: "Keep me",
    status: "ACTIVE",
    knowledge: { offers: "Manual knowledge" },
  });
  const add = (
    organisation: string,
    key: string,
    organizationId = "studiojeker",
  ) =>
    db.contact.create({
      data: {
        organizationId,
        organisation,
        firstName: "Anna",
        lastName: "Muster",
        email: "anna@example.test",
        website: "http://example.test",
        notes: "Master notes",
        personKey: key,
      },
    });
  const a = await add("New AG", "a");
  const b = await add(" new  ag ", "b");
  const c = await add("existing ag", "c");
  await db.studioOrganization.create({ data: { id: "other", name: "Other", brand: {} } });
  const foreign = await add("Foreign AG", "foreign", "other");
  const beforeContacts = await db.contact.findMany({ orderBy: { id: "asc" } });
  const candidates = await customerMasterlist(actor);
  assert.equal(candidates.length, 3);
  assert.equal(candidates.find((row) => row.id === c.id)?.existing, true);
  await assert.rejects(
    importCustomers(actor, { contactIds: [a.id, foreign.id] }),
    /Auswahl/,
  );
  assert.equal(await db.customer.count(), 1);
  const results = await Promise.all([
    importCustomers(actor, { contactIds: [a.id, b.id, c.id] }),
    importCustomers(actor, { contactIds: [a.id, b.id, c.id] }),
  ]);
  assert.equal(
    results.reduce((sum, r) => sum + r.created, 0),
    1,
  );
  assert.equal(
    results.reduce((sum, r) => sum + r.skipped, 0),
    5,
  );
  assert.equal(await db.customer.count(), 2);
  assert.deepEqual(
    await db.customer.findUnique({ where: { id: existing.id } }),
    existing,
  );
  const imported = await db.customer.findFirstOrThrow({
    where: { name: "New AG" },
  });
  assert.equal(imported.contactName, "Anna Muster");
  assert.equal(imported.contactEmail, "anna@example.test");
  assert.equal(imported.website, "https://example.test/");
  assert.equal(imported.notes, "Master notes");
  assert.deepEqual(
    await db.contact.findMany({ orderBy: { id: "asc" } }),
    beforeContacts,
  );
  assert.equal(await db.draft.count(), 0);
  assert.ok((await customerMasterlist(actor)).every((c) => c.existing));
  assert.equal(
    await db.audit.count({ where: { action: "CUSTOMERS_IMPORTED" } }),
    2,
  );
});
