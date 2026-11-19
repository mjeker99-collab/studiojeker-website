import { test } from "node:test";
import assert from "node:assert/strict";
import { mapMasterSheet } from "../lib/sheet-master";

const headers = [
  "Person", "Funktion", "Organisation", "Ort", "E-Mail",
  "Prüfstatus", "Prüfdatum", "Priorität", "Quellen-URL",
  "Newsletter-Einwilligung", "Akquise-Status", "Betreff",
  "E-Mail-Entwurf", "Herkunft", "Hinweise",
];
test("German master sheet preserves draft but does not import approval or opt-in", () => {
  const rows = mapMasterSheet([headers, [
    "Dr. Anna Muster", "Leiterin Kommunikation", "Kanton Solothurn – Amt",
    "Solothurn", "anna@example.test", "Offiziell", "2026-10-21", "A",
    "https://example.test/team", "Keine Einwilligung", "ENTWURF – NICHT VERSENDEN",
    "Projektfilme", "Guten Tag Frau Muster\n\nEin konkretes Projekt.\n\nFreundliche Grüsse",
    "Recherche", "Beschaffungsrecht prüfen",
  ]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].firstName, "Anna");
  assert.equal(rows[0].lastName, "Muster");
  assert.equal(rows[0].legalCategory, "PUBLIC_AUTHORITY");
  assert.match(rows[0].notes, /Betreff: Projektfilme\nE-Mail-Entwurf: Guten Tag/);
  assert.ok(!("newsletterConsent" in rows[0]));
  assert.ok(!("status" in rows[0]));
  assert.ok(!("verifiedAt" in rows[0]));
});
test("Contacts without direct email remain research contacts", () => {
  const rows = mapMasterSheet([headers, [
    "Bruno Beispiel", "Amtsleiter", "Kanton Solothurn – Amt", "Solothurn", "",
  ]]);
  assert.equal(rows[0].email, "");
});
test("Wrong or incomplete sheet headers fail closed", () => {
  assert.throws(() => mapMasterSheet([headers.slice(0, 14)]), /15 Spalten/);
  assert.throws(() => mapMasterSheet([headers.map((h, i) => i === 4 ? "Direktadresse" : h)]), /15 Spalten/);
});

test("Duplicate people across organisation variants retain the better documented draft", () => {
  const rows = mapMasterSheet([
    headers,
    ["Karin Rickli", "Marketing", "Regiobank", "Solothurn", "karin@example.test"],
    ["Karin Rickli", "Marketing", "Regiobank Solothurn", "Solothurn",
      "karin@example.test", "Offiziell", "2026-10-16", "A",
      "https://example.test/team", "Keine Einwilligung", "Nicht versenden",
      "Persönlicher Betreff", "Guten Tag Frau Rickli\\n\\nEin konkreter Bezug."],
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].organisation, "Regiobank Solothurn");
  assert.match(rows[0].notes, /Persönlicher Betreff/);
});

test("Unassigned companies and info@ addresses cannot block or enter the sync", () => {
  const rows = mapMasterSheet([
    headers,
    ["", "", "Unternehmen ohne namentlichen Kontakt", "Olten", "marketing@example.test"],
    ["Max Muster", "Einkauf", "Unzulässige Infoadresse AG", "Biel", "info@example.test"],
    ["Anna Beispiel", "Marketing", "Gültiges Unternehmen AG", "Bern", "anna@example.test",
      "", "", "A", "https://example.test/team | https://example.test/about", "",
      "Nicht kontaktiert – keine Versandfreigabe", "Individuelle Headline",
      "Guten Tag Anna Beispiel\n\nBeispieltext"],
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].organisation, "Gültiges Unternehmen AG");
  assert.equal(rows[0].sourceUrl, "https://example.test/team");
  assert.match(rows[0].notes, /Originalquelle: https:\/\/example.test\/team \| https:\/\/example.test\/about/);
  assert.match(rows[0].notes, /Betreff: Individuelle Headline/);
  assert.ok(!("status" in rows[0]));
  assert.ok(!("newsletterConsent" in rows[0]));
});

test("Non-URL source notes are retained without corrupting the importer", () => {
  const rows = mapMasterSheet([
    headers,
    ["Walter Meier", "", "Beispiel Technik AG", "Solothurn", "walter@example.test",
      "", "", "", "Regionaler Gewerbeverband, Mitgliedsregister"],
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceUrl, "");
  assert.match(rows[0].notes, /Originalquelle: Regionaler Gewerbeverband/);
});
