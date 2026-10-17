import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
// Use an isolated PostgreSQL schema. Never truncate an application database.
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Integrationstests nur gegen lokale PostgreSQL-Instanz.");
const schema = "test_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../lib/db");
const { hashPassword, login } = await import("../../lib/auth");
const {
  saveContact,
  newDraft,
  editDraft,
  reviewDraft,
  legalReview,
  suppress,
  simulate,
  importContacts,
} = await import("../../lib/workflow");
const { parseImport } = await import("../../lib/import");
const { execFileSync } = await import("node:child_process");
// Load all modules before registering hooks/tests: late top-level awaits can
// let the node:test runner finish a filtered suite and drop its schema early.
const { dispatchApproved } = await import("../../lib/delivery");
const hub = await import("../../lib/hub/workflow");
const { exportNewsletter } = await import("../../lib/hub/newsletter");
const studio = await import("../../lib/studio/service");
const studioAssets = await import("../../lib/studio/assets");
const studioRender = await import("../../lib/studio/render");
const { contentInput: studioContentInput } =
  await import("../../lib/hub/input");
const { ProviderFailure } = await import("../../lib/studio/provider");
const sharp = (await import("sharp")).default;
let martin: string, nora: string;
const input = (suffix: string) => ({
  organisation: "Synthetisch " + suffix,
  firstName: "Anna",
  lastName: "Muster " + suffix,
  email: `anna.${suffix}@example.test`,
  sourceUrl: "https://example.test/quelle",
  verifiedAt: "2026-01-01T00:00:00.000Z",
  confidence: "VERIFIED" as const,
  hook: "Dokumentierter synthetischer Bedarf an Projektbildern.",
  service: "Immobilienfotografie",
});
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
  martin = (
    await db.user.create({
      data: {
        name: "Martin Jeker",
        email: "martin@example.test",
        passwordHash: hashPassword("synthetisch-martin-123"),
      },
    })
  ).id;
  nora = (
    await db.user.create({
      data: {
        name: "Nora Jeker",
        email: "nora@example.test",
        passwordHash: hashPassword("synthetisch-nora-123"),
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
async function prepared(suffix: string) {
  const c = await saveContact(martin, input(suffix));
  const d = await newDraft(martin, c.id);
  await legalReview(
    nora,
    c.id,
    c.revision,
    true,
    "Explizite synthetische Einwilligung dokumentiert.",
    false,
  );
  await reviewDraft(nora, d.id, 1, "APPROVED", true);
  return { c, d };
}
test("Berechtigungen: unbekannte und deaktivierte Benutzer sind blockiert", async () => {
  await assert.rejects(
    saveContact("unbekannt", input("no-user")),
    /Berechtigung/,
  );
  await db.user.update({ where: { id: martin }, data: { active: false } });
  await assert.rejects(saveContact(martin, input("inactive")), /Berechtigung/);
  await db.user.update({ where: { id: martin }, data: { active: true } });
});
test("Individuelle Anmeldung und persistente Login-Sperre", async () => {
  const ok = await login("martin@example.test", "synthetisch-martin-123");
  assert.ok("token" in ok);
  assert.equal(await db.session.count({ where: { userId: martin } }), 1);
  for (let i = 0; i < 5; i++)
    assert.ok("error" in (await login("nora@example.test", "falsch")));
  const blocked = await login("nora@example.test", "synthetisch-nora-123");
  assert.match(blocked.error ?? "", /15 Minuten/);
});
test("Freigabe speichert Benutzer, Zeitpunkt, Kontakt, Version und Hash", async () => {
  const { c, d } = await prepared("approval");
  const a = await db.approval.findFirstOrThrow({
    where: { draftId: d.id, status: "APPROVED" },
  });
  assert.equal(a.userId, nora);
  assert.equal(a.contactId, c.id);
  assert.equal(a.version, 1);
  assert.equal(a.hash.length, 64);
  assert.ok(a.createdAt);
  await assert.rejects(
    reviewDraft(martin, d.id, 1, "APPROVED", false),
    /Lesen/,
  );
});
test("Text- und Betreffänderungen entwerten Freigaben; Versionskonflikte werden blockiert", async () => {
  const { d } = await prepared("edit");
  const v = await db.draftVersion.findFirstOrThrow({
    where: { draftId: d.id },
  });
  await editDraft(martin, d.id, 1, {
    recipient: v.recipient,
    subject: "Neuer Betreff",
    body: v.body + "\nNeuer Text.",
  });
  assert.equal(
    await db.approval.count({ where: { draftId: d.id, status: "APPROVED" } }),
    0,
  );
  assert.equal(await db.draftVersion.count({ where: { draftId: d.id } }), 2);
  await assert.rejects(simulate(nora, d.id, 1), /Veraltete/);
  await assert.rejects(editDraft(martin, d.id, 1, v), /geändert/);
});
test("Empfängeränderung invalidiert Freigabe und rechtliche Prüfung", async () => {
  const { c, d } = await prepared("recipient");
  await saveContact(
    martin,
    { ...input("recipient"), email: "neue.adresse@example.test" },
    c.id,
    c.revision,
  );
  assert.equal(
    await db.approval.count({ where: { draftId: d.id, status: "APPROVED" } }),
    0,
  );
  await assert.rejects(
    reviewDraft(nora, d.id, 1, "APPROVED", true),
    /Kontakt geändert/,
  );
});
test("Separate rechtliche Prüfung ist für Freigabe erforderlich", async () => {
  const c = await saveContact(martin, input("legal"));
  const d = await newDraft(martin, c.id);
  await assert.rejects(
    reviewDraft(nora, d.id, 1, "APPROVED", true),
    /rechtliche/,
  );
  await legalReview(
    nora,
    c.id,
    c.revision,
    false,
    "Keine dokumentierte Einwilligung für Test vorhanden.",
    false,
  );
  await assert.rejects(
    reviewDraft(nora, d.id, 1, "APPROVED", true),
    /rechtliche/,
  );
});
test("Öffentliche Auftraggeber brauchen beschaffungsrechtliche Einzelprüfung", async () => {
  const c = await saveContact(martin, {
    ...input("public"),
    publicAuthority: true,
  });
  await assert.rejects(
    legalReview(
      nora,
      c.id,
      c.revision,
      true,
      "Synthetische Rechtsgrundlage liegt vor.",
      false,
    ),
    /Beschaffungsrecht/,
  );
});
test("Zentrale Sperrliste verhindert Generierung, Freigabe und Simulation", async () => {
  const { c, d } = await prepared("suppressed");
  await suppress(nora, c.email, "Synthetischer Widerspruch");
  await assert.rejects(newDraft(martin, c.id), /Sperrliste/);
  await assert.rejects(
    reviewDraft(nora, d.id, 1, "APPROVED", true),
    /gesperrt/,
  );
  await assert.rejects(simulate(nora, d.id, 1), /gesperrt/);
  assert.equal(
    (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).status,
    "DO_NOT_CONTACT",
  );
});
test("Parallele und wiederholte Simulationen erzeugen exakt ein Protokoll", async () => {
  const { d } = await prepared("parallel");
  const results = await Promise.all([
    simulate(martin, d.id, 1),
    simulate(nora, d.id, 1),
  ]);
  assert.equal(results[0].delivery.id, results[1].delivery.id);
  assert.equal(results.filter((r) => r.reused).length, 1);
  assert.equal(await db.delivery.count({ where: { draftId: d.id } }), 1);
  assert.equal(results[0].delivery.status, "SIMULATED");
  assert.equal(await db.delivery.count({ where: { status: "SENT" } }), 0);
});
test("Neue Entwürfe an bereits simulierte Empfänger werden blockiert", async () => {
  const { c, d } = await prepared("duplicate-send");
  await simulate(martin, d.id, 1);
  const other = await newDraft(martin, c.id);
  await reviewDraft(nora, other.id, 1, "APPROVED", true);
  await assert.rejects(simulate(martin, other.id, 1), /Doppelversand/);
});
test("Tageslimit gilt auch bei lokalem Testmodus", async () => {
  const { d } = await prepared("daily");
  const previous = process.env.DAILY_SEND_LIMIT;
  process.env.DAILY_SEND_LIMIT = "1";
  try {
    await assert.rejects(simulate(martin, d.id, 1), /Tageslimit/);
  } finally {
    process.env.DAILY_SEND_LIMIT = previous ?? "20";
  }
});
test("Import legt ungeprüfte Kontakte an, überspringt Dubletten und erstellt keine Entwürfe", async () => {
  const rows = await parseImport(
    Buffer.from(
      "organisation,firstName,lastName,email\nSynthetischer Import,Anna,Test,anna.import@example.test\n",
    ),
    "test.csv",
  );
  const before = await db.draft.count();
  assert.deepEqual(await importContacts(martin, rows), {
    imported: 1,
    duplicates: 0,
  });
  assert.deepEqual(await importContacts(nora, rows), {
    imported: 0,
    duplicates: 1,
  });
  const c = await db.contact.findUniqueOrThrow({
    where: { email: rows[0].email },
  });
  assert.equal(c.status, "NEW");
  assert.equal(c.newsletterConsent, false);
  assert.equal(c.verifiedAt, null);
  assert.equal(await db.draft.count(), before);
  await assert.rejects(
    saveContact(martin, {
      ...input("dup-person"),
      organisation: c.organisation,
      firstName: c.firstName,
      lastName: c.lastName,
    }),
  );
});

async function withMockSmtp(
  mode: "test" | "production",
  run: () => Promise<void>,
) {
  const config = {
    MAIL_MODE: mode,
    ENABLE_EMAIL_SENDING: "true",
    SMTP_CONFIGURATION_CONFIRMED: "true",
    SMTP_HOST: "jovinus.metanet.ch",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_USER: "njeker@studiojeker.ch",
    SMTP_PASSWORD: "synthetic-unused-password",
    MAIL_FROM: "njeker@studiojeker.ch",
    TEST_MAIL_RECIPIENTS: "nora@studiojeker.ch",
    DAILY_SEND_LIMIT: "500",
  };
  const previous = Object.fromEntries(
    Object.keys(config).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, config);
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
}
test("SMTP-Dispatch ist ohne explizite Konfiguration blockiert; kein Transportaufruf", async () => {
  const { d } = await prepared("disabled-smtp");
  let calls = 0;
  await assert.rejects(
    dispatchApproved(martin, d.id, 1, async () => {
      calls++;
      return { accepted: [], rejected: [] };
    }),
    /deaktiviert/,
  );
  assert.equal(calls, 0);
});
test("Interner SMTP-Test überschreibt Header und Envelope mit der festen internen Liste", async () => {
  await withMockSmtp("test", async () => {
    const { c, d } = await prepared("internal-smtp");
    let calls = 0;
    const result = await dispatchApproved(nora, d.id, 1, async (m) => {
      calls++;
      assert.deepEqual(m.envelopeRecipients, ["nora@studiojeker.ch"]);
      assert.equal(m.recipient, c.email);
      assert.equal(m.test, true);
      return { accepted: m.envelopeRecipients, rejected: [] };
    });
    assert.equal(calls, 1);
    assert.equal(result.delivery.status, "TEST_SENT");
    assert.notEqual(
      (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).status,
      "SENT",
    );
  });
});
test("Paralleler Produktionsdispatch mit Mock erzeugt nur einen Transportaufruf", async () => {
  await withMockSmtp("production", async () => {
    const { d } = await prepared("smtp-parallel");
    let calls = 0;
    const mock = async (m: import("../../lib/mail").OutboundMessage) => {
      calls++;
      return { accepted: m.envelopeRecipients, rejected: [] };
    };
    const results = await Promise.all([
      dispatchApproved(martin, d.id, 1, mock),
      dispatchApproved(nora, d.id, 1, mock),
    ]);
    assert.equal(calls, 1);
    assert.equal(results[0].delivery.id, results[1].delivery.id);
    assert.equal(
      (
        await db.delivery.findUniqueOrThrow({
          where: { id: results[0].delivery.id },
        })
      ).status,
      "SENT",
    );
  });
});
test("SMTP-Timeout ist UNKNOWN und wird nie automatisch wiederholt", async () => {
  await withMockSmtp("production", async () => {
    const { d } = await prepared("smtp-timeout");
    let calls = 0;
    const mock = async () => {
      calls++;
      throw new Error("Synthetic socket timeout");
    };
    const first = await dispatchApproved(martin, d.id, 1, mock);
    assert.equal(first.delivery.status, "UNKNOWN");
    assert.equal(first.delivery.error, "SMTP_RESULT_UNCERTAIN_NO_RETRY");
    const second = await dispatchApproved(martin, d.id, 1, mock);
    assert.equal(second.reused, true);
    assert.equal(calls, 1);
  });
});
test("Änderung nach Freigabe verhindert SMTP; bestehende Datensätze bleiben erhalten", async () => {
  await withMockSmtp("production", async () => {
    const { d } = await prepared("smtp-edited");
    const v = await db.draftVersion.findFirstOrThrow({
      where: { draftId: d.id },
    });
    await editDraft(martin, d.id, 1, {
      recipient: v.recipient,
      subject: v.subject,
      body: v.body + " Änderung.",
    });
    let calls = 0;
    await assert.rejects(
      dispatchApproved(nora, d.id, 1, async () => {
        calls++;
        return { accepted: [], rejected: [] };
      }),
      /geändert/,
    );
    assert.equal(calls, 0);
    assert.equal(await db.draftVersion.count({ where: { draftId: d.id } }), 2);
  });
});

// Marketing Hub uses the same isolated schema and only synthetic fixtures.
const social = (ownerId: string, campaignId: string | null = null) => ({
  kind: "SOCIAL" as const,
  title: "Synthetische Kampagnenidee",
  ownerId,
  campaignId,
  scheduledAt: null,
  subject: "",
  preheader: "",
  body: "",
  audience: "",
  variants: [
    {
      channel: "LINKEDIN" as const,
      text: "Synthetischer Beitrag für die Prüfung.",
      link: "https://example.test/projekt",
      cta: "Mehr erfahren",
      mediaType: "IMAGE" as const,
      mediaUrl: "https://example.test/test.jpg",
      mediaReference: "synthetic-asset",
      scheduledAt: "2026-11-02T09:00:00.000Z",
    },
  ],
});
const campaignData = () => ({
  title: "Synthetischer Herbst",
  goal: "Dokumentierte Content-Planung",
  audience: "Synthetische B2B-Zielgruppe",
  startsAt: "2026-10-01T08:00:00.000Z",
  endsAt: "2026-11-30T17:00:00.000Z",
  ownerId: martin,
});
test("Hub: Kampagnen und Varianten bleiben nach Wiederladen zugeordnet; Konflikte werden abgewiesen", async () => {
  const c = await hub.saveCampaign(martin, campaignData());
  const content = await hub.saveContent(nora, social(nora, c.id));
  const saved = await db.marketingContent.findUniqueOrThrow({
    where: { id: content.id },
    include: { versions: true, campaign: true },
  });
  assert.equal(saved.campaign?.title, c.title);
  assert.equal(saved.versions.length, 1);
  assert.deepEqual(saved.versions[0].payload, social(nora, c.id));
  await hub.saveCampaign(
    nora,
    { ...campaignData(), title: "Geändert" },
    c.id,
    1,
  );
  await assert.rejects(
    hub.saveCampaign(martin, campaignData(), c.id, 1),
    /geändert/,
  );
  assert.equal(
    (await db.marketingContent.findUniqueOrThrow({ where: { id: content.id } }))
      .version,
    1,
  );
});
test("Hub: Berechtigungen gelten für Schreiben, Freigabe, Export und Veröffentlichung", async () => {
  const content = await hub.saveContent(martin, social(martin));
  await assert.rejects(
    hub.saveCampaign("missing", campaignData()),
    /Berechtigung/,
  );
  await assert.rejects(
    hub.saveContent(martin, social("missing")),
    /Berechtigung/,
  );
  await assert.rejects(
    hub.reviewContent("missing", content.id, 1, "APPROVED", true),
    /Berechtigung/,
  );
  await assert.rejects(
    exportNewsletter("missing", content.id, 1),
    /Berechtigung/,
  );
  await assert.rejects(
    hub.recordPublication(
      "missing",
      content.id,
      1,
      "LINKEDIN",
      new Date().toISOString(),
      "",
    ),
    /Berechtigung/,
  );
  await db.user.update({ where: { id: nora }, data: { active: false } });
  await assert.rejects(hub.saveContent(nora, social(martin)), /Berechtigung/);
  await db.user.update({ where: { id: nora }, data: { active: true } });
});
test("Hub: Freigabe dokumentiert Person/Version/Hash; Text-, Medien-, Zielgruppenänderungen invalidieren", async () => {
  for (const changed of [
    { ...social(martin), title: "Neuer Titel" },
    { ...social(martin), audience: "Neue Zielgruppe" },
    {
      ...social(martin),
      variants: [
        {
          ...social(martin).variants[0],
          mediaUrl: "https://example.test/new.jpg",
        },
      ],
    },
    {
      ...social(martin),
      variants: [{ ...social(martin).variants[0], text: "Geänderter Text" }],
    },
  ]) {
    const content = await hub.saveContent(martin, social(martin));
    await assert.rejects(
      hub.reviewContent(nora, content.id, 1, "APPROVED", false),
      /prüfen/,
    );
    await hub.reviewContent(nora, content.id, 1, "PENDING", false);
    assert.equal(
      (
        await db.marketingContent.findUniqueOrThrow({
          where: { id: content.id },
        })
      ).status,
      "IN_REVIEW",
    );
    await hub.reviewContent(nora, content.id, 1, "APPROVED", true);
    const approval = await db.marketingApproval.findFirstOrThrow({
      where: { contentId: content.id, status: "APPROVED" },
    });
    assert.equal(approval.userId, nora);
    assert.equal(approval.version, 1);
    assert.ok(approval.hash);
    assert.ok(approval.createdAt);
    await hub.saveContent(martin, changed, content.id, 1);
    assert.equal(
      (
        await db.marketingApproval.findUniqueOrThrow({
          where: { id: approval.id },
        })
      ).status,
      "INVALIDATED",
    );
    assert.equal(
      (
        await db.marketingContent.findUniqueOrThrow({
          where: { id: content.id },
        })
      ).status,
      "DRAFT",
    );
    await assert.rejects(
      hub.recordPublication(
        nora,
        content.id,
        2,
        "LINKEDIN",
        new Date().toISOString(),
        "",
      ),
      /freigegeben/,
    );
    assert.equal(
      await db.marketingVersion.count({ where: { contentId: content.id } }),
      2,
    );
  }
});
test("Hub: Parallele Bearbeitung erzeugt nur eine nächste Version", async () => {
  const content = await hub.saveContent(martin, social(martin));
  const outcomes = await Promise.allSettled([
    hub.saveContent(martin, social(martin), content.id, 1),
    hub.saveContent(nora, social(nora), content.id, 1),
  ]);
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    await db.marketingVersion.count({ where: { contentId: content.id } }),
    2,
  );
});
test("Hub: geplante Termine veröffentlichen nichts; manuelle Nachweise sind versionsgebunden und eindeutig", async () => {
  const content = await hub.saveContent(martin, social(martin));
  assert.equal(
    await db.manualPublication.count({ where: { contentId: content.id } }),
    0,
  );
  await hub.reviewContent(nora, content.id, 1, "APPROVED", true);
  await assert.rejects(
    hub.recordPublication(
      nora,
      content.id,
      1,
      "LINKEDIN",
      "2099-01-01T00:00:00Z",
      "",
    ),
    /Zukunft/,
  );
  await assert.rejects(
    hub.recordPublication(
      nora,
      content.id,
      1,
      "FACEBOOK",
      new Date().toISOString(),
      "",
    ),
    /Kanäle/,
  );
  const outcomes = await Promise.allSettled(
    [1, 2].map(() =>
      hub.recordPublication(
        nora,
        content.id,
        1,
        "LINKEDIN",
        new Date().toISOString(),
        "https://example.test/published",
      ),
    ),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    (await db.marketingContent.findUniqueOrThrow({ where: { id: content.id } }))
      .status,
    "DONE",
  );
  await hub.saveContent(martin, social(martin), content.id, 1);
  const records = await db.manualPublication.findMany({
    where: { contentId: content.id },
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].version, 1);
});
test("Hub: Newsletter-Export benötigt aktuelle Freigabe und protokolliert keine Übertragung", async () => {
  const newsletter = {
    ...social(martin),
    kind: "NEWSLETTER",
    variants: [],
    subject: "Synthetischer Newsletter",
    preheader: "Vorschau",
    body: "Synthetischer Text",
    audience: "Synthetische Liste mit separat dokumentierter Einwilligung",
  };
  const content = await hub.saveContent(martin, newsletter);
  await assert.rejects(exportNewsletter(nora, content.id, 1), /freigegeben/);
  await hub.reviewContent(nora, content.id, 1, "APPROVED", true);
  const result = await exportNewsletter(nora, content.id, 1);
  assert.equal(result.transferred, false);
  assert.equal(result.sent, false);
  assert.equal(result.version, 1);
  assert.ok(result.html.includes("*|UNSUB|*"));
  assert.equal(
    await db.newsletterExport.count({ where: { contentId: content.id } }),
    1,
  );
  const before = await db.delivery.count();
  await hub.completeContent(nora, content.id, 1);
  assert.equal(await db.delivery.count(), before);
  await hub.saveContent(
    martin,
    { ...newsletter, audience: "Anderes Empfängersegment" },
    content.id,
    1,
  );
  await assert.rejects(exportNewsletter(nora, content.id, 2), /freigegeben/);
});
test("Hub: Akquise-Planung bewahrt bestehende Nachricht und Freigabe; Kalender liefert alle Kanäle", async () => {
  const { c, d } = await prepared("hub-plan");
  const campaign = await hub.saveCampaign(martin, campaignData());
  const before = await db.delivery.count();
  await hub.planDraft(
    nora,
    d.id,
    1,
    campaign.id,
    martin,
    "2026-11-05T10:00:00Z",
  );
  const draft = await db.draft.findUniqueOrThrow({
    where: { id: d.id },
    include: { approvals: true, versions: true },
  });
  assert.equal(draft.version, 1);
  assert.equal(draft.versions.length, 1);
  assert.ok(draft.approvals.some((a) => a.status === "APPROVED"));
  assert.equal(draft.campaignId, campaign.id);
  assert.equal(draft.scheduledAt?.toISOString(), "2026-11-05T10:00:00.000Z");
  assert.equal(await db.delivery.count(), before);
  await assert.rejects(
    hub.planDraft(nora, d.id, 1, null, null, null),
    /geändert/,
  );
  const { hubState } = await import("../../lib/hub/api");
  const state = await hubState();
  assert.ok(
    state.drafts.some(
      (x) => x.contactId === c.id && x.campaignId === campaign.id,
    ),
  );
  assert.ok(state.contents.some((x) => x.kind === "SOCIAL"));
  assert.ok(state.contents.some((x) => x.kind === "NEWSLETTER"));
  assert.equal(state.integrations.mailchimp, "NOT_CONNECTED");
});

// Explicit in-memory storage and AI adapters below are test-only. No provider/network calls.
const objectBytes = new Map<string, Buffer>();
const testStore: import("../../lib/studio/storage").ObjectStore = {
  async put(k, b) {
    objectBytes.set(k, Buffer.from(b));
  },
  async get(k) {
    const b = objectBytes.get(k);
    if (!b) throw new Error("Test object missing");
    return b;
  },
  async remove(k) {
    objectBytes.delete(k);
  },
};
const studioBrief = (count = 1) => ({
  title: "Synthetische Studio-Serie",
  topic: "Eigene Fotografie",
  offer: "Dokumentierte Fotografie",
  goal: "Informieren",
  audience: "Synthetische KMU",
  tone: "Schweizer Hochdeutsch",
  channels: ["LINKEDIN", "INSTAGRAM", "FACEBOOK"],
  count,
  formats: ["1:1", "4:5", "9:16"],
  campaignId: null,
  referenceAssetIds: [],
});
async function studioContent(seriesId: string) {
  return db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: seriesId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
}
async function testMotif() {
  return studioAssets.storeAsset(
    martin,
    await sharp({
      create: { width: 320, height: 240, channels: 3, background: "#00c8ff" },
    })
      .png()
      .toBuffer(),
    "synthetisches-testmotiv.png",
    "ORIGINAL",
    undefined,
    testStore,
  );
}
test("Studio: Speichern/Wiederladen, bestehende Datenzuordnung und Serien bis sechs", async () => {
  const before = await db.contact.count();
  const series = await studio.createSeries(martin, studioBrief(6));
  const all = await db.marketingContent.findMany({
    where: { studioSeriesId: series.id },
  });
  assert.equal(all.length, 6);
  assert.ok(all.every((c) => c.organizationId === "studiojeker"));
  assert.equal(await db.contact.count(), before);
  const configBefore = process.env.STUDIO_LOCAL_ASSETS;
  process.env.STUDIO_LOCAL_ASSETS = "true";
  try {
    const state = await studio.studioState(nora);
    assert.equal(
      state.series.find((s) => s.id === series.id)!.contents.length,
      6,
    );
  } finally {
    if (configBefore === undefined) delete process.env.STUDIO_LOCAL_ASSETS;
    else process.env.STUDIO_LOCAL_ASSETS = configBefore;
  }
  await assert.rejects(
    studio.createSeries("unbekannt", studioBrief()),
    /Berechtigung/,
  );
});
test("Studio: geschützte Assets, falsche Typen, fremde Organisation und Hash-Manipulation", async () => {
  await assert.rejects(
    studioAssets.storeAsset(
      martin,
      Buffer.from("<svg><script/></svg>"),
      "bad.svg",
      "ORIGINAL",
      undefined,
      testStore,
    ),
    /Ungültiges Bild/,
  );
  await assert.rejects(
    studioAssets.storeAsset(
      martin,
      Buffer.alloc(8 * 1024 * 1024 + 1),
      "big.png",
      "ORIGINAL",
      undefined,
      testStore,
    ),
    /gross/,
  );
  const asset = await testMotif();
  assert.equal(
    (await studioAssets.readAsset(nora, asset.id, testStore)).asset.sha256,
    asset.sha256,
  );
  await assert.rejects(
    studioAssets.readAsset("unbekannt", asset.id, testStore),
    /Berechtigung/,
  );
  await db.studioOrganization.create({
    data: { id: "foreign-test", name: "Synthetisch fremd", brand: {} },
  });
  await db.studioAsset.update({
    where: { id: asset.id },
    data: { organizationId: "foreign-test" },
  });
  await assert.rejects(
    studioAssets.readAsset(nora, asset.id, testStore),
    /nicht gefunden/,
  );
  await db.studioAsset.update({
    where: { id: asset.id },
    data: { organizationId: "studiojeker" },
  });
  objectBytes.set(asset.objectKey, Buffer.from("tampered"));
  await assert.rejects(
    studioAssets.readAsset(martin, asset.id, testStore),
    /Prüfsumme/,
  );
});
test("Studio: konkrete Bild-/Layoutfreigabe, Entwertung nach Änderung, Export und ZIP", async () => {
  const s = await studio.createSeries(martin, studioBrief()),
    c = await studioContent(s.id),
    asset = await testMotif();
  const payload = studioContentInput.parse(c.versions[0].payload);
  payload.studio = {
    ...payload.studio!,
    motifAssetId: asset.id,
    motifSha256: asset.sha256,
    headline: "Synthetischer Test",
    showHeadline: false,
  };
  payload.variants = payload.variants.map((v) => ({
    ...v,
    mediaType: "IMAGE",
    mediaReference: `Studio-Asset ${asset.id}`,
  }));
  await hub.saveContent(nora, payload, c.id, 1);
  await assert.rejects(
    hub.reviewContent(martin, c.id, 2, "APPROVED", false),
    /prüfen/,
  );
  await assert.rejects(
    studioRender.exportContent(martin, c.id, 2, "1:1", "png", false, testStore),
    /freigegeben/,
  );
  await hub.reviewContent(martin, c.id, 2, "APPROVED", true);
  for (const format of ["1:1", "4:5", "9:16"] as const) {
    const r = await studioRender.exportContent(
      nora,
      c.id,
      2,
      format,
      "png",
      false,
      testStore,
    );
    const img = await studioAssets.readAsset(martin, r.assetId, testStore);
    const m = await sharp(img.bytes).metadata();
    assert.equal(m.width, 1080);
    assert.equal(
      m.height,
      format === "1:1" ? 1080 : format === "4:5" ? 1350 : 1920,
    );
  }
  const motif = await studioRender.exportMotif(nora, c.id, 2, "jpg", testStore);
  const motifBytes = await studioAssets.readAsset(
    martin,
    motif.assetId,
    testStore,
  );
  assert.equal(motifBytes.asset.mime, "image/jpeg");
  assert.equal((await sharp(motifBytes.bytes).metadata()).width, 320);
  const jpg = await studioRender.exportContent(
    nora,
    c.id,
    2,
    "1:1",
    "jpg",
    false,
    testStore,
  );
  assert.equal(
    (await studioAssets.readAsset(martin, jpg.assetId, testStore)).asset.mime,
    "image/jpeg",
  );
  const zip = await studioRender.exportSeries(nora, s.id, testStore);
  assert.equal(
    (await studioAssets.readAsset(martin, zip.assetId, testStore)).bytes
      .subarray(0, 2)
      .toString(),
    "PK",
  );
  await hub.saveContent(
    nora,
    { ...payload, studio: { ...payload.studio, cropX: 0.25 } },
    c.id,
    2,
  );
  assert.equal(
    await db.marketingApproval.count({
      where: { contentId: c.id, status: "APPROVED" },
    }),
    0,
  );
  await assert.rejects(
    studioRender.exportSeries(martin, s.id, testStore),
    /freigegeben/,
  );
  await assert.rejects(
    hub.saveContent(
      nora,
      {
        ...payload,
        studio: { ...payload.studio, motifSha256: "0".repeat(64) },
      },
      c.id,
      3,
    ),
    /nicht zugänglich/,
  );
  await assert.rejects(
    hub.saveContent(nora, { ...payload, studio: undefined }, c.id, 3),
    /Zuordnung/,
  );
});
test("Studio: Schriftdatei fehlt – sichtbare Textebenen werden nicht mit Ersatzschrift freigegeben", async () => {
  const s = await studio.createSeries(martin, studioBrief()),
    c = await studioContent(s.id),
    asset = await testMotif();
  const p = studioContentInput.parse(c.versions[0].payload);
  p.studio = {
    ...p.studio!,
    motifAssetId: asset.id,
    motifSha256: asset.sha256,
    headline: "Test",
    showHeadline: true,
  };
  await hub.saveContent(martin, p, c.id, 1);
  await assert.rejects(
    hub.reviewContent(nora, c.id, 2, "APPROVED", true),
    /Schriftdatei/,
  );
  await assert.rejects(
    studioRender.exportContent(martin, c.id, 2, "1:1", "png", true, testStore),
    /Schriftdatei/,
  );
});
test("Studio: keine API-Schlüssel, deduplizierte Aufträge, Fehler und Wiederaufnahme ohne Live-KI", async () => {
  const s = await studio.createSeries(martin, studioBrief()),
    c = await studioContent(s.id);
  const envNames = [
    "OPENAI_API_KEY",
    "CONTENT_AI_ENABLED",
    "CONTENT_DAILY_REQUEST_LIMIT",
    "CONTENT_DAILY_BUDGET_USD",
    "STUDIO_LOCAL_ASSETS",
  ];
  const old = Object.fromEntries(envNames.map((k) => [k, process.env[k]]));
  try {
    delete process.env.OPENAI_API_KEY;
    process.env.CONTENT_AI_ENABLED = "true";
    const { randomUUID } = await import("node:crypto");
    const request = {
      seriesId: s.id,
      kind: "TEXT",
      contentId: null,
      requestKey: randomUUID(),
      referenceIds: [],
      referenceRights: false,
      referenceTransfer: false,
      confirmedCosts: true,
    };
    await assert.rejects(studio.queueJob(martin, request), /Nicht verbunden/);
    process.env.OPENAI_API_KEY = "explicit-test-adapter-not-a-key";
    process.env.STUDIO_LOCAL_ASSETS = "true";
    process.env.CONTENT_DAILY_REQUEST_LIMIT = "100";
    process.env.CONTENT_DAILY_BUDGET_USD = "100";
    const j = await studio.queueJob(martin, request);
    assert.equal((await studio.queueJob(nora, request)).id, j.id);
    let calls = 0;
    const fake: import("../../lib/studio/provider").AIProvider = {
      async text() {
        calls++;
        return {
          posts: [
            {
              imageIdea: "TESTADAPTER: geometrisches Motiv",
              headline: "TESTADAPTER",
              hashtags: "#Test",
              variants: ["LINKEDIN", "INSTAGRAM", "FACEBOOK"].map(
                (channel) => ({
                  channel: channel as "LINKEDIN",
                  text: "TESTADAPTER – synthetischer Text",
                  cta: "Test",
                }),
              ),
            },
          ],
          usage: { testAdapter: true },
          requestId: "test-adapter",
        };
      },
      async image() {
        throw new Error("No image call expected");
      },
    };
    const both = await Promise.allSettled([
      studio.runJob(martin, j.id, fake, testStore),
      studio.runJob(nora, j.id, fake, testStore),
    ]);
    assert.equal(both.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(calls, 1);
    await assert.rejects(
      studio.runJob(nora, j.id, fake, testStore),
      /bereits gestartet/,
    );
    assert.equal(
      (await studio.studioState(nora)).jobs.find((job) => job.id === j.id)!
        .status,
      "SUCCEEDED",
    );
    await studio.applyJob(nora, j.id);
    assert.equal((await studioContent(s.id)).version, 2);
    assert.equal((await studioContent(s.id)).id, c.id);
    await assert.rejects(studio.applyJob(nora, j.id), /noch nicht/);
    const failed = await studio.queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
    });
    await studio.runJob(
      martin,
      failed.id,
      {
        ...fake,
        async text() {
          throw new ProviderFailure(false, "TESTADAPTER HTTP 429");
        },
      },
      testStore,
    );
    assert.equal(
      (await db.studioJob.findUniqueOrThrow({ where: { id: failed.id } }))
        .status,
      "FAILED",
    );
    const unknown = await studio.queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
    });
    await studio.runJob(
      martin,
      unknown.id,
      {
        ...fake,
        async text() {
          throw new ProviderFailure(true, "TESTADAPTER Timeout");
        },
      },
      testStore,
    );
    assert.equal(
      (await db.studioJob.findUniqueOrThrow({ where: { id: unknown.id } }))
        .status,
      "UNKNOWN",
    );
    await assert.rejects(
      studio.runJob(nora, unknown.id, fake, testStore),
      /bereits gestartet/,
    );
    process.env.CONTENT_DAILY_REQUEST_LIMIT = "1";
    await assert.rejects(
      studio.queueJob(martin, { ...request, requestKey: randomUUID() }),
      /Tageslimit/,
    );
  } finally {
    for (const k of envNames) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  }
});

