import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceUrl, brandDefaults, brandInput } from "../lib/library/input";
test("Bibliothek: Referenzen sind passive HTTPS-URLs, keine impliziten Verbindungen", () => {
  for (const u of [
    "https://vimeo.com/123",
    "https://drive.google.com/file/d/test/view",
  ])
    assert.ok(referenceUrl.safeParse(u).success);
  for (const u of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://name:secret@example.test/a",
    "http://example.test/",
  ])
    assert.equal(referenceUrl.safeParse(u).success, false);
});
test("Markenprofil: offene Angaben, bestehende Farben und strikte sichere Snapshots", () => {
  const b = brandDefaults({ tone: "Originalton" });
  assert.equal(b.claim, "");
  assert.equal(b.fontAssetId, null);
  assert.equal(b.tone, "Originalton");
  assert.equal(b.address, "OFFEN");
  assert.ok(brandInput.safeParse({ ...b, revision: 1 }).success);
  assert.equal(
    brandInput.safeParse({
      ...b,
      revision: 1,
      colors: { ...b.colors, cyan: 'red"/><script/>' },
    }).success,
    false,
  );
  assert.equal(
    brandInput.safeParse({ ...b, revision: 1, swiss: false }).success,
    false,
  );
});
