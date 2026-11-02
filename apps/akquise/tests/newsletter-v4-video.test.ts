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
  assert.match(output, /href="https:\/\/vimeo\.com\/123456789"[^>]*class=/i, "Link muss im Promo-Poster vorhanden sein");
  assert.match(output, /mc:edit="promo_image" src="https:\/\/mcusercontent\.com\/test\/images\/nora\.png"/);
  assert.equal((output.match(/sj-video-play/g) || []).length >= 2, true);
  assert.doesNotMatch(output, /<video\b|<iframe\b/i);
});
