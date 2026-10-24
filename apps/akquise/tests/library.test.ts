import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal } from "../lib/drive/crypto";
import { parseFolder } from "../lib/drive/service";
test("Drive tokens are encrypted, authenticated and bound to one user", () => {
  const previous = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  process.env.DRIVE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const encrypted = seal("synthetic-refresh-token", "user-a");
    assert.ok(!encrypted.includes("synthetic"));
    assert.equal(unseal(encrypted, "user-a"), "synthetic-refresh-token");
    assert.notEqual(encrypted, seal("synthetic-refresh-token", "user-a"));
    assert.throws(() => unseal(encrypted, "user-b"));
    assert.throws(() => unseal(encrypted.slice(0, -5), "user-a"));
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = "invalid";
    assert.throws(() => seal("secret", "user-a"));
  } finally {
    if (previous === undefined) delete process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
    else process.env.DRIVE_TOKEN_ENCRYPTION_KEY = previous;
  }
});
test("Drive folder input rejects external URLs and query injection", () => {
  assert.equal(
    parseFolder("https://drive.google.com/drive/folders/test_123?usp=sharing"),
    "test_123",
  );
  assert.equal(parseFolder("test_123"), "test_123");
  for (const value of [
    "https://evil.test/folders/test",
    "https://user:secret@drive.google.com/folders/test",
    "x' or trashed = true",
    "https://drive.google.com/file/d/test/view",
  ])
    assert.throws(() => parseFolder(value));
});
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
