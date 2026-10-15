import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
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
const base = {
  email: "anna.muster@example.test",
  confidence: "VERIFIED",
  verifiedAt: new Date("2026-01-01"),
  sourceUrl: "https://example.test/source",
  hook: "Dokumentierte Recherche.",
  status: "VERIFIED",
};
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
