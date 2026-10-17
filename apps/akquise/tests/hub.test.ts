import { test } from "node:test";
import assert from "node:assert/strict";
import { zurichInstant, zurichInput } from "../lib/hub/time";
import { contentInput, safeUrl } from "../lib/hub/input";
import { newsletterHtml } from "../lib/hub/newsletter";
import { contentHash } from "../lib/hub/workflow";
import { createHash } from "node:crypto";
import {
  newsletterDefaults,
  newsletterText,
} from "../lib/hub/newsletter-template";

test("Newsletter-Prüfsumme bleibt bei JSONB-Feldreihenfolge stabil, Inhaltsänderungen bleiben erkennbar", () => {
  const newsletter = newsletterDefaults("newsletter-02");
  const payload = contentInput.parse({
    kind: "NEWSLETTER",
    title: "Test",
    ownerId: "user",
    campaignId: null,
    scheduledAt: null,
    subject: "Test",
    preheader: "Vorschau",
    body: newsletterText(newsletter),
    audience: "Testzielgruppe",
    variants: [],
    newsletter,
  });
  const originalOrder = Object.keys(payload.newsletter!.fields);
  const reordered = contentInput.parse({
    ...payload,
    newsletter: {
      ...newsletter,
      fields: Object.fromEntries(Object.entries(newsletter.fields).reverse()),
    },
  });
  assert.notDeepEqual(Object.keys(reordered.newsletter!.fields), originalOrder);
  assert.equal(contentHash(payload), contentHash(reordered));
  assert.deepEqual(Object.keys(payload.newsletter!.fields), originalOrder);
  reordered.newsletter!.fields[originalOrder[0]] += " geändert";
  assert.notEqual(contentHash(payload), contentHash(reordered));
  const legacy = { ...payload };
  delete legacy.newsletter;
  assert.equal(
    contentHash(legacy),
    createHash("sha256").update(JSON.stringify(legacy)).digest("hex"),
  );
});
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

test("Original-Newsletter bleiben ohne Änderungen bytegleich, inklusive Outlook und Footer", async () => {
  const { newsletterLibrary, newsletterDefaults, renderNewsletter } =
    await import("../lib/hub/newsletter-template");
  for (const template of newsletterLibrary) {
    const subject = template.slots.find((s) => s.special === "subject")!.value;
    assert.equal(
      renderNewsletter({
        subject,
        preheader: template.preheader,
        newsletter: newsletterDefaults(template.id),
      }),
      template.html,
    );
  }
});
test("Newsletter-Slots begrenzen Änderungen auf Inhalt und schützen Links/HTML", async () => {
  const {
    newsletterLibrary,
    newsletterDefaults,
    renderNewsletter,
    newsletterSnapshot,
    previewDocument,
  } = await import("../lib/hub/newsletter-template");
  const template = newsletterLibrary[1];
  const snapshot = newsletterDefaults(template.id);
  const slot = template.slots.find((s) => !s.special && s.kind === "text")!;
  snapshot.fields[slot.key] = '<script>alert(1)</script> & "Text"';
  const result = renderNewsletter({
    subject: template.slots.find((s) => s.special === "subject")!.value,
    preheader: template.preheader,
    newsletter: snapshot,
  });
  assert.equal(
    result,
    template.html.slice(0, slot.start) +
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Text&quot;" +
      template.html.slice(slot.end),
  );
  assert.ok(result.includes("*|UNSUB|*"));
  assert.ok(result.includes("*|HTML:LIST_ADDRESS_HTML|*"));
  assert.ok(!previewDocument(result).match(/<a\b[^>]*\shref=/));
  assert.ok(previewDocument(result).includes("Content-Security-Policy"));
  assert.equal(
    newsletterSnapshot.safeParse({
      ...snapshot,
      fields: { ...snapshot.fields, injected: "evil" },
    }).success,
    false,
  );
  assert.equal(
    newsletterSnapshot.safeParse({ ...snapshot, templateId: "unknown" })
      .success,
    false,
  );
  const link = template.slots.find((s) => s.kind === "link")!;
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,evil",
    "https://user:pass@example.test",
    "http://example.test",
  ]) {
    assert.equal(
      newsletterSnapshot.safeParse({
        ...snapshot,
        fields: { ...snapshot.fields, [link.key]: url },
      }).success,
      false,
    );
  }
});
