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
const { prepareContacts } =
  await import("../../lib/contact-preparation-service");
const { mailReview } = await import("../../lib/mail-review");
const { execFileSync } = await import("node:child_process");
// Load all modules before registering hooks/tests: late top-level awaits can
// let the node:test runner finish a filtered suite and drop its schema early.
const { dispatchApproved } = await import("../../lib/delivery");
const hub = await import("../../lib/hub/workflow");
const customers = await import("../../lib/customers");
const { exportNewsletter } = await import("../../lib/hub/newsletter");
const { transferNewsletter, mailchimpAudiences } =
  await import("../../lib/hub/mailchimp");
const studio = await import("../../lib/studio/service");
const assistantContext = await import("../../lib/studio/context");
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
test("Globale Mailprüfung: 24 exakte Versionen, gemeinsame Grundlage und kein Versand", async () => {
  const ids: string[] = [];
  for (let i = 0; i < 24; i++) {
    const c = await saveContact(martin, input(`global-${i}`));
    ids.push((await newDraft(martin, c.id)).id);
  }
  const preview = await mailReview(martin, "preview", { ids });
  assert.ok(preview.rows);
  assert.equal(preview.rows.length, 24);
  assert.ok(preview.rows.every((r) => r.needsLegal && !r.issues.length));
  const items = preview.rows.map(({ id, version, hash, contactRevision }) => ({
    id,
    version,
    hash,
    contactRevision,
  }));
  await assert.rejects(mailReview(martin, "approve", { items, read: false }));
  const withoutLegal = await mailReview(martin, "approve", {
    items: items.slice(0, 1),
    read: true,
  });
  assert.equal(withoutLegal.results?.[0].ok, false);
  const approved = await mailReview(martin, "approve", {
    items,
    read: true,
    legal: {
      confirmed: true,
      rationale:
        "Synthetischer Nachweis gilt ausdrücklich für diese Testkontakte.",
      procurementReviewed: false,
    },
  });
  assert.equal(approved.results?.filter((r) => r.ok).length, 24);
  assert.equal(
    await db.approval.count({
      where: { draftId: { in: ids }, status: "APPROVED" },
    }),
    24,
  );
  assert.equal(await db.delivery.count({ where: { draftId: { in: ids } } }), 0);
  assert.equal(
    await db.mailQueueItem.count({ where: { draftId: { in: ids } } }),
    0,
  );
});
test("Globale Prüfung blockiert geänderte Vorschauen, Sperren und ungeprüfte Behörden ohne andere Freigaben zu verlieren", async () => {
  const contacts = [];
  const ids = [];
  for (let i = 0; i < 5; i++) {
    const c = await saveContact(martin, {
      ...input(`global-stale-${i}`),
      publicAuthority: i === 3,
    });
    contacts.push(c);
    ids.push((await newDraft(martin, c.id)).id);
  }
  const preview = await mailReview(martin, "preview", { ids });
  assert.ok(preview.rows);
  const items = preview.rows.map(({ id, version, hash, contactRevision }) => ({
    id,
    version,
    hash,
    contactRevision,
  }));
  await editDraft(martin, ids[0], 1, {
    recipient: contacts[0].email,
    subject: "Neuer Betreff",
    body: "Geänderter Text",
  });
  await saveContact(
    martin,
    { ...input("global-stale-1"), hook: "Eine geänderte Kontaktangabe." },
    contacts[1].id,
    contacts[1].revision,
  );
  await suppress(martin, contacts[2].email, "Synthetischer Widerspruch");
  const result = await mailReview(martin, "approve", {
    items,
    read: true,
    legal: {
      confirmed: true,
      rationale:
        "Synthetischer dokumentierter Nachweis für die gewählten Kontakte.",
      procurementReviewed: false,
    },
  });
  assert.deepEqual(
    result.results?.map((r) => r.ok),
    [false, false, false, false, true],
  );
  for (const c of contacts.slice(0, 4)) {
    assert.equal(await db.legalReview.count({ where: { contactId: c.id } }), 0);
  }
  const updated = await mailReview(martin, "preview", { ids: [ids[2]] });
  assert.ok(updated.rows?.[0].issues.some((i) => i.includes("Sperrliste")));
  await assert.rejects(
    mailReview(martin, "preview", { ids: [ids[4], ids[4]] }),
  );
  await assert.rejects(
    mailReview(martin, "approve", {
      items: [items[4]],
      read: true,
      legal: {
        confirmed: false,
        rationale: "Synthetisch",
        procurementReviewed: false,
      },
    }),
  );
});
test("Berechtigungen: unbekannte und deaktivierte Benutzer sind blockiert", async () => {
  await assert.rejects(
    saveContact("unbekannt", input("no-user")),
    /Berechtigung/,
  );
  await db.user.update({ where: { id: martin }, data: { active: false } });
  await assert.rejects(saveContact(martin, input("inactive")), /Berechtigung/);
  await db.user.update({ where: { id: martin }, data: { active: true } });
});
test("Sammelübernahme bestätigt vorhandene Daten, erhält Einwilligungsstatus und meldet Teilergebnisse", async () => {
  const c = await saveContact(martin, {
    ...input("batch-notes"),
    confidence: "UNCONFIRMED",
    verifiedAt: "",
    hook: "",
    notes:
      "Prüfstatus: Persönliche Adresse verifiziert\nPrüfdatum: 01.01.2026\nBetreff: Projektbilder\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nDokumentiertes synthetisches Projekt.\n\nFreundliche Grüsse\nNora Jeker",
  });
  const incomplete = await saveContact(martin, {
    ...input("batch-gap"),
    confidence: "UNCONFIRMED",
    verifiedAt: "",
    hook: "",
  });
  const preview = await prepareContacts(martin, "preview", {
    ids: [c.id, incomplete.id],
  });
  assert.ok(preview.contacts);
  assert.equal(preview.contacts[0].ready, true);
  assert.equal(preview.contacts[1].ready, false);
  assert.equal(
    (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).confidence,
    "UNCONFIRMED",
  );
  await assert.rejects(
    prepareContacts(martin, "apply", {
      confirmed: false,
      contacts: [{ id: c.id, revision: c.revision }],
    }),
  );
  const result = await prepareContacts(martin, "apply", {
    confirmed: true,
    contacts: [
      { id: c.id, revision: c.revision },
      { id: incomplete.id, revision: incomplete.revision },
    ],
  });
  assert.ok(result.results);
  assert.deepEqual(
    result.results.map((r) => r.ok),
    [true, false],
  );
  const saved = await db.contact.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(saved.confidence, "VERIFIED");
  assert.equal(saved.revision, c.revision + 1);
  assert.equal(saved.newsletterConsent, false);
  assert.equal(saved.legalCategory, "UNASSESSED");
  assert.equal(await db.legalReview.count({ where: { contactId: c.id } }), 0);
  assert.equal(await db.approval.count({ where: { contactId: c.id } }), 0);
  const stale = await prepareContacts(martin, "apply", {
    confirmed: true,
    contacts: [{ id: c.id, revision: c.revision }],
  });
  assert.ok(stale.results);
  assert.equal(stale.results[0].ok, false);
  const batch = await prepareContacts(martin, "drafts", {
    ids: [incomplete.id, c.id],
  });
  assert.ok(batch.results);
  assert.deepEqual(
    batch.results.map((r) => r.ok),
    [false, true],
  );
  await Promise.all([
    prepareContacts(martin, "drafts", { ids: [c.id] }),
    prepareContacts(martin, "drafts", { ids: [c.id] }),
  ]);
  assert.equal(await db.draft.count({ where: { contactId: c.id } }), 1);
  await suppress(martin, saved.email, "Synthetische Sperre");
  const blocked = await prepareContacts(martin, "preview", { ids: [c.id] });
  assert.ok(blocked.contacts);
  assert.equal(blocked.contacts[0].ready, false);
  await assert.rejects(
    prepareContacts("unbekannt", "preview", { ids: [c.id] }),
    /Berechtigung/,
  );
});
test("25 Kontakte gemeinsam vervollständigen und Entwürfe erstellen ohne Einzelbearbeitung", async () => {
  const contacts = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      saveContact(martin, {
        ...input(`bulk-editor-${i}`),
        sourceUrl: "",
        verifiedAt: "",
        confidence: "UNCONFIRMED",
        hook: "",
        notes: `Betreff: Persönlicher Entwurf ${i}\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nIndividueller dokumentierter Bezug ${i}.\n\nFreundliche Grüsse\nNora Jeker`,
      }),
    ),
  );
  const shared = {
    sourceUrl: "https://example.test/gepruefte-liste",
    verifiedAt: "2026-01-02T00:00:00.000Z",
    confidence: "VERIFIED",
    hook: "Gemeinsamer Bezug darf persönliche Texte nicht ersetzen.",
  };
  const preview = await prepareContacts(martin, "preview", {
    ids: contacts.map((c) => c.id),
    shared,
  });
  assert.ok(preview.contacts);
  assert.equal(preview.contacts.filter((c) => c.ready).length, 25);
  assert.equal(
    await db.draft.count({
      where: { contactId: { in: contacts.map((c) => c.id) } },
    }),
    0,
  );
  const selection = contacts.map((c, i) => ({
    id: c.id,
    revision: c.revision,
    ...(i === 0
      ? { values: { sourceUrl: "https://example.test/einzelbeleg" } }
      : {}),
  }));
  await assert.rejects(
    prepareContacts(martin, "prepare", {
      confirmed: false,
      shared,
      contacts: selection,
    }),
  );
  await assert.rejects(
    prepareContacts(martin, "prepare", {
      confirmed: true,
      shared: { ...shared, newsletterConsent: true },
      contacts: selection,
    }),
  );
  await assert.rejects(
    prepareContacts(martin, "preview", {
      ids: [contacts[0].id],
      shared: { sourceUrl: "javascript:alert(1)" },
    }),
  );
  const result = await prepareContacts(martin, "prepare", {
    confirmed: true,
    shared,
    contacts: selection,
  });
  assert.ok(result.results);
  assert.equal(result.results.filter((r) => r.ok).length, 25);
  for (const [i, c] of contacts.entries()) {
    const saved = await db.contact.findUniqueOrThrow({ where: { id: c.id } });
    assert.equal(
      saved.sourceUrl,
      i === 0 ? "https://example.test/einzelbeleg" : shared.sourceUrl,
    );
    assert.equal(saved.revision, c.revision + 1);
    assert.equal(saved.newsletterConsent, false);
    assert.equal(saved.legalCategory, "UNASSESSED");
    const version = await db.draftVersion.findFirstOrThrow({
      where: { draft: { contactId: c.id } },
    });
    assert.equal(version.subject, `Persönlicher Entwurf ${i}`);
    assert.match(
      version.body,
      new RegExp(`Individueller dokumentierter Bezug ${i}\\.`),
    );
  }
  const fresh = await prepareContacts(martin, "preview", {
    ids: contacts.map((c) => c.id),
    shared,
  });
  assert.ok(fresh.contacts);
  const repeat = await prepareContacts(martin, "prepare", {
    confirmed: true,
    shared,
    contacts: fresh.contacts.map((c) => ({ id: c.id, revision: c.revision })),
  });
  assert.ok(repeat.results);
  assert.equal(repeat.results.filter((r) => r.ok).length, 25);
  assert.equal(
    await db.draft.count({
      where: { contactId: { in: contacts.map((c) => c.id) } },
    }),
    25,
  );
  assert.equal(
    await db.approval.count({
      where: { contactId: { in: contacts.map((c) => c.id) } },
    }),
    0,
  );
  assert.equal(
    await db.legalReview.count({
      where: { contactId: { in: contacts.map((c) => c.id) } },
    }),
    0,
  );
  const stale = await prepareContacts(martin, "prepare", {
    confirmed: true,
    shared,
    contacts: selection,
  });
  assert.ok(stale.results);
  assert.equal(stale.results.filter((r) => r.ok).length, 0);
  await assert.rejects(
    prepareContacts(martin, "preview", {
      ids: [contacts[0].id],
      edits: [selection[0]],
    }),
    /geändert/,
  );
  await suppress(
    martin,
    contacts[0].email,
    "Synthetische Sperre nach Vorschau",
  );
  const blocked = await prepareContacts(martin, "prepare", {
    confirmed: true,
    shared,
    contacts: [{ id: contacts[0].id, revision: fresh.contacts[0].revision }],
  });
  assert.ok(blocked.results);
  assert.equal(blocked.results[0].ok, false);
});
test("Sammelvorbereitung meldet gespeicherte Daten auch bei fehlerhaftem Mailblock", async () => {
  const bad = await saveContact(martin, {
    ...input("bulk-mail-gap"),
    confidence: "UNCONFIRMED",
    sourceUrl: "",
    notes: "Betreff: Unvollständig",
  });
  const good = await saveContact(martin, {
    ...input("bulk-mail-good"),
    confidence: "UNCONFIRMED",
    sourceUrl: "",
  });
  const result = await prepareContacts(martin, "prepare", {
    confirmed: true,
    shared: { confidence: "VERIFIED", sourceUrl: "https://example.test/liste" },
    contacts: [bad, good].map((c) => ({ id: c.id, revision: c.revision })),
  });
  assert.ok(result.results);
  assert.deepEqual(
    result.results.map((r) => r.ok),
    [false, true],
  );
  assert.match(
    result.results[0].message,
    /Prüfdaten gespeichert; Entwurf noch offen/,
  );
  assert.equal(
    "revision" in result.results[0] && result.results[0].revision,
    bad.revision + 1,
  );
  assert.equal(await db.draft.count({ where: { contactId: bad.id } }), 0);
  assert.equal(await db.draft.count({ where: { contactId: good.id } }), 1);
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
  const c = await db.contact.findFirstOrThrow({
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

test("Import erkennt Personen wieder und erhält gemeinsam genutzte Adressen", async () => {
  const rows = Array.from({ length: 64 }, (_, i) => ({
    organisation: `Synthetische Importfirma ${i}`,
    firstName: "Anna",
    lastName: `Beispiel ${i}`,
    email: `masterliste.${i}@example.test`,
    confidence: "UNCONFIRMED" as const,
    verifiedAt: "" as const,
    newsletterConsent: false,
    newsletterEvidence: "",
    legalCategory: "UNASSESSED" as const,
    publicAuthority: false,
    industry: "",
    region: "",
    position: "",
    website: "",
    sourceUrl: "",
    hook: "",
    service: "",
    owner: "",
    notes: "",
  }));
  await saveContact(martin, {
    ...input("existing-email"),
    email: rows[0].email,
  });
  await saveContact(martin, {
    ...input("existing-person"),
    organisation: rows[1].organisation,
    firstName: rows[1].firstName,
    lastName: rows[1].lastName,
  });
  assert.deepEqual(await importContacts(martin, rows), {
    imported: 63,
    duplicates: 1,
  });
  assert.deepEqual(await importContacts(nora, rows), {
    imported: 0,
    duplicates: 64,
  });
  assert.equal(
    (
      await db.contact.findFirstOrThrow({
        where: { email: rows[0].email, status: "VERIFIED" },
      })
    ).status,
    "VERIFIED",
  );
  const missing = rows.slice(0, 2).map((r, i) => ({
    ...r,
    organisation: `Ohne Adresse ${i}`,
    email: "",
  }));
  assert.deepEqual(await importContacts(martin, missing), {
    imported: 2,
    duplicates: 0,
  });
  assert.deepEqual(await importContacts(nora, missing), {
    imported: 0,
    duplicates: 2,
  });
  const incomplete = await db.contact.findFirstOrThrow({
    where: { organisation: "Ohne Adresse 0" },
  });
  await assert.rejects(newDraft(martin, incomplete.id));
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
test("Kundenprofile bleiben intern und Kampagnen prüfen die Kundenzuordnung", async () => {
  const input = {
    name: "Synthetischer Kunde",
    website: "https://example.test",
    contactName: "Anna Muster",
    contactEmail: "anna@example.test",
    notes: "Interne Testnotiz",
    status: "ACTIVE" as const,
  };
  await assert.rejects(
    customers.saveCustomer("missing", input),
    /Berechtigung/,
  );
  const customer = await customers.saveCustomer(martin, input);
  assert.equal(
    (await customers.customerState(nora)).find((x) => x.id === customer.id)
      ?.name,
    input.name,
  );
  const campaign = await hub.saveCampaign(nora, {
    ...campaignData(),
    customerId: customer.id,
  });
  assert.equal(campaign.customerId, customer.id);
  await assert.rejects(
    hub.saveCampaign(martin, { ...campaignData(), customerId: "fremd" }),
    /Kunde nicht zugänglich/,
  );
  await customers.saveCustomer(
    martin,
    { revision: 1, data: { ...input, status: "INACTIVE" } },
    customer.id,
  );
  await assert.rejects(
    customers.saveCustomer(nora, { revision: 1, data: input }, customer.id),
    /geändert/,
  );
  await assert.rejects(
    hub.saveCampaign(nora, { ...campaignData(), customerId: customer.id }),
    /Kunde nicht zugänglich/,
  );
});
test("Hub: Kampagnen und Varianten bleiben nach Wiederladen zugeordnet; Konflikte werden abgewiesen", async () => {
  const c = await hub.saveCampaign(martin, campaignData());
  const content = await hub.saveContent(nora, social(nora, c.id));
  const saved = await db.marketingContent.findUniqueOrThrow({
    where: { id: content.id },
    include: { versions: true, campaign: true },
  });
  assert.equal(saved.campaign?.title, c.title);
  assert.equal(saved.workspace, "SOCIAL_POST");
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
test("Mailchimp: nur freigegebene Version als Entwurf, genau einmal und ohne Versand", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MAILCHIMP_API_KEY;
  process.env.MAILCHIMP_API_KEY = "synthetic-secret-us21";
  const calls: {
    method: string;
    path: string;
    body: Record<string, unknown>;
  }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ method: init?.method || "GET", path: url.pathname, body });
    assert.equal(url.hostname, "us21.api.mailchimp.com");
    if (url.pathname === "/3.0/lists" || url.pathname === "/3.0/lists/")
      return Response.json({
        lists: [{ id: "aud123", name: "Test Audience" }],
      });
    if (url.pathname === "/3.0/lists/aud123")
      return Response.json({
        id: "aud123",
        campaign_defaults: {
          from_name: "Studiojeker",
          from_email: "synthetic@example.test",
        },
      });
    if (url.pathname === "/3.0/campaigns" && init?.method === "POST")
      return Response.json({ id: "remote123", web_id: 123 });
    if (
      url.pathname === "/3.0/campaigns/remote123/content" &&
      init?.method === "PUT"
    )
      return Response.json({ html: body.html });
    throw new Error("Unexpected Mailchimp request");
  };
  try {
    const newsletter = {
      ...social(martin),
      kind: "NEWSLETTER" as const,
      variants: [],
      subject: "Synthetischer Newsletter",
      preheader: "Vorschau",
      body: "Synthetischer Text",
      audience: "Separat geprüfte Testliste",
    };
    const content = await hub.saveContent(martin, newsletter);
    await assert.rejects(
      transferNewsletter(nora, content.id, 1, "aud123"),
      /freigegeben/,
    );
    assert.equal(calls.filter((c) => c.method === "POST").length, 0);
    await hub.reviewContent(nora, content.id, 1, "APPROVED", true);
    assert.equal((await mailchimpAudiences(martin)).audiences[0].id, "aud123");
    const result = await transferNewsletter(martin, content.id, 1, "aud123");
    assert.equal(result.sent, false);
    assert.equal(result.campaignId, "remote123");
    assert.equal(calls.filter((c) => c.method === "POST").length, 1);
    assert.ok(
      String(calls.find((c) => c.method === "PUT")?.body.html).includes(
        "*|UNSUB|*",
      ),
    );
    assert.ok(!calls.some((c) => /send|schedule/.test(c.path)));
    await assert.rejects(
      transferNewsletter(nora, content.id, 1, "aud123"),
      /bereits/,
    );
    assert.equal(calls.filter((c) => c.method === "POST").length, 1);
    const transfer = await db.mailchimpTransfer.findUniqueOrThrow({
      where: { contentId_version: { contentId: content.id, version: 1 } },
    });
    assert.equal(transfer.status, "DRAFT");
    assert.equal(transfer.remoteId, "remote123");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MAILCHIMP_API_KEY;
    else process.env.MAILCHIMP_API_KEY = originalKey;
  }
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
  assert.ok(all.every((c) => c.workspace === "CONTENT_DRAFT"));
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
test("Social workspace: GPT-Dialoge bleiben erhalten und erscheinen erst nach Übernahme", async () => {
  const series = await studio.createSeries(martin, {
    title: "Synthetischer GPT-Dialog",
    topic: "Ideen für Sichtbarkeit",
    offer: "",
    goal: "Im Gespräch klären",
    audience: "Im Gespräch klären",
    tone: "Persönlich",
    channels: ["INSTAGRAM"],
    count: 1,
    formats: ["4:5"],
    campaignId: null,
    customerId: null,
    referenceAssetIds: [],
    brandRules: ["tone"],
    workspace: "GPT_DIALOG",
  });
  const content = await db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: series.id },
  });
  assert.equal(content.workspace, "GPT_DIALOG");
  await assert.rejects(
    hub.reviewContent(martin, content.id, 1, "APPROVED", true),
    /Social Media übernehmen/,
  );
  await assert.rejects(
    hub.recordPublication(
      martin,
      content.id,
      1,
      "INSTAGRAM",
      "2026-10-01T10:00:00.000Z",
      "",
    ),
    /nicht freigegeben|Publishing-Workspace|Social Media/,
  );
  const promoted = await hub.promoteToSocialPost(martin, content.id, 1);
  assert.equal(promoted.workspace, "SOCIAL_POST");
  const stillThere = await db.marketingContent.findUniqueOrThrow({
    where: { id: content.id },
    include: { versions: true },
  });
  assert.equal(stillThere.workspace, "SOCIAL_POST");
  assert.equal(stillThere.versions.length, 1);
  await assert.rejects(
    hub.promoteToSocialPost(martin, content.id, 1),
    /Content-Entwürfe und GPT-Dialoge/,
  );
});
test("Social workspace: Übernahme erbt Kampagne aus dem GPT-Projekt", async () => {
  const campaign = await hub.saveCampaign(martin, {
    title: "Kampagne für GPT-Übernahme",
    goal: "Reichweite",
    audience: "B2B",
    startsAt: "2026-10-01T08:00:00.000Z",
    endsAt: "2026-10-31T18:00:00.000Z",
    ownerId: martin,
    customerId: null,
  });
  const series = await studio.createSeries(martin, {
    title: "GPT mit Kampagne",
    topic: "Ideen",
    offer: "",
    goal: "Im Gespräch klären",
    audience: "Im Gespräch klären",
    tone: "Persönlich",
    channels: ["LINKEDIN"],
    count: 1,
    formats: ["1:1"],
    campaignId: campaign.id,
    customerId: null,
    referenceAssetIds: [],
    brandRules: ["tone"],
    workspace: "GPT_DIALOG",
  });
  const content = await db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: series.id },
  });
  // Simulate stub without content.campaignId but series briefing still linked.
  await db.marketingContent.update({
    where: { id: content.id },
    data: { campaignId: null },
  });
  const promoted = await hub.promoteToSocialPost(martin, content.id, 1);
  assert.equal(promoted.workspace, "SOCIAL_POST");
  assert.equal(promoted.campaignId, campaign.id);
  const overridden = await studio.createSeries(martin, {
    title: "GPT ohne Kampagnenpflicht",
    topic: "Ideen",
    offer: "",
    goal: "Im Gespräch klären",
    audience: "Im Gespräch klären",
    tone: "Persönlich",
    channels: ["LINKEDIN"],
    count: 1,
    formats: ["1:1"],
    campaignId: campaign.id,
    customerId: null,
    referenceAssetIds: [],
    brandRules: ["tone"],
    workspace: "GPT_DIALOG",
  });
  const other = await db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: overridden.id },
  });
  const cleared = await hub.promoteToSocialPost(martin, other.id, 1, null);
  assert.equal(cleared.campaignId, null);
});
test("Dialogverwaltung: archivieren, wiederherstellen, löschen ohne Nebenwirkungen", async () => {
  const { manageDialogs } = await import("../../lib/hub/dialogs");
  const campaign = await hub.saveCampaign(martin, {
    title: "Kampagne Dialogschutz",
    goal: "Sichtbarkeit",
    audience: "B2B",
    startsAt: "2026-10-01T08:00:00.000Z",
    endsAt: "2026-10-31T18:00:00.000Z",
    ownerId: martin,
    customerId: null,
  });
  const series = await studio.createSeries(martin, {
    title: "Dialog zum Löschen",
    topic: "Ideen",
    offer: "",
    goal: "Im Gespräch klären",
    audience: "Im Gespräch klären",
    tone: "Persönlich",
    channels: ["LINKEDIN"],
    count: 1,
    formats: ["1:1"],
    campaignId: campaign.id,
    customerId: null,
    referenceAssetIds: [],
    brandRules: ["tone"],
    workspace: "GPT_DIALOG",
  });
  const dialog = await db.marketingContent.findFirstOrThrow({
    where: { studioSeriesId: series.id, workspace: "GPT_DIALOG" },
  });
  const siblingPost = await hub.saveContent(martin, {
    kind: "SOCIAL",
    title: "Unabhängiger Social Post",
    ownerId: martin,
    campaignId: campaign.id,
    scheduledAt: null,
    subject: "",
    preheader: "",
    body: "",
    audience: "",
    variants: [
      {
        channel: "LINKEDIN",
        text: "Bleibt erhalten",
        link: "",
        cta: "",
        mediaType: "NONE",
        mediaUrl: "",
        mediaReference: "",
        scheduledAt: null,
      },
    ],
  });
  await manageDialogs(martin, {
    action: "archive",
    items: [{ id: dialog.id, version: dialog.version }],
  });
  const archived = await db.marketingContent.findUniqueOrThrow({
    where: { id: dialog.id },
  });
  assert.ok(archived.archivedAt);
  await assert.rejects(
    hub.promoteToSocialPost(martin, dialog.id, dialog.version),
    /Archivierte Dialoge/,
  );
  await manageDialogs(martin, {
    action: "restore",
    items: [{ id: dialog.id, version: dialog.version }],
  });
  assert.equal(
    (
      await db.marketingContent.findUniqueOrThrow({
        where: { id: dialog.id },
      })
    ).archivedAt,
    null,
  );
  await manageDialogs(martin, {
    action: "delete",
    items: [{ id: dialog.id, version: dialog.version }],
  });
  assert.equal(
    await db.marketingContent.findUnique({ where: { id: dialog.id } }),
    null,
  );
  assert.ok(
    await db.studioSeries.findUnique({ where: { id: series.id } }),
    "Studio-Projekt bleibt erhalten",
  );
  assert.ok(
    await db.campaign.findUnique({ where: { id: campaign.id } }),
    "Kampagne bleibt erhalten",
  );
  assert.equal(
    (
      await db.marketingContent.findUniqueOrThrow({
        where: { id: siblingPost.id },
      })
    ).workspace,
    "SOCIAL_POST",
  );
  await assert.rejects(
    manageDialogs(martin, {
      action: "delete",
      items: [{ id: siblingPost.id, version: siblingPost.version }],
    }),
    /kein GPT-Dialog|Content-Entwurf/,
  );
  await assert.rejects(
    manageDialogs("unbekannt", {
      action: "delete",
      items: [{ id: siblingPost.id, version: 1 }],
    }),
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
  const originalBytes = objectBytes.get(asset.objectKey)!;
  objectBytes.set(asset.objectKey, Buffer.from("tampered"));
  await assert.rejects(
    studioAssets.readAsset(martin, asset.id, testStore),
    /Prüfsumme/,
  );
  // Deduplication reuses this original in later tests; restore the deliberately corrupted fixture.
  objectBytes.set(asset.objectKey, originalBytes);
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

test("Studio context: persistent personal preferences, current company knowledge and isolated project memory", async () => {
  const envNames = [
    "OPENAI_API_KEY",
    "CONTENT_AI_ENABLED",
    "CONTENT_DAILY_REQUEST_LIMIT",
    "CONTENT_DAILY_BUDGET_USD",
    "STUDIO_LOCAL_ASSETS",
  ];
  const old = envNames.map((key) => process.env[key]);
  Object.assign(process.env, {
    OPENAI_API_KEY: "synthetic",
    CONTENT_AI_ENABLED: "true",
    CONTENT_DAILY_REQUEST_LIMIT: "1000",
    CONTENT_DAILY_BUDGET_USD: "1000",
    STUDIO_LOCAL_ASSETS: "true",
  });
  try {
    const { randomUUID } = await import("node:crypto");
    const user = await db.user.findUniqueOrThrow({ where: { id: martin } });
    const otherUser = await db.user.findUniqueOrThrow({ where: { id: nora } });
    const prefs = await assistantContext.saveAssistantPreferences(martin, {
      revision: user.studioContextRevision,
      text: "Ich betreue Marketing nebenbei. Bitte kurze Erklärungen.",
    });
    await assert.rejects(
      assistantContext.saveAssistantPreferences(martin, {
        revision: user.studioContextRevision,
        text: "Veralteter Stand",
      }),
      /geändert/,
    );
    await assert.rejects(
      assistantContext.saveAssistantPreferences(martin, {
        revision: prefs.revision,
        text: "Andere Person ändern",
        userId: nora,
      }),
      /Unrecognized key/,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: nora } })).studioContext,
      otherUser.studioContext,
    );
    assert.equal(
      (await studio.studioState(martin)).assistantUser.studioContext,
      prefs.text,
    );
    const customerInput = {
      name: "SYNTHETISCH Firma A",
      website: "",
      contactName: "",
      contactEmail: "",
      notes: "",
      status: "ACTIVE",
      knowledge: { offers: "SYNTHETISCH Maschinenbau" },
    };
    const a = await customers.saveCustomer(martin, customerInput);
    const b = await customers.saveCustomer(martin, {
      ...customerInput,
      name: "SYNTHETISCH Firma B",
    });
    const previous = await studio.createSeries(martin, {
      ...studioBrief(),
      title: "SYNTHETISCH Frühere Kampagne A",
      customerId: a.id,
    });
    const excluded = await studio.createSeries(martin, {
      ...studioBrief(),
      title: "SYNTHETISCH Vertrauliche Kampagne B",
      customerId: b.id,
    });
    const internal = await studio.createSeries(martin, {
      ...studioBrief(),
      title: "SYNTHETISCH Agentureigenes Projekt",
    });
    const request = (seriesId: string) => ({
      seriesId,
      kind: "CHAT",
      message: "Entwickle einen Beitrag.",
      contentId: null,
      requestKey: randomUUID(),
      referenceIds: [],
      referenceRights: false,
      referenceTransfer: true,
      confirmedCosts: true,
    });
    const fake: import("../../lib/studio/provider").AIProvider = {
      async chat() {
        return {
          reply: "SYNTHETISCH Vorschlag: Maschinen im Einsatz zeigen.",
          usage: {},
          requestId: "synthetic-context",
        };
      },
      async text() {
        throw new Error("Unexpected text call");
      },
      async image() {
        throw new Error("Unexpected image call");
      },
    };
    const previousJob = await studio.queueJob(martin, request(previous.id));
    await studio.runJob(martin, previousJob.id, fake, testStore);
    const current = await studio.createSeries(martin, {
      ...studioBrief(),
      customerId: a.id,
    });
    const job = await studio.queueJob(martin, request(current.id));
    await assistantContext.saveAssistantPreferences(martin, {
      revision: prefs.revision,
      text: "Neue Arbeitsweise nach Auftragserteilung",
    });
    await studio.runJob(
      martin,
      job.id,
      {
        ...fake,
        async chat(context) {
          const assistant = (
            context as {
              assistant: Awaited<
                ReturnType<typeof assistantContext.assistantContext>
              >;
            }
          ).assistant;
          assert.equal(assistant.user.name, user.name);
          assert.equal(assistant.user.preferences, prefs.text);
          assert.equal(
            assistant.customer?.knowledge.offers,
            "SYNTHETISCH Maschinenbau",
          );
          assert.deepEqual(
            assistant.projectMemory.map((project) => project.id),
            [previous.id],
          );
          assert.match(
            assistant.projectMemory[0].lastProposal,
            /Maschinen im Einsatz/,
          );
          assert.ok(!JSON.stringify(assistant).includes(excluded.title));
          assert.ok(!JSON.stringify(assistant).includes(internal.title));
          const org = await db.studioOrganization.findUniqueOrThrow({
            where: { id: "studiojeker" },
          });
          assert.equal(assistant.organization.name, org.name);
          assert.deepEqual(
            assistant.organization.profile.services,
            (org.brand as { services: string }).services || "",
          );
          return {
            reply: "SYNTHETISCH Fortsetzung",
            usage: {},
            requestId: "synthetic-recall",
          };
        },
      },
      testStore,
    );
    assert.equal(
      (await db.studioJob.findUniqueOrThrow({ where: { id: job.id } })).status,
      "SUCCEEDED",
    );
    const noMemory = await studio.queueJob(martin, {
      ...request(current.id),
      useProjectMemory: false,
    });
    await studio.runJob(
      martin,
      noMemory.id,
      {
        ...fake,
        async chat(context) {
          const assistant = (
            context as {
              assistant: Awaited<
                ReturnType<typeof assistantContext.assistantContext>
              >;
            }
          ).assistant;
          assert.deepEqual(assistant.projectMemory, []);
          assert.equal(
            assistant.user.preferences,
            "Neue Arbeitsweise nach Auftragserteilung",
          );
          return {
            reply: "SYNTHETISCH Ohne andere Projekte",
            usage: {},
            requestId: "synthetic-no-memory",
          };
        },
      },
      testStore,
    );
    assert.equal(
      (await db.studioJob.findUniqueOrThrow({ where: { id: noMemory.id } }))
        .status,
      "SUCCEEDED",
    );
    // Reading another actor's state never returns this user's private preferences.
    assert.equal((await studio.studioState(nora)).assistantUser.id, nora);
  } finally {
    envNames.forEach((key, index) => {
      if (old[index] === undefined) delete process.env[key];
      else process.env[key] = old[index];
    });
  }
});

