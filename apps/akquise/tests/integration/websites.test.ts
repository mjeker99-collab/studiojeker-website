import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Local test DB only");
const schema = "websites_test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { websiteMutation, websiteState, websiteVersion, assistWebsite } =
  await import("../../lib/websites/service");
const { blankWebsite, blankSection, blankPage } =
  await import("../../lib/websites/input");
const { publicWebsite } = await import("../../lib/websites/publication");
const { ProviderFailure } = await import("../../lib/studio/provider");
let actor: string;
before(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, NODE_TEST_CONTEXT: undefined }, stdio: "pipe" },
  );
  actor = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: "synthetic-unused",
      },
    })
  ).id;
  await db.studioOrganization.upsert({
    where: { id: "studiojeker" },
    create: { id: "studiojeker", name: "Studiojeker", brand: {} },
    update: {},
  });
  process.env.CONTENT_AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "synthetic-never-sent";
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "100";
  process.env.CONTENT_DAILY_BUDGET_USD = "100";
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});
async function create() {
  const p = await websiteMutation(actor, ["websites"], {
    customerId: null,
    document: blankWebsite,
  });
  assert.ok("id" in p);
  return p.id;
}
test("Public snapshots exclude drafts, restrict media, enforce revisions and revoke immediately", async () => {
  const id = await create();
  const bytes = Buffer.from("synthetic-public-image");
  const asset = await db.studioAsset.create({
    data: {
      organizationId: "studiojeker",
      name: "test.png",
      mime: "image/png",
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      objectKey: `studiojeker/${randomUUID()}`,
      userId: actor,
      kind: "ORIGINAL",
    },
  });
  const doc = {
    ...blankWebsite,
    briefing: "PRIVATE BRIEFING",
    pages: [
      {
        ...blankPage,
        headline: "Published heading",
        sections: [
          { ...blankSection, imageAssetId: asset.id, imageAlt: "Testbild" },
        ],
      },
    ],
  };
  await websiteMutation(actor, ["websites", id], { version: 1, document: doc });
  const input = {
    version: 2,
    revision: 0,
    slug: "synthetic-test",
    confirmedPublic: true,
  };
  await assert.rejects(publicWebsite(input.slug, ["index.html"]));
  await assert.rejects(
    websiteMutation(actor, ["websites", id, "publish"], {
      ...input,
      confirmedPublic: false,
    }),
  );
  await websiteMutation(actor, ["websites", id, "publish"], input);
  const first = await publicWebsite(input.slug, ["index.html"]);
  assert.match(String(first.body), /Published heading/);
  assert.ok(!String(first.body).includes("PRIVATE BRIEFING"));
  await assert.rejects(publicWebsite(input.slug, ["studioone.json"]));
  await assert.rejects(
    publicWebsite(input.slug, ["media", "unrelated-private-image"]),
  );
  const store = {
    get: async (key: string) => {
      assert.equal(key, asset.objectKey);
      return bytes;
    },
    put: async () => {},
    remove: async () => {},
  };
  assert.deepEqual(
    (await publicWebsite(input.slug, ["media", asset.id], store)).body,
    new Uint8Array(bytes),
  );
  await assert.rejects(
    publicWebsite(input.slug, ["media", asset.id], {
      ...store,
      get: async () => Buffer.from("changed"),
    }),
  );
  const draft = {
    ...doc,
    pages: [{ ...doc.pages[0], headline: "PRIVATE DRAFT" }],
  };
  await websiteMutation(actor, ["websites", id], {
    version: 2,
    document: draft,
  });
  assert.ok(
    !String((await publicWebsite(input.slug, ["index.html"])).body).includes(
      "PRIVATE DRAFT",
    ),
  );
  await assert.rejects(
    websiteMutation(actor, ["websites", id, "publish"], input),
  );
  const other = await create();
  await assert.rejects(
    websiteMutation(actor, ["websites", other, "publish"], {
      ...input,
      version: 1,
    }),
  );
  await assert.rejects(
    websiteMutation("unknown-user", ["websites", id, "publish"], {
      ...input,
      version: 3,
      revision: 1,
    }),
  );
  await websiteMutation(actor, ["websites", id, "publish"], {
    ...input,
    version: 3,
    revision: 1,
  });
  assert.match(
    String((await publicWebsite(input.slug, ["index.html"])).body),
    /PRIVATE DRAFT/,
  );
  await websiteMutation(actor, ["websites", id, "unpublish"], {
    version: 3,
    revision: 2,
  });
  await assert.rejects(publicWebsite(input.slug, ["index.html"]));
  await assert.rejects(publicWebsite(input.slug, ["media", asset.id], store));
});
test("Website persistence, concurrent edits, restoration and access boundaries", async () => {
  const id = await create();
  assert.equal(
    (await websiteState(actor, id)).document.name,
    blankWebsite.name,
  );
  const saves = await Promise.allSettled(
    ["A", "B"].map((name) =>
      websiteMutation(actor, ["websites", id], {
        version: 1,
        document: { ...blankWebsite, name },
      }),
    ),
  );
  assert.equal(saves.filter((v) => v.status === "fulfilled").length, 1);
  await websiteMutation(actor, ["websites", id, "restore"], {
    version: 2,
    restoreVersion: 1,
  });
  assert.equal((await websiteState(actor, id)).version, 3);
  assert.equal((await websiteState(actor, id)).versions.length, 3);
  assert.equal((await websiteVersion(actor, id, 1)).name, blankWebsite.name);
  await assert.rejects(websiteState("missing-user", id));
  await db.websiteProject.update({
    where: { id },
    data: { organizationId: "other" },
  });
  await assert.rejects(websiteState(actor, id));
  await assert.rejects(websiteVersion(actor, id, 1));
  await assert.rejects(
    websiteMutation(actor, ["websites"], {
      customerId: "missing",
      document: blankWebsite,
    }),
  );
});
test("AI proposals persist independently, apply once, isolate projects and prevent stale overwrites", async () => {
  const id = await create(),
    other = await create();
  let calls = 0;
  const input = {
    version: 1,
    message: "Erstelle meine Website",
    requestKey: randomUUID(),
    confirmedCosts: true,
    confirmedTransfer: true,
  };
  const provider = async () => {
    calls++;
    return {
      result: {
        reply: "Vorschlag",
        document: { ...blankWebsite, name: "GPT Vorschlag" },
      },
      usage: {},
      requestId: "synthetic",
    };
  };
  const response = await assistWebsite(actor, id, input, provider);
  await assistWebsite(actor, id, input, provider);
  assert.equal(calls, 1);
  assert.equal(
    (await websiteState(actor, id)).document.name,
    blankWebsite.name,
  );
  assert.equal((await websiteState(actor, id)).jobs.length, 1);
  await assert.rejects(
    websiteMutation(actor, ["websites", other, "apply"], {
      version: 1,
      jobId: response.jobId,
    }),
  );
  await websiteMutation(actor, ["websites", id, "apply"], {
    version: 1,
    jobId: response.jobId,
  });
  assert.equal((await websiteState(actor, id)).document.name, "GPT Vorschlag");
  await assert.rejects(
    websiteMutation(actor, ["websites", id, "apply"], {
      version: 2,
      jobId: response.jobId,
    }),
  );
  await assert.rejects(
    assistWebsite(
      actor,
      id,
      { ...input, message: "anderer Auftrag" },
      provider,
    ),
  );
  await assert.rejects(
    assistWebsite(actor, id, { ...input, requestKey: randomUUID() }, provider),
  );
  assert.equal(calls, 1);
});
test("Failures persist; retries, missing consent and limits fail before provider", async () => {
  const id = await create();
  let calls = 0;
  const input = {
    version: 1,
    message: "Erstellen",
    requestKey: randomUUID(),
    confirmedCosts: true,
    confirmedTransfer: true,
  };
  const fail = async () => {
    calls++;
    throw new ProviderFailure(true, "Test: Verbindung unterbrochen");
  };
  await assert.rejects(
    assistWebsite(actor, id, { ...input, confirmedTransfer: false }, fail),
  );
  assert.equal(calls, 0);
  await assert.rejects(assistWebsite(actor, id, input, fail));
  assert.equal(calls, 1);
  assert.equal((await websiteState(actor, id)).jobs[0].status, "UNKNOWN");
  await assert.rejects(assistWebsite(actor, id, input, fail));
  assert.equal(calls, 1);
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "1";
  await assert.rejects(
    assistWebsite(actor, id, { ...input, requestKey: randomUUID() }, fail),
  );
  assert.equal(calls, 1);
  process.env.CONTENT_DAILY_REQUEST_LIMIT = "100";
  process.env.CONTENT_AI_ENABLED = "false";
  await assert.rejects(
    assistWebsite(actor, id, { ...input, requestKey: randomUUID() }, fail),
  );
  assert.equal(calls, 1);
});
