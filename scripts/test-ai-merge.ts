/**
 * KI/AI merge regression checks.
 * Run: npx tsx scripts/test-ai-merge.ts
 */
import { getAiPageContent, aiLanguageAlternates } from "../lib/content/ai-page";
import { mergeSanityAi } from "../lib/content/merge-sanity-ai";
import { fetchSanityAi } from "../lib/sanity/ai";
import type { SanityAi } from "../lib/sanity/ai";
import { getAlternateLocalePath, getAiPath } from "../lib/i18n/config";
import { buildPageMetadata } from "../lib/seo/metadata";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const baseDe = getAiPageContent("de");
  const baseEn = getAiPageContent("en");

  assert(
    baseDe.hero.headline.includes("Erfahrung"),
    "fallback DE headline present",
  );
  assert(
    baseEn.hero.headline.includes("experience"),
    "fallback EN headline present",
  );
  assert(baseDe.applications.items.length === 6, "six DE application areas");
  assert(baseEn.applications.items.length === 6, "six EN application areas");
  assert(aiLanguageAlternates.de === "/ki", "DE path is /ki");
  assert(aiLanguageAlternates.en === "/en/ai", "EN path is /en/ai");
  assert(getAiPath("de") === "/ki", "getAiPath de");
  assert(getAiPath("en") === "/en/ai", "getAiPath en");
  assert(
    getAlternateLocalePath("/ki", "en") === "/en/ai",
    "language switcher DE→EN",
  );
  assert(
    getAlternateLocalePath("/en/ai", "de") === "/ki",
    "language switcher EN→DE",
  );

  const metaDe = buildPageMetadata({
    locale: "de",
    pathname: "/ki",
    title: baseDe.seo.title,
    description: baseDe.seo.description,
    languageAlternates: aiLanguageAlternates,
  });
  const metaEn = buildPageMetadata({
    locale: "en",
    pathname: "/ai",
    title: baseEn.seo.title,
    description: baseEn.seo.description,
    languageAlternates: aiLanguageAlternates,
  });

  const deCanonical = String(metaDe.alternates?.canonical ?? "");
  const enCanonical = String(metaEn.alternates?.canonical ?? "");
  assert(
    deCanonical.endsWith("/ki") || deCanonical.endsWith("/ki/"),
    `DE canonical ends with /ki — got ${deCanonical}`,
  );
  assert(
    enCanonical.endsWith("/en/ai") || enCanonical.endsWith("/en/ai/"),
    `EN canonical ends with /en/ai — got ${enCanonical}`,
  );
  assert(
    !deCanonical.includes("studiojeker.ch/ai"),
    "DE canonical is not /ai",
  );
  assert(enCanonical.includes("/en/ai"), "EN canonical includes /en/ai");

  const languages = metaEn.alternates?.languages as
    | Record<string, string>
    | undefined;
  assert(languages?.["de-CH"]?.includes("/ki"), "hreflang de-CH → /ki");
  assert(languages?.en?.includes("/en/ai"), "hreflang en → /en/ai");
  assert(languages?.["x-default"]?.includes("/ki"), "hreflang x-default → /ki");
  assert(
    !deCanonical.toLowerCase().includes("staging"),
    "no staging in DE canonical",
  );
  assert(
    !enCanonical.toLowerCase().includes("staging"),
    "no staging in EN canonical",
  );

  const stub: SanityAi = {
    _id: "ai",
    heroSection: {
      label: { de: "KÜNSTLICHE INTELLIGENZ", en: "ARTIFICIAL INTELLIGENCE" },
      headline: {
        de: "KI. Sanity Headline.",
        en: "AI. Sanity Headline.",
      },
      text: {
        de: "DE Intro aus Sanity.",
        en: "EN Intro from Sanity.",
      },
      media: {
        mediaType: "image",
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-hero.jpg",
          dimensions: { width: 1600, height: 1200 },
          alt: "AI hero",
          asset: { _ref: "image-ai-hero", _type: "reference" },
        },
      },
    },
    closingSection: {
      headline: {
        de: "CTA Headline DE",
        en: "CTA Headline EN",
      },
      text: {
        de: "CTA Text DE",
        en: "CTA Text EN",
      },
      cta: {
        label: { de: "PROJEKT BESPRECHEN", en: "DISCUSS YOUR PROJECT" },
        href: "/contact",
      },
    },
    seoSection: {
      title: {
        de: "KI für Bild, Video & 3D | Studiojeker",
        en: "AI for Image, Video & 3D | Studiojeker",
      },
      description: {
        de: "Meta DE",
        en: "Meta EN",
      },
    },
  };

  const mergedDe = mergeSanityAi(baseDe, stub, "de");
  assert(mergedDe.hero.headline === "KI. Sanity Headline.", "DE merge headline");
  assert(mergedDe.hero.body === "DE Intro aus Sanity.", "DE merge intro");
  assert(mergedDe.closing.cta.href === "/contact", "DE CTA href");
  assert(
    mergedDe.seo.title === "KI für Bild, Video & 3D | Studiojeker",
    "DE SEO title",
  );

  const mergedEn = mergeSanityAi(baseEn, stub, "en");
  assert(mergedEn.hero.headline === "AI. Sanity Headline.", "EN merge headline");
  assert(mergedEn.closing.cta.href === "/en/contact", "EN CTA href localized");
  assert(
    mergedEn.seo.title === "AI for Image, Video & 3D | Studiojeker",
    "EN SEO title",
  );

  const videoStub: SanityAi = {
    ...stub,
    heroSection: {
      ...stub.heroSection,
      media: {
        mediaType: "video",
        vimeoUrl: "https://vimeo.com/1216347773",
        poster: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-poster.jpg",
          dimensions: { width: 1600, height: 900 },
          alt: "Poster",
          asset: { _ref: "image-ai-poster", _type: "reference" },
        },
      },
    },
  };
  const withVideo = mergeSanityAi(baseDe, videoStub, "de");
  assert(withVideo.hero.videoId === "1216347773", "hero Vimeo id resolved");

  const clearedVideo: SanityAi = {
    ...stub,
    heroSection: {
      ...stub.heroSection,
      media: {
        mediaType: "image",
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-hero.jpg",
          dimensions: { width: 1600, height: 1200 },
          alt: "AI hero",
          asset: { _ref: "image-ai-hero", _type: "reference" },
        },
      },
    },
  };
  const afterClear = mergeSanityAi(
    { ...withVideo, hero: { ...withVideo.hero } },
    clearedVideo,
    "de",
  );
  assert(
    !afterClear.hero.videoId,
    "cleared CMS video removes stale hero videoId",
  );

  const live = await fetchSanityAi();
  if (live?._id === "ai") {
    const fromCms = mergeSanityAi(baseDe, live, "de");
    assert(fromCms.hero.headline.length > 0, "live Sanity headline present");
    console.log("Live Sanity document present and merges cleanly.");
  } else {
    console.log(
      "No live Sanity AI document yet — stub merge checks passed. Seed with a writable token: node scripts/migrate-ai-page.mjs",
    );
  }

  console.log("All KI/AI merge checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