test("Chat follow-up: exact proposal snapshot, same-series access and explicit image execution", async () => {
  const names = [
    "OPENAI_API_KEY",
    "CONTENT_AI_ENABLED",
    "CONTENT_DAILY_REQUEST_LIMIT",
    "CONTENT_DAILY_BUDGET_USD",
    "STUDIO_LOCAL_ASSETS",
  ];
  const old = names.map((key) => process.env[key]);
  Object.assign(process.env, {
    OPENAI_API_KEY: "synthetic",
    CONTENT_AI_ENABLED: "true",
    CONTENT_DAILY_REQUEST_LIMIT: "1000",
    CONTENT_DAILY_BUDGET_USD: "1000",
    STUDIO_LOCAL_ASSETS: "true",
  });
  try {
    const { randomUUID } = await import("node:crypto");
    const source = await testMotif();
    const s = await studio.createSeries(martin, studioBrief());
    const base = {
      seriesId: s.id,
      kind: "CHAT",
      message: "Wie kann ich das Bild optimieren?",
      contentId: null,
      requestKey: randomUUID(),
      referenceIds: [source.id],
      referenceRights: true,
      referenceTransfer: true,
      confirmedCosts: true,
    };
    const proposal = await studio.queueJob(martin, base);
    const reply = "Schatten aufhellen, eine dezente Vignette ergänzen.";
    await studio.runJob(
      martin,
      proposal.id,
      {
        async chat() {
          return { reply, usage: {}, requestId: "synthetic-proposal" };
        },
        async text() {
          throw new Error("Unexpected text call");
        },
        async image() {
          throw new Error("Unexpected image call");
        },
      },
      testStore,
    );
    const request = {
      ...base,
      kind: "IMAGE",
      photoEdit: true,
      message: "Bitte so ausführen.",
      replyToJobId: proposal.id,
      requestKey: randomUUID(),
    };
    await assert.rejects(
      studio.queueJob(martin, { ...request, replyToJobId: "inaccessible-job" }),
      /nicht zugänglich/,
    );
    const otherSeries = await studio.createSeries(martin, studioBrief());
    await assert.rejects(
      studio.queueJob(martin, { ...request, seriesId: otherSeries.id }),
      /nicht zugänglich/,
    );
    const edit = await studio.queueJob(martin, request);
    assert.equal((await studio.queueJob(martin, request)).id, edit.id);
    // A later change must not alter the instruction that was confirmed and queued.
    await db.studioJob.update({
      where: { id: proposal.id },
      data: { result: { reply: "Anderer Vorschlag" } },
    });
    const original = await studioAssets.readAsset(martin, source.id, testStore);
    let imageCalls = 0;
    await studio.runJob(
      martin,
      edit.id,
      {
        async text() {
          throw new Error("Unexpected text call");
        },
        async image(prompt, _model, refs, options) {
          imageCalls++;
          assert.ok(prompt.includes(reply));
          assert.ok(prompt.includes(request.message));
          assert.ok(!prompt.includes("Anderer Vorschlag"));
          assert.equal(options?.edit, true);
          assert.deepEqual(refs[0].bytes, original.bytes);
          return {
            bytes: await sharp(original.bytes)
              .modulate({ brightness: 1.15 })
              .png()
              .toBuffer(),
            requestId: "synthetic-execution",
            usage: {},
          };
        },
      },
      testStore,
    );
    assert.equal(imageCalls, 1);
    const followup = await studio.queueJob(martin, {
      ...base,
      referenceIds: [],
      message: "Bitte die Vignette weglassen.",
      replyToJobId: proposal.id,
      requestKey: randomUUID(),
    });
    await studio.runJob(
      martin,
      followup.id,
      {
        async chat(_context, messages) {
          const last = messages[messages.length - 1].content;
          assert.ok(last.includes("Anderer Vorschlag"));
          assert.ok(last.includes("Bitte die Vignette weglassen."));
          return {
            reply: "Angepasster Vorschlag",
            usage: {},
            requestId: "synthetic-followup",
          };
        },
        async text() {
          throw new Error("Unexpected text call");
        },
        async image() {
          throw new Error("Unexpected image call");
        },
      },
      testStore,
    );
  } finally {
    names.forEach((key, index) => {
      if (old[index] === undefined) delete process.env[key];
      else process.env[key] = old[index];
    });
  }
});

