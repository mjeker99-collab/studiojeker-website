/**
 * Content-Abo merge regression checks.
 * Run: npx tsx scripts/test-abo-merge.ts
 */
import { getAboPageContent } from "../lib/content/abo-page";
import { mergeSanityAbo } from "../lib/content/merge-sanity-abo";
import { fetchSanityAbo } from "../lib/sanity/abo";
import type { SanityAbo } from "../lib/sanity/abo";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const base = getAboPageContent("de");
  assert(
    base.hero.headline.includes("Regelmässig"),
    "fallback DE headline present",
  );
  assert(base.showreel.videoId, "fallback ships with hardcoded Vimeo id");

  const live = await fetchSanityAbo();
  assert(live?._id === "abo", "published singleton id is abo");

  const fromCms = mergeSanityAbo(base, live!, "de");
  assert(
    fromCms.hero.headline === live!.heroSection?.headline?.de,
    "hero headline comes from Sanity",
  );
  assert(
    fromCms.hero.media.src.includes("cdn.sanity.io"),
    "hero image URL comes from Sanity CDN",
  );
  assert(
    fromCms.showreel.videoId === "1216347773",
    "current Sanity showreel still resolves Vimeo id",
  );
  assert(
    fromCms.showreel.media.src.includes("cdn.sanity.io"),
    "showreel poster comes from Sanity",
  );

  const shortHeadlineDoc: SanityAbo = {
    ...live!,
    heroSection: {
      ...live!.heroSection,
      headline: {
        de: "Sichtbarkeit im Abo.",
        en: "Visibility subscription.",
      },
      media: {
        mediaType: "image",
        image: {
          ...live!.heroSection!.media!.image!,
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/hero-test.jpg",
          dimensions: { width: 1600, height: 1200 },
          alt: "Hero test",
        },
      },
    },
  };
  const short = mergeSanityAbo(base, shortHeadlineDoc, "de");
  assert(
    short.hero.headline === "Sichtbarkeit im Abo.",
    "published Sanity headline overrides fallback",
  );
  assert(
    short.hero.media.src.includes("hero-test.jpg") ||
      short.hero.media.src.includes("cdn.sanity.io"),
    "published Sanity hero image overrides fallback",
  );

  const imageOnlyShowreel: SanityAbo = {
    ...live!,
    showreelSection: {
      ...live!.showreelSection,
      media: {
        mediaType: "image",
        image: {
          asset: { _ref: "image-abcdef0123456789abcdef0123456789abcdef01-800x600-jpg" },
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/showreel-image-only.jpg",
          dimensions: { width: 800, height: 600 },
          alt: "Showreel still",
        },
      },
    },
  };
  const imageOnly = mergeSanityAbo(base, imageOnlyShowreel, "de");
  assert(
    !imageOnly.showreel.videoId,
    "image-only showreel must clear hardcoded Vimeo id",
  );
  assert(
    imageOnly.showreel.media.src.includes("showreel-image-only.jpg") ||
      imageOnly.showreel.media.src.includes("cdn.sanity.io"),
    "image-only showreel uses Sanity image",
  );

  const clearedVimeo: SanityAbo = {
    ...live!,
    showreelSection: {
      ...live!.showreelSection,
      media: {
        mediaType: "video",
        vimeoUrl: "",
        poster: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/new-poster.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "New poster",
        },
      },
    },
  };
  const posterOnly = mergeSanityAbo(base, clearedVimeo, "de");
  assert(
    !posterOnly.showreel.videoId,
    "video type without Vimeo URL must not keep hardcoded id",
  );
  assert(
    posterOnly.showreel.media.src.includes("new-poster.jpg") ||
      posterOnly.showreel.media.src.includes("cdn.sanity.io"),
    "poster-only showreel uses Sanity poster",
  );

  console.log("OK: Content-Abo Sanity merge prefers published fields and clears hardcoded Vimeo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