test("Studio: Textlayout verwendet nur explizite Testschrift, alle Formate und escaped Text", async (t) => {
  const { readFileSync, existsSync } = await import("node:fs");
  const path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  if (!existsSync(path))
    return t.skip(
      "Explizite lokale Testschrift nicht vorhanden; keine Ersatzschrift verwenden.",
    );
  // This font is used only by this synthetic test, never shipped as a brand asset.
  const font = await studioAssets.storeAsset(
    martin,
    readFileSync(path),
    "TESTADAPTER-DejaVuSans.ttf",
    "FONT",
    undefined,
    testStore,
  );
  assert.match(studioRender.fontFamily(readFileSync(path)), /DejaVu/);
  const s = await studio.createSeries(martin, studioBrief()),
    c = await studioContent(s.id),
    image = await testMotif();
  const p = studioContentInput.parse(c.versions[0].payload);
  p.studio = {
    ...p.studio!,
    motifAssetId: image.id,
    motifSha256: image.sha256,
    fontAssetId: font.id,
    fontSha256: font.sha256,
    headline: "TESTADAPTER <span> & " + "Test ".repeat(20),
    showHeadline: true,
    showClaim: true,
  };
  await hub.saveContent(martin, p, c.id, 1);
  await hub.reviewContent(nora, c.id, 2, "APPROVED", true);
  for (const format of ["1:1", "4:5", "9:16"] as const)
    assert.ok(
      (
        await studioRender.renderLayout(
          nora,
          p.studio,
          format,
          "png",
          testStore,
        )
      ).length > 100,
    );
});

