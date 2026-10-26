import { test } from "node:test";
import assert from "node:assert/strict";
import type { Contact } from "@prisma/client";
import { contactPreparation } from "../lib/contact-preparation";

import { normalizeSourceUrl, sourceUrlIssue } from "../lib/contact-source-url";

const notes =
  "Prüfstatus: Persönliche Adresse und Rolle auf offizieller Website veröffentlicht\nPrüfdatum: 17.10.2026\nNewsletter-Einwilligung: Keine Einwilligung dokumentiert\nBetreff: Architektur sichtbar machen\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nIhr dokumentiertes Architekturprojekt in Burgdorf.\n\nGerne zeigen wir Beispiele.\n\nFreundliche Grüsse\nNora Jeker\nHinweise: Vor Versand erneut prüfen";
const contact = {
  id: "synthetic",
  revision: 1,
  organisation: "Synthetisches Atelier",
  firstName: "Anna",
  lastName: "Muster",
  email: "anna@example.test",
  sourceUrl: "https://example.test/team",
  hook: "",
  verifiedAt: null,
  confidence: "UNCONFIRMED",
  status: "NEW",
  notes,
} as Contact;
const now = new Date("2026-10-20T12:00:00Z");
test("Vorhandene Notizen ergeben einen Vorschlag ohne Änderung des Originals oder Einwilligung", () => {
  const p = contactPreparation(contact, now);
  assert.equal(p.ready, true);
  assert.deepEqual(p.patch, {
    verifiedAt: "2026-10-17T00:00:00.000Z",
    confidence: "VERIFIED",
    hook: "Ihr dokumentiertes Architekturprojekt in Burgdorf.",
  });
  assert.equal(contact.confidence, "UNCONFIRMED");
  assert.equal(contact.verifiedAt, null);
  assert.match(p.origins.join(" "), /bitte inhaltlich prüfen/);
  assert.ok(!("newsletterConsent" in p.patch));
});
test("Befüllte Felder und abweichende Vertrauensstatus werden nicht überschrieben", () => {
  const c = {
    ...contact,
    verifiedAt: new Date("2026-09-01"),
    confidence: "ESTIMATED" as const,
    hook: "Manuell geprüfter Anknüpfungspunkt",
  };
  const p = contactPreparation(c, now);
  assert.deepEqual(p.patch, {});
  assert.equal(p.values.hook, c.hook);
  assert.equal(p.ready, false);
});
test("Ungültige, zukünftige oder mehrdeutige Daten bleiben als Lücke sichtbar", () => {
  for (const date of [
    "31.02.2026",
    "21.10.2026",
    "unbekannt",
    "17.10.2026\nPrüfdatum: 16.10.2026",
  ]) {
    const p = contactPreparation(
      { ...contact, notes: notes.replace("17.10.2026", date) },
      now,
    );
    assert.equal(p.patch.verifiedAt, undefined);
    assert.equal(p.ready, false);
    assert.match(p.issues.join(" "), /Verifikationsdatum/);
  }
});
test("Öffentliche Quelle, Newsletter und schwache Aussagen verifizieren keine persönliche Adresse", () => {
  for (const status of [
    "Ungeprüft",
    "Nicht verifiziert",
    "Adresse vermutlich richtig",
    "Newsletter-Abonnent",
  ]) {
    const p = contactPreparation(
      {
        ...contact,
        notes: notes.replace(
          "Persönliche Adresse und Rolle auf offizieller Website veröffentlicht",
          status,
        ),
      },
      now,
    );
    assert.equal(p.patch.confidence, undefined);
    assert.equal(p.ready, false);
  }
});
test("Nur eindeutige HTTP(S)-Quelle und expliziter Anknüpfungspunkt werden übernommen", () => {
  const c = {
    ...contact,
    sourceUrl: "",
    notes:
      "Quellen-URL: https://example.test/source\nStudiojeker-Anknüpfungspunkt: Bestehendes dokumentiertes Projekt\n" +
      notes,
  };
  const p = contactPreparation(c, now);
  assert.equal(p.patch.sourceUrl, "https://example.test/source");
  assert.equal(p.patch.hook, "Bestehendes dokumentiertes Projekt");
  assert.equal(
    contactPreparation(
      {
        ...c,
        notes: c.notes.replace(
          "https://example.test/source",
          "javascript:alert(1)",
        ),
      },
      now,
    ).patch.sourceUrl,
    undefined,
  );
  assert.equal(
    contactPreparation(
      { ...c, notes: "Quellen-URL: https://example.test/other\n" + c.notes },
      now,
    ).patch.sourceUrl,
    undefined,
  );
});
test("Sperren und allgemeine Adressen bleiben blockiert; Signatur allein ist kein Anknüpfungspunkt", () => {
  assert.equal(
    contactPreparation({ ...contact, status: "DO_NOT_CONTACT" }, now).ready,
    false,
  );
  assert.equal(
    contactPreparation({ ...contact, email: "info@example.test" }, now).ready,
    false,
  );
  assert.equal(
    contactPreparation(
      {
        ...contact,
        notes: notes.replace(
          "Ihr dokumentiertes Architekturprojekt in Burgdorf.\n\nGerne zeigen wir Beispiele.\n\n",
          "",
        ),
      },
      now,
    ).patch.hook,
    undefined,
  );
});

