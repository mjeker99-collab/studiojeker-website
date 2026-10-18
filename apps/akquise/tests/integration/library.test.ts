import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur isolierte lokale Testdatenbank erlaubt.");
const schema = "library_test_" + randomBytes(6).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { storeAsset, readAsset } = await import("../../lib/studio/assets");
const { libraryState, saveLibraryItem, saveBrand, archiveItem } =
  await import("../../lib/library/service");
const { createSeries, studioState, queueJob, runJob } =
  await import("../../lib/studio/service");
const { contentInput } = await import("../../lib/hub/input");
const { saveContent, reviewContent } = await import("../../lib/hub/workflow");
const { renderLayout, exportContent } = await import("../../lib/studio/render");
const files = new Map<string, Buffer>();
let puts = 0;
const store = {
  async put(k: string, b: Buffer) {
    puts++;
    files.set(k, b);
  },
  async get(k: string) {
    const b = files.get(k);
    if (!b) throw new Error("Nicht gefunden");
    return b;
  },
  async remove(k: string) {
    files.delete(k);
  },
};
let martin: string, nora: string;
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
  martin = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: "synthetic",
      },
    })
  ).id;
  nora = (
    await db.user.create({
      data: {
        name: "Nora Jeker",
        email: "nora@example.test",
        passwordHash: "synthetic",
      },
    })
  ).id;
});
after(async () => {
  await db.$disconnect();
  const c = new PrismaClient({ datasourceUrl: url.toString() });
  await c.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await c.$disconnect();
});
const item = (kind = "TEXT") => ({
  kind,
  title: "SYNTHETISCH Testtext",
  description: "Testbeschreibung",
  source: "Synthetische Quelle",
  rights: "Interner Test",
  tags: ["Test"],
  campaignId: null,
  text: kind === "TEXT" ? "Geprüfter synthetischer Beispieltext" : "",
  url: kind === "TEXT" ? "" : "https://vimeo.com/12345",
  thumbnailAssetId: null,
});
test("Drive OAuth binds browser and live session, rejects replay and isolates connections", async () => {
  const { beginDrive, completeDrive, stateHash, driveStatus, disconnectDrive } =
    await import("../../lib/drive/service");
  const names = [
    "DRIVE_CLIENT_ID",
    "DRIVE_CLIENT_SECRET",
    "DRIVE_TOKEN_ENCRYPTION_KEY",
  ] as const;
  const previous = names.map((name) => process.env[name]);
  process.env.DRIVE_CLIENT_ID = "synthetic-client";
  process.env.DRIVE_CLIENT_SECRET = "synthetic-secret";
  process.env.DRIVE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const session = await db.session.create({
      data: {
        id: randomUUID(),
        userId: martin,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const auth = await beginDrive(martin, session.id);
    assert.equal(
      new URL(auth.url).searchParams.get("code_challenge_method"),
      "S256",
    );
    await assert.rejects(
      completeDrive(auth.state, "wrong-browser", null, true),
    );
    assert.ok(
      await db.driveOAuthState.findUnique({
        where: { id: stateHash(auth.state) },
      }),
    );
    await assert.rejects(
      completeDrive(auth.state, auth.state, null, true),
      /nicht freigegeben/,
    );
    await assert.rejects(
      completeDrive(auth.state, auth.state, null, true),
      /abgelaufen/,
    );
    const expired = await beginDrive(martin, session.id);
    await db.session.delete({ where: { id: session.id } });
    await assert.rejects(
      completeDrive(expired.state, expired.state, null, true),
      /Sitzung/,
    );
    await db.driveConnection.create({
      data: {
        userId: martin,
        email: "synthetic@example.test",
        encryptedToken: "never-expose-this",
      },
    });
    assert.ok(
      !JSON.stringify(await driveStatus(martin)).includes("never-expose"),
    );
    assert.equal((await driveStatus(nora)).connection, null);
    await disconnectDrive(martin);
    assert.equal(
      await db.driveOAuthState.count({ where: { userId: martin } }),
      0,
    );
    assert.equal((await driveStatus(martin)).connection, null);
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
test("Chat persists turns, isolates series and enforces single execution", async () => {
  const oldKey = process.env.OPENAI_API_KEY,
    oldFlag = process.env.CONTENT_AI_ENABLED;
  process.env.OPENAI_API_KEY = "synthetic-only";
  process.env.CONTENT_AI_ENABLED = "true";
  try {
    const s = await createSeries(martin, {
      title: "SYNTHETISCH Chat",
      topic: "Test",
      offer: "",
      goal: "Testziel",
      audience: "Testpublikum",
      tone: "Deutsch",
      channels: ["INSTAGRAM"],
      count: 1,
      formats: ["4:5"],
      campaignId: null,
      referenceAssetIds: [],
    });
    const request = {
      seriesId: s.id,
      kind: "CHAT",
      message: "Eine Headline",
      contentId: null,
      requestKey: randomUUID(),
      referenceIds: [],
      referenceRights: true,
      referenceTransfer: true,
      confirmedCosts: true,
    };
    await assert.rejects(queueJob("missing", request), /Berechtigung/);
    const j = await queueJob(martin, request);
    assert.equal((await queueJob(martin, request)).id, j.id);
    let calls = 0;
    const provider = {
      async text() {
        throw new Error("Unexpected text generation");
      },
      async image() {
        throw new Error("Unexpected image generation");
      },
      async chat(
        _context: unknown,
        messages: { role: string; content: string }[],
      ) {
        calls++;
        assert.equal(
          messages.at(-1)?.content,
          calls === 1 ? "Eine Headline" : "Kürzer",
        );
        assert.equal(messages.length, calls === 1 ? 1 : 3);
        return {
          reply: "Synthetische Antwort",
          usage: {},
          requestId: "synthetic",
        };
      },
    };
    await runJob(martin, j.id, provider);
    await assert.rejects(runJob(martin, j.id, provider), /bereits gestartet/);
    const second = await queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
      message: "Kürzer",
    });
    await runJob(martin, second.id, provider);
    assert.equal(calls, 2);
    const savedLocal = process.env.STUDIO_LOCAL_ASSETS;
    process.env.STUDIO_LOCAL_ASSETS = "true";
    try {
      const bytes = await sharp({
        create: { width: 12, height: 12, channels: 3, background: "cyan" },
      })
        .png()
        .toBuffer();
      const asset = await storeAsset(
        martin,
        bytes,
        "chat-reference.png",
        "ORIGINAL",
        undefined,
        store,
      );
      const imageRequest = {
        ...request,
        requestKey: randomUUID(),
        referenceIds: [asset.id],
      };
      await assert.rejects(
        queueJob(martin, { ...imageRequest, referenceTransfer: false }),
        /ausdrücklich bestätigen/,
      );
      await assert.rejects(
        queueJob(martin, { ...imageRequest, referenceIds: [randomUUID()] }),
        /nicht zugänglich/,
      );
      await assert.rejects(
        queueJob(martin, {
          ...imageRequest,
          referenceIds: [asset.id, asset.id],
        }),
        /Referenzen/,
      );
      const imageJob = await queueJob(martin, imageRequest);
      await runJob(
        martin,
        imageJob.id,
        {
          ...provider,
          async chat(_c, _m, _model, refs) {
            assert.equal(refs?.length, 1);
            assert.deepEqual(refs![0].bytes, bytes);
            return {
              reply: "Bild analysiert",
              usage: {},
              requestId: "synthetic-image",
            };
          },
        },
        store,
      );
      const entry = await db.libraryItem.findUniqueOrThrow({
        where: { assetId: asset.id },
      });
      await archiveItem(martin, {
        id: entry.id,
        revision: entry.revision,
        archived: true,
      });
      await assert.rejects(
        queueJob(martin, { ...imageRequest, requestKey: randomUUID() }),
        /nicht zugänglich/,
      );
    } finally {
      if (savedLocal === undefined) delete process.env.STUDIO_LOCAL_ASSETS;
      else process.env.STUDIO_LOCAL_ASSETS = savedLocal;
    }
    const state = await studioState(nora);
    assert.equal(
      state.jobs.filter((j) => j.seriesId === s.id && j.status === "SUCCEEDED")
        .length,
      3,
    );
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldFlag === undefined) delete process.env.CONTENT_AI_ENABLED;
    else process.env.CONTENT_AI_ENABLED = oldFlag;
  }
});
test("Text/Links ohne Speicher, Rechte, Persistenz und konkurrierende Änderungen", async () => {
  await assert.rejects(libraryState("missing"), /Berechtigung/);
  const previousIds = new Set((await libraryState(nora)).items.map((i) => i.id));
  const saved = await saveLibraryItem(martin, item());
  const video = await saveLibraryItem(nora, item("VIDEO"));
  const state = await libraryState(nora);
  assert.deepEqual(
    new Set(state.items.filter((i) => !previousIds.has(i.id)).map((i) => i.id)),
    new Set([saved.id, video.id]),
  );
  assert.equal(state.items.find((i) => i.id === saved.id)?.text, item().text);
  await assert.rejects(
    saveLibraryItem(martin, { ...item("LINK"), url: "javascript:alert(1)" }),
  );
  await assert.rejects(
    saveLibraryItem(martin, { ...item(), id: saved.id, revision: 99 }),
    /geändert/,
  );
});
test("Bildprüfung, SHA-Dublette auch parallel, Dokumente, geschützter Zugriff und Archiv", async () => {
  const previousPuts = puts;
  const b = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#124655" },
  })
    .png()
    .toBuffer();
  const [a, duplicate] = await Promise.all([
    storeAsset(martin, b, "SYNTHETISCH.png", "ORIGINAL", undefined, store),
    storeAsset(nora, b, "SYNTHETISCH-Kopie.png", "ORIGINAL", undefined, store),
  ]);
  assert.equal(a.id, duplicate.id);
  assert.equal(puts - previousPuts, 1);
  assert.notEqual(a.reused, duplicate.reused);
  await assert.rejects(readAsset("missing", a.id, store), /Berechtigung/);
  assert.deepEqual((await readAsset(nora, a.id, store)).bytes, b);
  await assert.rejects(
    storeAsset(
      martin,
      Buffer.from("<svg>bad</svg>"),
      "fake.png",
      "ORIGINAL",
      undefined,
      store,
    ),
    /Ungültiges Bild/,
  );
  await assert.rejects(
    storeAsset(
      martin,
      Buffer.from([0xff, 0]),
      "bad.txt",
      "DOCUMENT",
      undefined,
      store,
    ),
    /UTF-8/,
  );
  const txt = await storeAsset(
    martin,
    Buffer.from("SYNTHETISCH Dokumenttext"),
    "test.txt",
    "DOCUMENT",
    undefined,
    store,
  );
  const state = await libraryState(martin);
  assert.equal(
    state.items.find((i) => i.assetId === txt.id)?.text,
    "SYNTHETISCH Dokumenttext",
  );
  const row = state.items.find((i) => i.assetId === a.id)!;
  await archiveItem(nora, {
    id: row.id,
    revision: row.revision,
    archived: true,
  });
  assert.deepEqual((await readAsset(nora, a.id, store)).bytes, b);
  assert.ok(!(await studioState(martin)).assets.some((x) => x.id === a.id));
  await archiveItem(martin, {
    id: row.id,
    revision: row.revision + 1,
    archived: false,
  });
});
test("Ein Bild in zwei Beiträgen; Freigabe und Exporte bleiben nach Profiländerung unverändert", async () => {
  const asset = await db.studioAsset.findFirstOrThrow({
    where: { kind: "ORIGINAL" },
  });
  const series = await createSeries(martin, {
    title: "SYNTHETISCH Bibliothek",
    topic: "Testmotiv",
    offer: "",
    goal: "Interner Test",
    audience: "Testpersonen",
    tone: "Sachlich",
    channels: ["LINKEDIN"],
    count: 2,
    formats: ["1:1"],
    campaignId: null,
    referenceAssetIds: [],
    brandRules: ["tone"],
    libraryReferenceIds: [],
  });
  const contents = await db.marketingContent.findMany({
    where: { studioSeriesId: series.id },
    include: { versions: true },
  });
  for (const c of contents) {
    const payload = contentInput.parse(c.versions[0].payload);
    payload.studio = {
      ...payload.studio!,
      motifAssetId: asset.id,
      motifSha256: asset.sha256,
      showLogo: false,
      showHeadline: false,
      showClaim: false,
    };
    await saveContent(martin, payload, c.id, 1);
    await reviewContent(nora, c.id, 2, "APPROVED", true);
  }
  const c = contents[0];
  const old = await db.marketingVersion.findUniqueOrThrow({
    where: { contentId_version: { contentId: c.id, version: 2 } },
  });
  const snapshot = contentInput.parse(old.payload).studio!;
  const before = await renderLayout(martin, snapshot, "1:1", "png", store);
  const state = await libraryState(nora);
  await saveBrand(nora, {
    ...state.brand,
    claim: "SYNTHETISCH neuer Claim",
    tone: "SYNTHETISCH neue Tonalität",
    colors: { ...state.brand.colors, cyan: "#ff0000" },
    revision: state.brandRevision,
  });
  const unchanged = await db.marketingVersion.findUniqueOrThrow({
    where: { id: old.id },
  });
  assert.deepEqual(unchanged.payload, old.payload);
  assert.equal(
    (await db.marketingContent.findUniqueOrThrow({ where: { id: c.id } }))
      .status,
    "APPROVED",
  );
  assert.deepEqual(
    await renderLayout(nora, snapshot, "1:1", "png", store),
    before,
  );
  const ex = await exportContent(martin, c.id, 2, "1:1", "png", false, store);
  const exported = (await libraryState(nora)).items.find(
    (i) => i.assetId === ex.assetId,
  )!;
  assert.equal(exported.parentAssetId, asset.id);
  assert.equal(
    (await libraryState(nora)).items
      .find((i) => i.assetId === asset.id)!
      .usage.filter((u) => u.version === 2).length,
    2,
  );
  const p = contentInput.parse(old.payload);
  p.studio!.headline = "SYNTHETISCH geändert";
  await saveContent(martin, p, c.id, 2);
  assert.equal(
    (await db.marketingContent.findUniqueOrThrow({ where: { id: c.id } }))
      .status,
    "DRAFT",
  );
  assert.equal(
    (
      await db.marketingApproval.findFirstOrThrow({
        where: { contentId: c.id, status: "INVALIDATED" },
      })
    ).version,
    2,
  );
});
test("KI bekommt nur ausgewählte Markenregeln und Referenzen; ohne Zugang manuell nutzbar", async () => {
  const a = await saveLibraryItem(martin, {
    ...item(),
    title: "Ausgewählt",
    text: "NUR DIESER TEXT",
  });
  await saveLibraryItem(martin, {
    ...item(),
    title: "Privat",
    text: "NICHT ÜBERTRAGEN",
  });
  const s = await createSeries(martin, {
    title: "SYNTHETISCH KI-Auswahl",
    topic: "Test",
    offer: "",
    goal: "Test",
    audience: "Test",
    tone: "Sachlich",
    channels: ["LINKEDIN"],
    count: 1,
    formats: ["1:1"],
    campaignId: null,
    referenceAssetIds: [],
    libraryReferenceIds: [a.id],
    brandRules: ["tone"],
  });
  process.env.CONTENT_AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "test-adapter-not-live";
  const request = {
    seriesId: s.id,
    kind: "TEXT",
    contentId: null,
    requestKey: randomUUID(),
    referenceIds: [],
    referenceRights: true,
    referenceTransfer: true,
    confirmedCosts: true,
  };
  const job = await queueJob(martin, request);
  let context: unknown;
  await runJob(
    martin,
    job.id,
    {
      async text(_brief, _model, c) {
        context = c;
        return {
          posts: [
            {
              imageIdea: "Test",
              headline: "Test",
              hashtags: "",
              variants: [{ channel: "LINKEDIN", text: "SYNTHETISCH", cta: "" }],
            },
          ],
          usage: { testAdapter: true },
          requestId: "synthetic",
        };
      },
      async image() {
        throw new Error("Nicht aufrufen");
      },
    },
    store,
  );
  assert.ok(JSON.stringify(context).includes("NUR DIESER TEXT"));
  assert.ok(!JSON.stringify(context).includes("NICHT ÜBERTRAGEN"));
  assert.deepEqual(Object.keys((context as { rules: object }).rules), ["tone"]);
  await assert.rejects(runJob(nora, job.id), /bereits/);
  process.env.CONTENT_AI_ENABLED = "false";
  process.env.OPENAI_API_KEY = "";
  await assert.rejects(
    queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
    }),
    /Nicht verbunden/,
  );
});
test("Kampagnenzuordnung, fremde Markenassets und beschädigte Dateien werden sicher behandelt", async () => {
  const { saveCampaign } = await import("../../lib/hub/workflow");
  const campaign = await saveCampaign(martin, {
    title: "SYNTHETISCH Bibliothekskampagne",
    goal: "Test",
    audience: "Test",
    startsAt: "2026-10-01T00:00:00Z",
    endsAt: "2026-10-31T00:00:00Z",
    ownerId: martin,
  });
  const entry = await saveLibraryItem(martin, {
    ...item(),
    campaignId: campaign.id,
  });
  assert.equal(
    (await libraryState(nora)).items.find((i) => i.id === entry.id)?.campaignId,
    campaign.id,
  );
  await assert.rejects(
    saveLibraryItem(martin, { ...item(), campaignId: "fremd" }),
    /nicht zugänglich/,
  );
  const state = await libraryState(martin);
  await assert.rejects(
    saveBrand(martin, {
      ...state.brand,
      revision: state.brandRevision,
      logoAssetId: "fremd",
    }),
    /nicht zugänglich/,
  );
  const a = await db.studioAsset.findFirstOrThrow({
    where: { kind: "ORIGINAL" },
  });
  const bytes = files.get(a.objectKey)!;
  files.set(a.objectKey, Buffer.from("SYNTHETISCH beschädigt"));
  await assert.rejects(readAsset(martin, a.id, store), /Prüfsumme/);
  files.set(a.objectKey, bytes);
  await assert.rejects(
    storeAsset(
      martin,
      Buffer.from("%PDF-1.7\nnot-a-pdf\n%%EOF"),
      "bad.pdf",
      "DOCUMENT",
      undefined,
      store,
    ),
    /Nur PDF/,
  );
  const oldLocal = process.env.STUDIO_LOCAL_ASSETS;
  process.env.STUDIO_LOCAL_ASSETS = "false";
  const { objectStore } = await import("../../lib/studio/storage");
  assert.throws(() => objectStore(), /Nicht verbunden/);
  if (oldLocal === undefined) delete process.env.STUDIO_LOCAL_ASSETS;
  else process.env.STUDIO_LOCAL_ASSETS = oldLocal;
});
