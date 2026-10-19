import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  verifiedContact,
  legalAllowed,
  normalizeEmail,
  personKey,
  messageHash,
  assertExternalSendingAllowed,
} from "../lib/policy";
import { parseImport, validateRows } from "../lib/import";
import { hashPassword, checkPassword } from "../lib/auth";
import { createMetanetTransport, renderLocalMessage } from "../lib/mail";
import type { Contact } from "@prisma/client";
import { generateDraft, importedDraft } from "../lib/generation";
import { sendInternalSmtpTest } from "../lib/smtp-test";
import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

test("Separate SMTP-Testmail bindet Empfänger, bestätigt Versand und verhindert Wiederholung", async () => {
  const env = {
    MAIL_MODE: "test",
    ENABLE_EMAIL_SENDING: "true",
    SMTP_CONFIGURATION_CONFIRMED: "true",
    SMTP_HOST: "jovinus.metanet.ch",
    SMTP_USER: "njeker@studiojeker.ch",
    MAIL_FROM: "njeker@studiojeker.ch",
    SMTP_PASSWORD: "synthetic-test-only",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    TEST_MAIL_RECIPIENTS: "njeker@studiojeker.ch",
    NODE_ENV: "test",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, env);
  type Entry = { action: string; entityId: string; createdAt?: Date };
  const records: Entry[] = [];
  let active = true;
  const audit = {
    async findFirst({
      where,
    }: {
      where: { action: string; entityId?: string; createdAt?: { gte: Date } };
    }) {
      return (
        records.find(
          (r) =>
            r.action === where.action &&
            (!where.entityId || r.entityId === where.entityId) &&
            (!where.createdAt || r.createdAt! >= where.createdAt.gte),
        ) ?? null
      );
    },
    async create({ data }: { data: Entry }) {
      records.push({ ...data, createdAt: new Date() });
      return data;
    },
  };
  const tx = {
    audit,
    user: {
      async findFirst() {
        return active
          ? { name: "Martin Jeker", email: "martin@example.test", active: true }
          : null;
      },
    },
    async $executeRaw() {},
  };
  const client = {
    audit,
    async $transaction(fn: (value: typeof tx) => Promise<void>) {
      return fn(tx);
    },
  } as unknown as PrismaClient;
  let sends = 0;
  const sender: import("../lib/mail").SmtpSender = async (message) => {
    sends++;
    assert.deepEqual(message.envelopeRecipients, ["njeker@studiojeker.ch"]);
    assert.equal(message.recipient, "njeker@studiojeker.ch");
    assert.equal(message.test, true);
    assert.match(message.body, /interne Testmail/);
    assert.equal(records.at(-1)?.action, "SMTP_TEST_STARTED");
    return { accepted: ["njeker@studiojeker.ch"], rejected: [] };
  };
  const request = { requestId: randomUUID(), confirmed: true };
  try {
    for (const mode of ["disabled", "production"]) {
      process.env.MAIL_MODE = mode;
      await assert.rejects(
        sendInternalSmtpTest("martin", request, sender, client),
      );
    }
    process.env.MAIL_MODE = "test";
    process.env.TEST_MAIL_RECIPIENTS = "other@studiojeker.ch";
    await assert.rejects(
      sendInternalSmtpTest("martin", request, sender, client),
    );
    process.env.TEST_MAIL_RECIPIENTS = env.TEST_MAIL_RECIPIENTS;
    await assert.rejects(
      sendInternalSmtpTest(
        "martin",
        { ...request, confirmed: false },
        sender,
        client,
      ),
    );
    await assert.rejects(
      sendInternalSmtpTest(
        "martin",
        { ...request, recipient: "outside@example.test" },
        sender,
        client,
      ),
    );
    active = false;
    await assert.rejects(
      sendInternalSmtpTest("martin", request, sender, client),
    );
    active = true;
    assert.equal(sends, 0);
    await sendInternalSmtpTest("martin", request, sender, client);
    assert.equal(records.at(-1)?.action, "SMTP_TEST_ACCEPTED");
    await assert.rejects(
      sendInternalSmtpTest("martin", request, sender, client),
      /bereits gestartet/,
    );
    await assert.rejects(
      sendInternalSmtpTest(
        "martin",
        { ...request, requestId: randomUUID() },
        sender,
        client,
      ),
      /Minute/,
    );
    assert.equal(sends, 1);
    records.length = 0;
    const failed = { ...request, requestId: randomUUID() };
    await assert.rejects(
      sendInternalSmtpTest(
        "martin",
        failed,
        async () => {
          throw new Error("secret must not escape");
        },
        client,
      ),
      /nicht bestätigt/,
    );
    assert.equal(records.at(-1)?.action, "SMTP_TEST_UNCERTAIN");
    await assert.rejects(
      sendInternalSmtpTest("martin", failed, sender, client),
      /bereits gestartet/,
    );
    assert.equal(sends, 1);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
const base = {
  email: "anna.muster@example.test",
  confidence: "VERIFIED",
  verifiedAt: new Date("2026-01-01"),
  sourceUrl: "https://example.test/source",
  hook: "Dokumentierte Recherche.",
  status: "VERIFIED",
};
const architectureBody = `Guten Tag Frau Muster

Studiojeker unterstützt Architekturbüros mit 3D-Visualisierungen, Architekturfotografie und Projektfilmen.

Wäre ein kurzer Austausch interessant?

Freundliche Grüsse
Nora Jeker
Studiojeker
studiojeker.ch`;
const architectureNotes = `Originalname: Anna Muster
Prüfstatus: Persönliche Adresse und Rolle auf offizieller Website veröffentlicht
Prüfdatum: 01.01.2026
Newsletter-Einwilligung: Keine Einwilligung dokumentiert
Akquise-Status: ENTWURF – NICHT VERSENDEN
Betreff: Architektur und Projekte sichtbar machen
E-Mail-Entwurf: ${architectureBody}
Herkunft: Recherche 01.01.2026
Hinweise: Vor Versand erneut prüfen; keine Newsletter-Einwilligung.`;
const architectureContact = {
  ...base,
  organisation: "Beispiel Architekten AG",
  firstName: "Anna",
  lastName: "Muster",
  industry: "",
  service: "",
  notes: architectureNotes,
} as Contact;

test("Bestehender importierter Mailtext hat Vorrang und enthält keine internen Metadaten", async () => {
  const generated = await generateDraft(architectureContact, {
    async generate() {
      throw new Error("Importierten Text nicht neu generieren");
    },
  });
  assert.deepEqual(generated, {
    subject: "Architektur und Projekte sichtbar machen",
    body: architectureBody,
  });
  assert.doesNotMatch(
    generated.body,
    /Herkunft:|Hinweise:|Prüfstatus:|Akquise-Status:/,
  );
  assert.equal(architectureContact.notes, architectureNotes);
});
test("Beide Masterlisten-Betreffnamen und Windows-Zeilenumbrüche bleiben lesbar", () => {
  const notes = architectureNotes
    .replace("Betreff:", "E-Mail-Betreff:")
    .replaceAll("\n", "\r\n");
  assert.equal(importedDraft(notes)?.body, architectureBody);
  assert.equal(
    importedDraft(`Betreff: Architektur\nE-Mail-Entwurf:\n${architectureBody}`)
      ?.body,
    architectureBody,
  );
  assert.equal(importedDraft("Nur eine interne Recherche-Notiz."), null);
});
test("Unvollständige oder mehrdeutige importierte Entwürfe werden nicht still ersetzt", () => {
  for (const notes of [
    "Betreff: Architektur",
    "E-Mail-Entwurf: Text",
    "Betreff: \nE-Mail-Entwurf: Text",
    "Betreff: Architektur\nE-Mail-Entwurf:\nHinweise: Intern",
    architectureNotes + "\nBetreff: Zweiter Betreff",
    architectureNotes + "\nE-Mail-Entwurf: Zweiter Text",
    `Betreff: ${"x".repeat(251)}\nE-Mail-Entwurf: Text`,
  ])
    assert.throws(() => importedDraft(notes), /Importierter Mailentwurf/);
});
test("Auch importierte Mailtexte umgehen keine Kontaktprüfung", async () => {
  await assert.rejects(
    generateDraft({ ...architectureContact, confidence: "UNCONFIRMED" }),
  );
  await assert.rejects(
    generateDraft({ ...architectureContact, status: "DO_NOT_CONTACT" }),
  );
});
test("Lokale Vorlage erkennt Architekten bei leerer Branche im Organisationsnamen", async () => {
  const generated = await generateDraft({ ...architectureContact, notes: "" });
  assert.match(generated.subject, /Architekturvisualisierungen/);
  assert.doesNotMatch(generated.body, /Businessfotografie/);
  const explicit = await generateDraft({
    ...architectureContact,
    notes: "",
    service: "Projektfilmen",
  });
  assert.match(explicit.body, /Projektfilmen/);
  const industry = await generateDraft({
    ...architectureContact,
    notes: "",
    industry: "Industrie",
  });
  assert.match(industry.body, /Businessfotografie/);
});
test("Kontakte ohne Adresse bleiben für Entwurf und Freigabe gesperrt", () => {
  assert.throws(() => verifiedContact({ ...base, email: "" }));
});

test("Drive-Masterliste übernimmt alle Personen, auch ohne oder mit gemeinsamer Adresse", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Kontakte");
  sheet.addRow([
    "Person",
    "Funktion",
    "Organisation",
    "Ort",
    "E-Mail",
    "Prüfstatus",
    "Prüfdatum",
    "Priorität",
    "Quellen-URL",
    "Newsletter-Einwilligung",
    "Akquise-Status",
    "Betreff",
    "E-Mail-Entwurf",
    "Herkunft",
    "Hinweise",
  ]);
  for (let i = 0; i < 179; i++) {
    sheet.addRow([
      `Anna Person${i}`,
      "Leitung",
      "Test AG",
      "Bern",
      i < 8 ? "" : i < 11 ? "shared@example.test" : `p${i}@example.test`,
      "Aktuell offiziell",
      "2026-10-19",
      "A",
      "https://example.test",
      "Ja",
      "Freigegeben",
      "Betreff",
      "Entwurf",
      "Drive",
      "Notiz",
    ]);
  }
  book.addWorksheet("Mailverwaltung").addRow(["Nicht importieren"]);
  sheet.getCell("I2").value = {
    text: "https://example.test",
    hyperlink: "https://example.test",
  };
  const rows = await parseImport(
    Buffer.from(await book.xlsx.writeBuffer()),
    "drive.xlsx",
  );
  assert.equal(rows.length, 179);
  assert.equal(rows.filter((r) => !r.email).length, 8);
  assert.equal(
    new Set(rows.filter((r) => r.email).map((r) => r.email)).size,
    169,
  );
  assert.ok(
    rows.every((r) => !r.newsletterConsent && r.confidence === "UNCONFIRMED"),
  );
  assert.match(rows[0].notes, /Herkunft: Drive/);
  assert.match(rows[0].notes, /E-Mail-Entwurf: Entwurf/);
  assert.deepEqual(await generateDraft({ ...rows[8], ...base } as Contact), {
    subject: "Betreff",
    body: "Entwurf",
  });
  sheet.getCell("A2").value = { formula: "1+1", result: 2 };
  await assert.rejects(
    parseImport(Buffer.from(await book.xlsx.writeBuffer()), "drive.xlsx"),
    /Formeln/,
  );
});
test("Nur individuell verifizierte Kontakte sind freigabefähig", () => {
  assert.doesNotThrow(() => verifiedContact(base));
  for (const confidence of ["UNCONFIRMED", "ESTIMATED", "GENERAL"])
    assert.throws(() => verifiedContact({ ...base, confidence }));
  for (const email of [
    "info@example.test",
    "kontakt@example.test",
    "office.team@example.test",
    "sales@example.test",
  ])
    assert.throws(() => verifiedContact({ ...base, email }));
  assert.throws(() => verifiedContact({ ...base, verifiedAt: null }));
  assert.throws(() => verifiedContact({ ...base, status: "DO_NOT_CONTACT" }));
});
test("Rechtliche Prüfung bleibt separat und revisionsgebunden", () => {
  const r = {
    allowed: true,
    contactRevision: 2,
    procurementReviewed: false,
    rationale: "Dokumentierter synthetischer Nachweis.",
  };
  assert.doesNotThrow(() => legalAllowed(r, 2, false));
  assert.throws(() => legalAllowed(null, 2, false));
  assert.throws(() => legalAllowed(r, 3, false));
  assert.throws(() => legalAllowed(r, 2, true));
  assert.doesNotThrow(() =>
    legalAllowed({ ...r, procurementReviewed: true }, 2, true),
  );
});
test("Dublettenschlüssel normalisieren Schreibweisen", () => {
  assert.equal(
    normalizeEmail(" Anna.Muster@EXAMPLE.TEST "),
    "anna.muster@example.test",
  );
  assert.equal(
    personKey(" Anna ", "MUSTER", " Test  AG "),
    personKey("anna", "Muster", "test ag"),
  );
});
test("Alle Nachrichtenteile sind im Freigabehash enthalten", () => {
  const hash = messageHash(base.email, "Betreff", "Text");
  assert.notEqual(hash, messageHash("anders@example.test", "Betreff", "Text"));
  assert.notEqual(hash, messageHash(base.email, "Neu", "Text"));
  assert.notEqual(hash, messageHash(base.email, "Betreff", "Neu"));
});
test("Individuelle Passwörter sind gesalzen und sicher geprüft", () => {
  const password = "synthetisches-passwort-123";
  const a = hashPassword(password),
    b = hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(checkPassword(password, a));
  assert.equal(checkPassword("falsch", a), false);
  assert.throws(() => hashPassword("kurz"));
});
test("SMTP bleibt auch mit aktivierter Umgebungsvariable blockiert", () => {
  process.env.ENABLE_EMAIL_SENDING = "true";
  assert.throws(() => assertExternalSendingAllowed(), /deaktiviert/);
  assert.throws(() => createMetanetTransport(), /deaktiviert/);
  process.env.ENABLE_EMAIL_SENDING = "false";
});
test("Lokale Simulation erstellt MIME ohne SMTP-Verbindung", async () => {
  const mime = await renderLocalMessage({
    recipient: base.email,
    subject: "Synthetischer Test",
    body: "Keine echte Nachricht.",
    messageId: "<test@example.test>",
  });
  assert.match(mime, /Message-ID: <test@example.test>/);
  assert.match(mime, /Keine echte Nachricht/);
});
const csv =
  "organisation,firstName,lastName,email\nTest AG,Anna,Muster,anna.muster@example.test\n";
test("CSV importiert nur Kontakte und keine Einwilligungen oder Versandstatus", async () => {
  const rows = await parseImport(Buffer.from(csv), "test.csv");
  assert.equal(rows[0].confidence, "UNCONFIRMED");
  assert.equal(rows[0].newsletterConsent, false);
  for (const col of ["status", "newsletterConsent", "confidence", "verifiedAt"])
    await assert.rejects(
      parseImport(
        Buffer.from(
          csv
            .replace("email\n", `email,${col}\n`)
            .replace("example.test\n", "example.test,APPROVED\n"),
        ),
        "test.csv",
      ),
    );
});
test("Import blockiert Dubletten, Formeln, unerlaubte URLs und Übergrösse", async () => {
  await assert.rejects(
    parseImport(Buffer.from(csv + csv.split("\n")[1] + "\n"), "test.csv"),
    /Dublette/,
  );
  await assert.rejects(
    parseImport(
      Buffer.from(csv.replace("Test AG", '=HYPERLINK("bad")')),
      "test.csv",
    ),
  );
  await assert.rejects(parseImport(Buffer.alloc(2097153), "test.csv"));
  assert.throws(() =>
    validateRows([
      {
        organisation: "Test",
        firstName: "Anna",
        lastName: "Test",
        email: base.email,
        website: "javascript:alert(1)",
      },
    ]),
  );
  await assert.rejects(parseImport(Buffer.from(csv), "test.exe"));
  assert.throws(() => validateRows(Array.from({ length: 501 }, () => ({}))));
});
test("XLSX akzeptiert Text und blockiert Formeln", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Kontakte");
  sheet.addRow(["organisation", "firstName", "lastName", "email"]);
  sheet.addRow(["Test AG", "Anna", "Muster", base.email]);
  const rows = await parseImport(
    Buffer.from(await book.xlsx.writeBuffer()),
    "test.xlsx",
  );
  assert.equal(rows.length, 1);
  sheet.getCell("A2").value = { formula: "1+1", result: 2 };
  await assert.rejects(
    parseImport(Buffer.from(await book.xlsx.writeBuffer()), "test.xlsx"),
    /Formeln/,
  );
});

test("Masterliste mit mehreren Blättern und x:-Namespace importiert nur Kontakte", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Masterkontakte");
  sheet.addRow([
    "Person",
    "Funktion",
    "Organisation",
    "Ort",
    "Direkte E-Mail",
    "Prüfstatus",
    "Prüfdatum",
    "Priorität",
    "Kontaktrolle",
    "Kontaktstrategie",
    "Studiojeker-Anknüpfungspunkt",
    "Quellen-URL",
    "Newsletter-Einwilligung",
    "Akquise-Status",
    "E-Mail-Betreff",
    "E-Mail-Entwurf",
  ]);
  sheet.addRow([
    "Anna Beispiel",
    "Leitung",
    "Beispiel AG",
    "Solothurn",
    "anna@example.test",
    "Aktuell offiziell",
    "2026-10-15",
    "A",
    "Leitung",
    "Erstkontakt",
    "Synthetischer Anknüpfungspunkt",
    "https://example.test/quelle",
    "Nicht belegt",
    "Nicht kontaktiert",
    "Betreff",
    "Entwurf",
  ]);
  sheet.addRow(["Ohne E-Mail", "", "Zweite AG", "Solothurn"]);
  book.addWorksheet("Übersicht").addRow(["Nur Übersicht"]);
  const zip = await JSZip.loadAsync(await book.xlsx.writeBuffer());
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith("xl/") || !name.endsWith(".xml")) continue;
    const xml = await zip.file(name)!.async("string");
    if (
      !xml.includes(
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      )
    )
      continue;
    zip.file(
      name,
      xml
        .replace(/<(\/?)([A-Za-z][\w.-]*)(?=[\s/>])/g, "<$1x:$2")
        .replaceAll(
          'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
          'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        ),
    );
  }
  const rows = await parseImport(
    await zip.generateAsync({ type: "nodebuffer" }),
    "master.xlsx",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].email, "");
  assert.equal(rows[0].email, "anna@example.test");
  assert.equal(rows[0].newsletterConsent, false);
  assert.equal(rows[0].confidence, "UNCONFIRMED");
  assert.match(rows[0].notes, /Nicht belegt/);
  assert.deepEqual(await generateDraft({ ...rows[0], ...base } as Contact), {
    subject: "Betreff",
    body: "Entwurf",
  });
});
