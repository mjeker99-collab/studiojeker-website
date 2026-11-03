import { test } from "node:test";
import assert from "node:assert/strict";
import { getNewsletterTemplate, newsletterDefaults, renderNewsletter, correctedV4Newsletter } from "../lib/hub/newsletter-template";

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

test("corrected V4 starts with Nora and crops Hero poster without changing text or video URLs", () => {
  const corrected = newsletterDefaults("newsletter-04-video-promo-20261103");
  const result = renderNewsletter({ newsletter: corrected, subject: "Test", preheader: "Preview" });
  assert.match(corrected.fields["promo_image.image.1"], /^https:\/\/mcusercontent\.com\//);
  assert.equal(corrected.fields["promo_image.alt.1"], "Nora Jeker mit Tafel im Büro");
  assert.equal((result.match(/transform:scale\(1\.35\)/g) || []).length, 2);
  assert.equal((result.match(/class="sj-video-play"/g) || []).length, 2);
  assert.match(result, /<a class="sj-video-link sj-promo-video" href="https:\/\/vimeo\.com\//);
});

test("older V4 and video V1 can upgrade, replacing only stock umbrella picture", () => {
  for (const id of [oldId, videoId]) {
    const old = newsletterDefaults(id);
    old.fields["hero_headline.text.1"] = "Eigenständige V4-Headline";
    const updated = correctedV4Newsletter(old);
    assert.equal(updated.templateId, "newsletter-04-video-promo-20261103");
    assert.equal(updated.fields["hero_headline.text.1"], "Eigenständige V4-Headline");
    assert.match(updated.fields["promo_image.image.1"], /^https:\/\/mcusercontent\.com\//);
    assert.equal(updated.fields["promo_image.alt.1"], "Nora Jeker mit Tafel im Büro");
    assert.equal(updated.fields["promo_image.link.1"], old.fields["promo_image.link.1"] || old.fields["hero_video_cta.link.1"]);
    assert.equal(Object.keys(updated.fields).length, 77);
  }
});

test("manual library photos and their descriptions are never overwritten", () => {
  const old = newsletterDefaults(videoId);
  old.fields["promo_image.image.1"] = "https://mcusercontent.com/custom/photo.jpg";
  old.fields["promo_image.alt.1"] = "Mein ausgewähltes Foto";
  old.fields["promo_image.link.1"] = "https://vimeo.com/123456789";
  const updated = correctedV4Newsletter(old);
  assert.equal(updated.fields["promo_image.image.1"], old.fields["promo_image.image.1"]);
  assert.equal(updated.fields["promo_image.alt.1"], old.fields["promo_image.alt.1"]);
  assert.equal(updated.fields["promo_image.link.1"], old.fields["promo_image.link.1"]);
});