test("Newsletter import is idempotent; copies and edits cannot reuse approval", async () => {
  const { importNewsletters, duplicateNewsletter } =
    await import("../../lib/hub/newsletter-library");
  const first = await importNewsletters(martin);
  assert.equal(first.imported, 3);
  assert.equal((await importNewsletters(nora)).imported, 0);
  const original = await db.marketingContent.findUniqueOrThrow({
    where: { id: first.ids[1] },
    include: { versions: true },
  });
  const snapshot = studioContentInput.parse(original.versions[0].payload);
  assert.equal(snapshot.newsletter!.templateId, "newsletter-02");
  assert.equal(original.status, "DRAFT");
  await assert.rejects(exportNewsletter(martin, original.id, 1));
  await hub.reviewContent(martin, original.id, 1, "APPROVED", true);
  const exported = await exportNewsletter(martin, original.id, 1);
  assert.ok(exported.html.includes("Gute Inhalte"));
  assert.ok(exported.html.includes("*|UNSUB|*"));
  const copy = await duplicateNewsletter(nora, original.id, 1);
  assert.equal(copy.status, "DRAFT");
  assert.equal(copy.ownerId, nora);
  assert.equal(copy.scheduledAt, null);
  await assert.rejects(exportNewsletter(nora, copy.id, 1));
  const fields = { ...snapshot.newsletter!.fields };
  const textKey = Object.keys(fields).find((k) =>
    k.startsWith("hero_headline.text"),
  )!;
  fields[textKey] = "Geänderte Headline";
  await hub.saveContent(
    martin,
    { ...snapshot, newsletter: { ...snapshot.newsletter, fields } },
    original.id,
    1,
  );
  await assert.rejects(exportNewsletter(martin, original.id, 1));
  await assert.rejects(exportNewsletter(martin, original.id, 2));
  await assert.rejects(duplicateNewsletter(martin, original.id, 1));
  assert.equal((await importNewsletters(martin)).imported, 0);
  const saved = await db.marketingVersion.findUniqueOrThrow({
    where: { contentId_version: { contentId: original.id, version: 2 } },
  });
  assert.ok(
    studioContentInput.parse(saved.payload).body.includes("Geänderte Headline"),
  );
});
