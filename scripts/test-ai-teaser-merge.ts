/** Deterministic checks: npx tsx scripts/test-ai-teaser-merge.ts */
import assert from "node:assert/strict";
import { getHomepageContent } from "../lib/content/homepage";
import { mergeSanityHomepage } from "../lib/content/merge-sanity-homepage";
import type { SanityHomepage } from "../lib/sanity/homepage";

const baseDe = getHomepageContent("de");
const baseEn = getHomepageContent("en");

assert.equal(baseDe.aiTeaser.enabled, true);
assert.equal(baseDe.aiTeaser.label, "KÜNSTLICHE INTELLIGENZ");
assert.equal(
  baseDe.aiTeaser.headline,
  "KI. Wenn Erfahrung auf neue Möglichkeiten trifft.",
);
assert.equal(baseDe.aiTeaser.cta.href, "/ki");
assert.equal(baseDe.aiTeaser.cta.label, "KI BEI STUDIOJEKER");
assert.equal(baseDe.aiTeaser.media, undefined);

assert.equal(baseEn.aiTeaser.cta.href, "/en/ai");
assert.equal(baseEn.aiTeaser.cta.label, "AI AT STUDIOJEKER");
assert.equal(baseEn.aiTeaser.label, "ARTIFICIAL INTELLIGENCE");

const image = {
  url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-teaser-moto.jpg",
  alt: "Designer Motorrad Alpen",
  dimensions: { width: 1800, height: 1200 },
};

const doc: SanityHomepage = {
  aiTeaserSection: {
    enabled: true,
    label: { de: "CMS EYEBROW", en: "CMS EYEBROW EN" },
    headline: { de: "CMS Headline DE", en: "CMS Headline EN" },
    text: { de: "CMS Text DE", en: "CMS Text EN" },
    cta: {
      label: { de: "KI BEI STUDIOJEKER →", en: "AI AT STUDIOJEKER →" },
      href: "/ki",
    },
    media: {
      mediaType: "image",
      image,
    },
  },
};

const mergedDe = mergeSanityHomepage(baseDe, doc, "de");
assert.equal(mergedDe.aiTeaser.label, "CMS EYEBROW");
assert.equal(mergedDe.aiTeaser.headline, "CMS Headline DE");
assert.equal(mergedDe.aiTeaser.body, "CMS Text DE");
assert.equal(mergedDe.aiTeaser.cta.label, "KI BEI STUDIOJEKER");
assert.equal(mergedDe.aiTeaser.cta.href, "/ki");
assert.equal(mergedDe.aiTeaser.media?.src, image.url);
assert.equal(mergedDe.aiTeaser.media?.alt, image.alt);

const mergedEn = mergeSanityHomepage(baseEn, doc, "en");
assert.equal(mergedEn.aiTeaser.cta.href, "/en/ai");
assert.equal(mergedEn.aiTeaser.cta.label, "AI AT STUDIOJEKER");
assert.equal(mergedEn.aiTeaser.label, "CMS EYEBROW EN");

const disabled = mergeSanityHomepage(
  baseDe,
  { aiTeaserSection: { enabled: false } },
  "de",
);
assert.equal(disabled.aiTeaser.enabled, false);
assert.equal(
  disabled.aiTeaser.headline,
  baseDe.aiTeaser.headline,
  "disabled only hides; copy stays from fallback until CMS text is set",
);

const videoDoc: SanityHomepage = {
  aiTeaserSection: {
    media: {
      mediaType: "video",
      vimeoUrl: "https://vimeo.com/1228871502",
      poster: image,
    },
  },
};
const withVideo = mergeSanityHomepage(baseDe, videoDoc, "de");
assert.equal(withVideo.aiTeaser.videoId, "1228871502");
assert.equal(withVideo.aiTeaser.media?.src, image.url);

const emptyMedia = mergeSanityHomepage(
  baseDe,
  {
    aiTeaserSection: {
      media: { mediaType: "image", image: { alt: "No asset" } },
    },
  },
  "de",
);
assert.equal(
  emptyMedia.aiTeaser.media,
  undefined,
  "image without asset must not produce a broken media frame",
);

// Existing homepage modules unchanged by ai teaser merge
assert.equal(mergedDe.hero.headline, baseDe.hero.headline);
assert.equal(mergedDe.about.headline, baseDe.about.headline);
assert.equal(mergedDe.clients.label, baseDe.clients.label);

console.log("test-ai-teaser-merge: ok");
