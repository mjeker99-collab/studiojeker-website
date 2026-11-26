import assert from "node:assert/strict";
import { workspaceGroups, workspaceGroup } from "../lib/workspace-navigation";
assert.equal(workspaceGroups.length, 6);
for (const section of [
  "Übersicht",
  "Kontakte/Akquise",
  "Kontakte",
  "Kontakte finden",
  "Mail-Studio",
  "E-Mail-Entwürfe",
  "Freigaben",
  "Versandhistorie",
  "Kunden",
  "Strategie & Konzepte",
  "Kampagnen",
  "Content-Studio",
  "Social Media",
  "Bibliothek",
  "Newsletter",
  "Website",
  "Kalender",
]) {
  assert.ok(workspaceGroup(section), `${section} must remain reachable`);
}
assert.equal(workspaceGroup("Newsletter")?.label, "Inhalte");
assert.equal(workspaceGroup("Kunden")?.label, "Projekte");
assert.equal(workspaceGroup("Freigaben")?.label, "Akquise");
assert.equal(workspaceGroup("Einstellungen"), undefined);
const targets = workspaceGroups.flatMap((g) =>
  g.sections.map((s) => s.section),
);
assert.equal(new Set(targets).size, targets.length);
console.log("Workspace navigation OK");
