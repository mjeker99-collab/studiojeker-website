import { test } from "node:test";
import assert from "node:assert/strict";
import { zurichInstant, zurichInput } from "../lib/hub/time";
import { contentInput, safeUrl } from "../lib/hub/input";
import { newsletterHtml } from "../lib/hub/newsletter";
test("Zürich speichert Sommer/Winter als UTC und lehnt DST-Lücken/Dopplungen ab", () => {
  assert.equal(zurichInstant("2026-07-10T10:30"), "2026-07-10T08:30:00.000Z");
  assert.equal(zurichInstant("2026-01-10T10:30"), "2026-01-10T09:30:00.000Z");
  assert.equal(zurichInput("2026-07-10T08:30:00.000Z"), "2026-07-10T10:30");
  assert.throws(() => zurichInstant("2026-03-29T02:30"));
  assert.throws(() => zurichInstant("2026-10-25T02:30"));
  assert.throws(() => zurichInstant("2026-02-30T12:00"));
});
test("Medien-/Beitragslinks verlangen HTTPS und enthalten keine Zugangsdaten", () => {
  for (const v of [
    "javascript:alert(1)",
    "http://example.test/image",
    "https://u:p@example.test/video",
  ])
    assert.equal(safeUrl.safeParse(v).success, false);
  assert.equal(safeUrl.safeParse("https://example.test/media").success, true);
});
test("Newsletter exportiert Text sicher mit Vorlage und Mailchimp-Abmeldetags", () => {
  const html = newsletterHtml({
    subject: '<script>alert("test")</script>',
    preheader: "<img src=x>",
    body: "Zeile 1\n<img onerror=alert(1)> {{subject}}",
  });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("*|UNSUB|*"));
  assert.ok(html.includes("*|LIST:ADDRESS|*"));
  assert.ok(html.includes("{{subject}}"));
});
test("Newsletter benötigt eine explizite Zielgruppe; keine versteckten Eingabefelder", () => {
  assert.equal(
    contentInput.safeParse({
      kind: "NEWSLETTER",
      title: "Test",
      ownerId: "user",
      campaignId: null,
      scheduledAt: null,
      subject: "Test",
      preheader: "",
      body: "Text",
      audience: "",
      variants: [],
    }).success,
    false,
  );
});
