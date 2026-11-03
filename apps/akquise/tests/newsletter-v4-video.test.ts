import { test } from "node:test";
import assert from "node:assert/strict";
import { getNewsletterTemplate, newsletterDefaults, renderNewsletter } from "../lib/hub/newsletter-template";

const oldId = "newsletter-04-github-364bba2";
const videoId = "newsletter-04-video-promo-20261102";

test("V4 video version preserves all existing content slots and original template", () => {
  const original = getNewsletterTemplate(oldId);
  const newer = getNewsletterTemplate(videoId);
  const old = newsletterDefaults(oldId), next = newsletterDefaults(videoId);
  assert.equal(newer.slots.length, original.slots.length + 1);
  for (const [key, value] of Object.entries(old.fields))
    assert.equal(next.fields[key], value, `Slot ${key} muss erhalten bleiben`);
  assert.equal(next.fields["promo_image.link.1"], "https://vimeo.com/1216349266");
  assert.equal(original.html.includes("sj-promo-video"), false);
  assert.equal(original.html.includes("sj-video-play"), false);
  assert.match(newer.html, /sj-promo-video/);
  assert.equal((newer.html.match(/class="sj-video-play"/g) || []).length, 2);
});

test("newsletter renders two accessible clickable video posters without embeds or layout mutations", () => {
  const newsletter = newsletterDefaults(videoId);
  newsletter.fields["promo_image.image.1"] = "https://mcusercontent.com/test/images/nora.png";
  newsletter.fields["promo_image.link.1"] = "https://vimeo.com/123456789";
  const output = renderNewsletter({
    newsletter, subject: "Test Visibility", preheader: "Newsletter Test",
  });
  assert.match(output, /<a class="sj-video-link sj-promo-video" href="https:\/\/vimeo\.com\/123456789"/i, "Link muss im Promo-Poster vorhanden sein");
  assert.match(output, /mc:edit="promo_image" src="https:\/\/mcusercontent\.com\/test\/images\/nora\.png"/);
  assert.equal((output.match(/sj-video-play/g) || []).length >= 2, true);
  assert.doesNotMatch(output, /<video\b|<iframe\b/i);
});

test("V4 contact heading precedes its paragraph in preview and Mailchimp export", async () => {
  const { newsletterHtml } = await import("../lib/hub/newsletter");
  const newsletter = newsletterDefaults(videoId);
  newsletter.fields["contact_headline.text.1"] = "Persönliches Gespräch vereinbaren.";
  newsletter.fields["contact_body.text.1"] = "Ich freue mich auf ein persönliches Erstgespräch.";
  const data = { subject: "V4 Test", preheader: "Vorschau", newsletter };
  const preview = renderNewsletter(data);
  const exported = newsletterHtml({ ...data, body: "" });
  assert.equal(preview, exported, "StudioONE-Vorschau und Mailchimp-HTML müssen übereinstimmen");
  const heading = preview.indexOf('mc:edit="contact_headline"');
  const paragraph = preview.indexOf('mc:edit="contact_body"');
  const action = preview.indexOf('mc:edit="contact_cta"');
  const photo = preview.indexOf('mc:edit="contact_image"');
  assert.ok(heading >= 0 && heading < paragraph && paragraph < action && action < photo);
  assert.ok(preview.includes("Ich freue mich auf ein persönliches Erstgespräch."));
  assert.ok(preview.includes("Persönliches Gespräch vereinbaren."));
  assert.ok(preview.includes("sj-promo-video"), "Promo-Playbutton unverändert");
  // The stored source remains intact and the fix is scoped only to its rendering.
  const source = getNewsletterTemplate(videoId).html;
  assert.ok(source.indexOf('mc:edit="contact_body"') < source.indexOf('mc:edit="contact_headline"'));
  const original = getNewsletterTemplate(oldId);
  assert.ok(original.html.indexOf('mc:edit="contact_body"') < original.html.indexOf('mc:edit="contact_headline"'));
  const oldPreview = renderNewsletter({
    ...data,
    newsletter: newsletterDefaults(oldId),
  });
  assert.ok(oldPreview.indexOf('mc:edit="contact_body"') < oldPreview.indexOf('mc:edit="contact_headline"'));
});