test("Gemeinsame Angaben füllen Lücken, Notizen und Bestandswerte behalten Vorrang", () => {
  const shared = {
    confidence: "VERIFIED" as const,
    sourceUrl: "https://example.test/liste",
    verifiedAt: "2026-01-02T00:00:00.000Z",
    hook: "Gemeinsam dokumentierter Bezug",
  };
  const gap = { ...contact, notes: "", sourceUrl: "" };
  const p = contactPreparation(gap, now, { shared });
  assert.equal(p.ready, true);
  assert.deepEqual(p.patch, shared);
  const fromNotes = contactPreparation(contact, now, { shared });
  assert.equal(fromNotes.values.verifiedAt, "2026-10-17T00:00:00.000Z");
  assert.equal(fromNotes.values.sourceUrl, contact.sourceUrl);
  assert.equal(
    fromNotes.values.hook,
    "Ihr dokumentiertes Architekturprojekt in Burgdorf.",
  );
  assert.equal(
    contactPreparation({ ...gap, confidence: "GENERAL" }, now, { shared })
      .values.confidence,
    "GENERAL",
  );
  assert.equal(
    contactPreparation({ ...gap, status: "DO_NOT_CONTACT" }, now, { shared })
      .ready,
    false,
  );
  assert.equal(
    contactPreparation({ ...gap, email: "info@example.test" }, now, { shared })
      .ready,
    false,
  );
});
test("Einzelkorrekturen in der Sammelansicht ersetzen nur ausdrücklich bearbeitete Felder", () => {
  const p = contactPreparation(contact, now, {
    shared: { hook: "Gemeinsame Angabe" },
    values: {
      hook: "Korrigierter individueller Bezug",
      sourceUrl: "https://example.test/korrigiert",
    },
  });
  assert.equal(p.ready, true);
  assert.equal(p.values.hook, "Korrigierter individueller Bezug");
  assert.equal(p.values.sourceUrl, "https://example.test/korrigiert");
  assert.equal(p.values.verifiedAt, "2026-10-17T00:00:00.000Z");
  assert.equal(
    contactPreparation(contact, now, { values: { hook: "" } }).ready,
    false,
  );
  assert.equal(
    contactPreparation(contact, now, {
      shared: { verifiedAt: "2027-01-01T00:00:00.000Z" },
      values: { verifiedAt: "2027-01-01T00:00:00.000Z" },
    }).ready,
    false,
  );
});

test("Quellenadressen akzeptieren übliche Eingaben und erklären ungültige Werte", () => {
  for (const [input, expected] of [
    [" studiojeker.ch ", "https://studiojeker.ch"],
    ["firma.ch/team?lang=de", "https://firma.ch/team?lang=de"],
    ["www.firma.ch", "https://www.firma.ch"],
    ["//firma.ch/team", "https://firma.ch/team"],
    ["firma.ch:443/team", "https://firma.ch:443/team"],
    ["http://firma.ch/team", "http://firma.ch/team"],
    ["", ""],
  ]) {
    assert.equal(normalizeSourceUrl(input), expected);
    assert.equal(sourceUrlIssue(input), null);
  }
  for (const invalid of [
    "keine adresse",
    "javascript:alert(1)",
    "mailto:test@firma.ch",
    "ftp://firma.ch",
    "https://",
    "https://user:password@firma.ch",
  ]) {
    assert.match(sourceUrlIssue(invalid)!, /gültige Website-Adresse/);
  }
});