test("Photo edit: selected source, separate result, explicit version adoption and stale version protection", async () => {
  const names = [
    "OPENAI_API_KEY",
    "CONTENT_AI_ENABLED",
    "CONTENT_DAILY_REQUEST_LIMIT",
    "CONTENT_DAILY_BUDGET_USD",
    "STUDIO_LOCAL_ASSETS",
  ];
  const old = names.map((k) => process.env[k]);
  Object.assign(process.env, {
    OPENAI_API_KEY: "synthetic",
    CONTENT_AI_ENABLED: "true",
    CONTENT_DAILY_REQUEST_LIMIT: "1000",
    CONTENT_DAILY_BUDGET_USD: "1000",
    STUDIO_LOCAL_ASSETS: "true",
  });
  try {
    const { randomUUID } = await import("node:crypto");
    const source = await testMotif();
    const original = await studioAssets.readAsset(martin, source.id, testStore);
    const s = await studio.createSeries(martin, studioBrief());
    const request = {
      seriesId: s.id,
      kind: "IMAGE",
      photoEdit: true,
      message: "Schatten aufhellen",
      contentId: null,
      requestKey: randomUUID(),
      referenceIds: [source.id],
      referenceRights: true,
      referenceTransfer: true,
      confirmedCosts: true,
    };
    await assert.rejects(
      studio.queueJob(martin, { ...request, referenceIds: [] }),
      /genau ein/,
    );
    await assert.rejects(
      studio.queueJob(martin, {
        ...request,
        referenceIds: [source.id, source.id],
      }),
      /genau ein/,
    );
    await assert.rejects(
      studio.queueJob(martin, { ...request, referenceIds: ["foreign-asset"] }),
      /nicht zugänglich/,
    );
    await assert.rejects(
      studio.queueJob(martin, { ...request, referenceTransfer: false }),
      /ausdrücklich/,
    );
    const j = await studio.queueJob(martin, request);
    assert.equal(j.reserveUsd, 0.25);
    assert.equal((await studio.queueJob(martin, request)).id, j.id);
    const edited = await sharp(original.bytes)
      .modulate({ brightness: 1.3 })
      .png()
      .toBuffer();
    let calls = 0;
    const provider: import("../../lib/studio/provider").AIProvider = {
      async text() {
        throw new Error("No text call");
      },
      async image(prompt, _model, refs, options) {
        calls++;
        assert.equal(prompt, request.message);
        assert.equal(options?.edit, true);
        assert.equal(refs.length, 1);
        assert.deepEqual(refs[0].bytes, original.bytes);
        return { bytes: edited, requestId: "synthetic-photo", usage: {} };
      },
    };
    await studio.runJob(martin, j.id, provider, testStore);
    const done = await db.studioJob.findUniqueOrThrow({ where: { id: j.id } });
    assert.equal(done.status, "SUCCEEDED");
    const result = done.result as { assetId: string; sourceAssetIds: string[] };
    assert.notEqual(result.assetId, source.id);
    assert.deepEqual(result.sourceAssetIds, [source.id]);
    assert.deepEqual(
      (await studioAssets.readAsset(martin, source.id, testStore)).bytes,
      original.bytes,
    );
    assert.equal((await studioContent(s.id)).version, 1);
    await studio.applyJob(martin, j.id);
    const c = await studioContent(s.id);
    assert.equal(c.version, 2);
    assert.equal(
      studioContentInput.parse(c.versions[0].payload).studio?.motifAssetId,
      result.assetId,
    );
    await assert.rejects(
      studio.runJob(martin, j.id, provider, testStore),
      /bereits gestartet/,
    );
    await assert.rejects(studio.applyJob(martin, j.id), /noch nicht/);
    const stale = await studio.queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
    });
    await studio.runJob(martin, stale.id, provider, testStore);
    const p = studioContentInput.parse(c.versions[0].payload);
    await hub.saveContent(
      martin,
      { ...p, title: "Manuell verändert" },
      c.id,
      c.version,
    );
    await assert.rejects(
      studio.applyJob(martin, stale.id),
      /seit Auftrag geändert/,
    );
    const archived = await studio.queueJob(martin, {
      ...request,
      requestKey: randomUUID(),
    });
    await db.libraryItem.updateMany({
      where: { assetId: source.id },
      data: { archivedAt: new Date() },
    });
    await studio.runJob(martin, archived.id, provider, testStore);
    assert.equal(
      (await db.studioJob.findUniqueOrThrow({ where: { id: archived.id } }))
        .status,
      "FAILED",
    );
    assert.equal(calls, 2);
    await db.libraryItem.updateMany({
      where: { assetId: source.id },
      data: { archivedAt: null },
    });
  } finally {
    names.forEach((k, i) => {
      if (old[i] === undefined) delete process.env[k];
      else process.env[k] = old[i];
    });
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
  const { newsletterLibrary } = await import("../../lib/hub/newsletter-template");
  assert.equal(first.imported, newsletterLibrary.length);
  assert.equal(first.ids.length, newsletterLibrary.length);
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
