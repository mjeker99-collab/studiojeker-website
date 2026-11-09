import { test } from "node:test";
import assert from "node:assert/strict";
import { readableReply, studioError } from "../lib/studio/presentation";
import { resultSnapshot } from "../lib/studio/result-snapshot";
import { studioSnapshot } from "../lib/studio/input";
test("saved JSON becomes usable text, without exposing IDs or checksums", () => {
  assert.equal(
    readableReply(
      '```json\n{"reply":"Dein Beitrag", "assetId":"private-id", "sha256":"secret-hash"}\n```',
    ),
    "Dein Beitrag",
  );
  assert.equal(
    readableReply(
      '{"posts":[{"headline":"Sichtbar werden", "variants":[{"channel":"LINKEDIN", "text":"Dein Text"}]}]}',
    ),
    "Sichtbar werden\n\nDein Text",
  );
  assert.equal(readableReply("Ein normaler Beitrag."), "Ein normaler Beitrag.");
  assert.doesNotMatch(
    readableReply("Vorschlag\n```js\nalert(1)\n```"),
    /alert/,
  );
  assert.doesNotMatch(
    studioError(
      "studio.seriesId: Invalid input: expected string, received undefined",
    ),
    /undefined|seriesId|expected/,
  );
  assert.equal(
    studioError("Beitrag seit Auftrag geändert."),
    "Beitrag seit Auftrag geändert.",
  );
});
test("legacy image result receives a complete valid layout without unrequested branding", () => {
  const snapshot = resultSnapshot(undefined, "series-1", "a".repeat(64));
  assert.equal(studioSnapshot.safeParse(snapshot).success, true);
  assert.equal(snapshot.showLogo, false);
  assert.equal(snapshot.showHeadline, false);
  assert.equal(snapshot.seriesId, "series-1");
  const existing = { ...snapshot, zoom: 2, headline: "Behalten" };
  assert.deepEqual(
    resultSnapshot(existing, "series-1", "a".repeat(64)),
    existing,
  );
});
