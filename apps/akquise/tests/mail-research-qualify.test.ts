import { test } from "node:test";
import assert from "node:assert/strict";
import { qualifyResearchLead, researchRegions } from "../lib/mail-assistant/qualify";

const sample = {
  organisation: "Beispiel AG",
  firstName: "Anna",
  lastName: "Muster",
  email: "anna@beispiel.example",
};

test("Recherche übernimmt nur belegte Mailadressen, nie info@ oder fehlende Adressen", () => {
  const known = { emails: new Set<string>(), keys: new Set<string>() };
  assert.equal(qualifyResearchLead(sample, known).ok, true);
  assert.equal(qualifyResearchLead({ ...sample, email: "" }, known).ok, false);
  assert.equal(qualifyResearchLead({ ...sample, email: "kein-at-zeichen" }, known).ok, false);
  assert.equal(qualifyResearchLead({ ...sample, email: "info@beispiel.example" }, known).ok, false);
  assert.equal(qualifyResearchLead({ ...sample, email: "INFO-service@beispiel.example" }, known).ok, false);
});

test("Erlaubte Team-Postfächer bleiben als Team-Postfächer gekennzeichnet", () => {
  const known = { emails: new Set<string>(), keys: new Set<string>() };
  for (const address of ["marketing@beispiel.example", "kommunikation@beispiel.example"]) {
    const result = qualifyResearchLead({ ...sample, email: address }, known);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.teamMailbox, true);
  }
});

test("Bereits vorhandene Kontakte werden an E-Mail und Person/Organisation erkannt", () => {
  const known = {
    emails: new Set(["anna@beispiel.example"]),
    keys: new Set<string>(),
  };
  assert.equal(qualifyResearchLead(sample, known).ok, false);
  known.emails.clear();
  known.keys.add("anna|muster|beispiel ag");
  assert.equal(qualifyResearchLead({ ...sample, email: "anna.neu@beispiel.example" }, known).ok, false);
});

test("Regionenliste enthält die vereinbarte Kern- und Erweiterungsregion", () => {
  for (const region of ["Solothurn", "Biel", "Olten", "Bellach", "Gerlafingen", "Basel-Stadt"]) {
    assert.ok(researchRegions.includes(region), region);
  }
});
