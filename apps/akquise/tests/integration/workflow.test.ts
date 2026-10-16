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
    { env: process.env, stdio: "pipe" },
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

const { dispatchApproved } = await import("../../lib/delivery");
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
