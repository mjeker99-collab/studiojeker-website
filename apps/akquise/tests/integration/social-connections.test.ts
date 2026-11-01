import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createCipheriv } from "node:crypto";
import { execFileSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale Testdatenbank.");
const schema = "social_connection_test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
process.env.LINKEDIN_CLIENT_ID = "synthetic-client";
process.env.LINKEDIN_CLIENT_SECRET = "synthetic-secret";
const {
  linkedinOrganizations,
  chooseLinkedInOrganization,
  status,
  disconnect,
} = await import("../../lib/social/service");
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

test("organization selection checks ownership, roles, token binding and stale disconnects", async (t) => {
  const orgId = "urn:li:organization:77";
  let approved = true;
  let calls = 0;
  let removeDuringLookup = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      calls++;
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer synthetic-access-token",
      );
      const address = new URL(String(input));
      assert.equal(address.hostname, "api.linkedin.com");
      if (address.pathname.endsWith("organizationAcls"))
        return Response.json({
          elements: [
            {
              state: approved ? "APPROVED" : "REVOKED",
              role: "ADMINISTRATOR",
              organizationTarget: orgId,
            },
          ],
        });
      assert.equal(address.pathname, "/rest/organizationsLookup");
      if (removeDuringLookup) {
        removeDuringLookup = false;
        await disconnect(actor, "LINKEDIN", "member-stale");
      }
      return Response.json({
        results: {
          "77": {
            id: 77,
            vanityName: "studiojeker",
            localizedName: "Studiojeker",
          },
        },
      });
    },
  );
  async function connection(
    accountId: string,
    expiresAt = new Date(Date.now() + 3600000),
  ) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY!, "hex"),
      iv,
    );
    cipher.setAAD(Buffer.from(`LINKEDIN:${accountId}`));
    const encrypted = Buffer.concat([
      cipher.update("synthetic-access-token"),
      cipher.final(),
    ]);
    return db.socialConnection.create({
      data: {
        provider: "LINKEDIN",
        accountId,
        accountName: "Personal member",
        ownerId: actor,
        expiresAt,
        encryptedToken: [iv, cipher.getAuthTag(), encrypted]
          .map((b) => b.toString("base64url"))
          .join("."),
      },
    });
  }
  const member = await connection("member-1");
  const other = await db.user.create({
    data: {
      name: "Nora Jeker",
      email: "nora@example.test",
      passwordHash: "not-used",
    },
  });
  await assert.rejects(
    linkedinOrganizations(other.id, "member-1"),
    /deinem LinkedIn-Konto/,
  );
  assert.equal(calls, 0);
  const before = await status(actor);
  assert.equal(before.connections[0].needsOrganization, true);
  assert.equal(JSON.stringify(before).includes(member.encryptedToken), false);
  assert.equal(
    (await linkedinOrganizations(actor, "member-1")).organizations[0].accountId,
    orgId,
  );
  approved = false;
  await assert.rejects(
    chooseLinkedInOrganization(actor, "member-1", orgId),
    /bestätigtem Seitenrecht/,
  );
  assert.equal(
    await db.socialConnection.count({ where: { accountId: orgId } }),
    0,
  );
  approved = true;
  await assert.rejects(
    chooseLinkedInOrganization(actor, "member-1", "urn:li:organization:88"),
    /bestätigtem Seitenrecht/,
  );
  await chooseLinkedInOrganization(actor, "member-1", orgId);
  assert.equal(
    await db.socialConnection.count({ where: { accountId: "member-1" } }),
    0,
  );
  assert.equal((await status(actor)).connections[0].needsOrganization, false);
  // A subsequent provider request proves the saved token decrypts under its new organization AAD.
  assert.equal(
    (await linkedinOrganizations(actor, orgId)).organizations[0].accountId,
    orgId,
  );
  const stored = await db.socialConnection.findFirstOrThrow({
    where: { accountId: orgId },
  });
  assert.notEqual(stored.encryptedToken, member.encryptedToken);
  assert.equal(stored.ownerId, actor);
  const audits = await db.audit.findMany({
    where: { action: "SOCIAL_ORGANIZATION_CONNECTED" },
  });
  assert.equal(audits.length, 1);
  assert.equal(
    JSON.stringify(audits).includes("synthetic-access-token"),
    false,
  );
  await connection("member-stale");
  removeDuringLookup = true;
  await assert.rejects(
    chooseLinkedInOrganization(actor, "member-stale", orgId),
    /Verbindung wurde geändert/,
  );
  await connection("member-expired", new Date(0));
  const previousCalls = calls;
  await assert.rejects(
    linkedinOrganizations(actor, "member-expired"),
    /abgelaufen/,
  );
  assert.equal(calls, previousCalls);
});
