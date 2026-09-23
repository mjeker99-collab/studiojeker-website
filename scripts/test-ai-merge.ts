/**
 * KI/AI merge regression checks (Sanity SSOT — empty local shell).
 * Run: npx tsx scripts/test-ai-merge.ts
 */
import {
  getEmptyAiPageContent,
  aiLanguageAlternates,
} from "../lib/content/ai-page";
import { getAiPageSeedContent } from "../lib/content/ai-page-seed";
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
  const emptyDe = getEmptyAiPageContent("de");
  const emptyEn = getEmptyAiPageContent("en");
  const seedDe = getAiPageSeedContent("de");
  const seedEn = getAiPageSeedContent("en");

  assert(!emptyDe.hero.headline, "runtime DE shell has no editorial headline");
  assert(!emptyEn.hero.headline, "runtime EN shell has no editorial headline");
  assert(emptyDe.process.steps.length === 0, "runtime shell has no process steps");
  assert(
    emptyDe.applications.items.length === 0,
    "runtime shell has no applications",
  );
  assert(!emptyDe.hero.media.src, "runtime shell has no hero image path");
  assert(!emptyDe.showreel.videoId, "runtime shell has no showreel Vimeo");
  assert(
    Object.keys(emptyDe.landscapeBreaks).length === 0,
    "runtime shell has no landscape defaults",
  );
  assert(
    Object.keys(emptyDe.visuals).length === 0,
    "runtime visuals empty until Sanity uploads",
  );

  assert(
    seedDe.hero.headline.includes("Erfahrung"),
    "seed DE headline present",
  );
  assert(
    seedEn.hero.headline.includes("experience"),
    "seed EN headline present",
  );
  assert(seedDe.applications.items.length === 6, "six DE application areas");
  assert(seedEn.applications.items.length === 6, "six EN application areas");
  assert(seedDe.process.steps.length === 5, "five DE process steps");
  assert(seedEn.process.steps.length === 5, "five EN process steps");
  assert(
    seedDe.process.steps.map((s) => s.id).join(">") ===
      "concept>production>ai>distribution>visibility",
    "DE process order",
  );
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
    title: seedDe.seo.title,
    description: seedDe.seo.description,
    languageAlternates: aiLanguageAlternates,
  });
  const metaEn = buildPageMetadata({
    locale: "en",
    pathname: "/ai",
    title: seedEn.seo.title,
    description: seedEn.seo.description,
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

  const mergedDe = mergeSanityAi(emptyDe, stub, "de");
  assert(mergedDe.hero.headline === "KI. Sanity Headline.", "DE merge headline");
  assert(mergedDe.hero.body === "DE Intro aus Sanity.", "DE merge intro");
  assert(mergedDe.closing.cta.href === "/contact", "DE CTA href");
  assert(
    mergedDe.seo.title === "KI für Bild, Video & 3D | Studiojeker",
    "DE SEO title",
  );
  assert(
    !mergedDe.intro.headline,
    "empty Sanity intro stays empty (no local text fallback)",
  );

  const mergedEn = mergeSanityAi(emptyEn, stub, "en");
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
  const withVideo = mergeSanityAi(emptyDe, videoStub, "de");
  assert(withVideo.hero.videoId === "1216347773", "hero Vimeo id resolved");

  const videoWithoutUrl: SanityAi = {
    ...stub,
    heroSection: {
      ...stub.heroSection,
      media: {
        mediaType: "video",
        vimeoUrl: "",
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-hero-still.jpg",
          dimensions: { width: 1600, height: 1200 },
          alt: "Hero still fallback",
          asset: { _ref: "image-ai-hero-still", _type: "reference" },
        },
        poster: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-poster-portrait.jpg",
          dimensions: { width: 752, height: 1344 },
          alt: "Poster",
          asset: { _ref: "image-ai-poster-portrait", _type: "reference" },
        },
      },
    },
  };
  const videoMissingUrl = mergeSanityAi(emptyDe, videoWithoutUrl, "de");
  assert(!videoMissingUrl.hero.videoId, "missing Vimeo URL → no videoId");
  assert(
    videoMissingUrl.hero.media.src?.includes("ai-hero-still"),
    "missing Vimeo URL falls back to hero Image asset",
  );

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

  const visualsStub: SanityAi = {
    ...stub,
    showreelSection: {
      media: {
        mediaType: "video",
        vimeoUrl: "https://vimeo.com/1228871502",
        poster: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-showreel.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Showreel poster",
          asset: { _ref: "image-ai-showreel", _type: "reference" },
        },
      },
    },
    visualMedia: {
      keyVisual: {
        url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-key.jpg",
        dimensions: { width: 1800, height: 1200 },
        alt: "Keyvisual Motorrad Alpen",
        asset: { _ref: "image-ai-key", _type: "reference" },
      },
      clayVilla: {
        url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-clay.jpg",
        dimensions: { width: 1600, height: 1000 },
        alt: "Clay Villa",
        asset: { _ref: "image-ai-clay", _type: "reference" },
      },
      photoVilla: {
        url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-photo.jpg",
        dimensions: { width: 1600, height: 1000 },
        alt: "Photo Villa",
        asset: { _ref: "image-ai-photo", _type: "reference" },
      },
      contentFormats: {
        url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-formats.jpg",
        dimensions: { width: 1800, height: 1200 },
        alt: "Content Formate",
        asset: { _ref: "image-ai-formats", _type: "reference" },
      },
      distributionChannels: {
        url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-dist.jpg",
        dimensions: { width: 1800, height: 1200 },
        alt: "Distribution Channels",
        asset: { _ref: "image-ai-dist", _type: "reference" },
      },
    },
  };
  const withVisuals = mergeSanityAi(emptyDe, visualsStub, "de");
  assert(
    withVisuals.showreel.videoId === "1228871502",
    "showreel Vimeo URL editable via Sanity",
  );
  assert(
    withVisuals.visuals.keyVisual?.src?.includes("ai-key"),
    "Bild 1 keyVisual merges",
  );
  assert(
    withVisuals.visuals.keyVisual?.alt === "Keyvisual Motorrad Alpen",
    "Bild 1 alt editable",
  );
  assert(
    withVisuals.visuals.clayVilla?.src?.includes("ai-clay"),
    "Bild 2 clayVilla merges",
  );
  assert(
    withVisuals.visuals.photoVilla?.src?.includes("ai-photo"),
    "Bild 3 photoVilla merges",
  );
  assert(
    withVisuals.visuals.contentFormats?.src?.includes("ai-formats"),
    "Bild 4 contentFormats merges",
  );
  assert(
    withVisuals.visuals.distributionChannels?.src?.includes("ai-dist"),
    "Bild 5 distributionChannels merges",
  );
  assert(
    !withVisuals.intro.headline,
    "empty intro stays empty when only visuals merge",
  );

  const landscapeStub: SanityAi = {
    ...stub,
    landscapeBreaks: {
      afterAi: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-ai.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Produktion / KI Break",
          asset: { _ref: "image-ai-break-ai", _type: "reference" },
        },
      },
      afterDistribution: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-dist.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Distribution Break",
          asset: { _ref: "image-ai-break-dist", _type: "reference" },
        },
      },
      afterVisibility: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-vis.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Visibility Break",
          asset: { _ref: "image-ai-break-vis", _type: "reference" },
        },
      },
      midApplications: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-mid.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Mid Applications Break",
          asset: { _ref: "image-ai-break-mid", _type: "reference" },
        },
      },
      afterApplications: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-apps.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Applications Break",
          asset: { _ref: "image-ai-break-apps", _type: "reference" },
        },
      },
      afterModels: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-models.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Models Break",
          asset: { _ref: "image-ai-break-models", _type: "reference" },
        },
      },
      afterExperience: {
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-exp.jpg",
          dimensions: { width: 1920, height: 1080 },
          alt: "Experience Break",
          asset: { _ref: "image-ai-break-exp", _type: "reference" },
        },
      },
    },
  };
  const withLandscape = mergeSanityAi(emptyDe, landscapeStub, "de");
  assert(
    withLandscape.landscapeBreaks.afterAi?.media?.src?.includes("ai-break-ai"),
    "landscape afterAi merges",
  );
  assert(
    withLandscape.landscapeBreaks.afterAi?.media?.alt ===
      "Produktion / KI Break",
    "landscape afterAi alt editable",
  );
  assert(
    withLandscape.landscapeBreaks.afterDistribution?.media?.src?.includes(
      "ai-break-dist",
    ),
    "landscape afterDistribution merges",
  );
  assert(
    withLandscape.landscapeBreaks.afterVisibility?.media?.src?.includes(
      "ai-break-vis",
    ),
    "landscape afterVisibility merges",
  );
  assert(
    withLandscape.landscapeBreaks.midApplications?.media?.src?.includes(
      "ai-break-mid",
    ),
    "landscape midApplications merges",
  );
  assert(
    withLandscape.landscapeBreaks.afterApplications?.media?.src?.includes(
      "ai-break-apps",
    ),
    "landscape afterApplications merges",
  );
  assert(
    withLandscape.landscapeBreaks.afterModels?.media?.src?.includes(
      "ai-break-models",
    ),
    "landscape afterModels merges",
  );
  assert(
    withLandscape.landscapeBreaks.afterExperience?.media?.src?.includes(
      "ai-break-exp",
    ),
    "landscape afterExperience merges",
  );
  const emptyLandscape = mergeSanityAi(emptyDe, stub, "de");
  assert(
    !emptyLandscape.landscapeBreaks.afterAi?.media?.src,
    "empty Sanity landscape collapses afterAi (no local defaults)",
  );
  assert(
    !emptyLandscape.landscapeBreaks.midApplications?.media?.src,
    "empty Sanity landscape collapses midApplications (no local defaults)",
  );
  assert(
    !emptyLandscape.landscapeBreaks.afterModels?.media?.src,
    "empty Sanity landscape collapses afterModels (no local defaults)",
  );

  const mediaFieldLandscape: SanityAi = {
    ...stub,
    landscapeBreaks: {
      afterAi: {
        media: {
          mediaType: "video",
          vimeoUrl: "https://vimeo.com/1111111111",
          poster: {
            url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-break-poster.jpg",
            dimensions: { width: 1920, height: 1080 },
            alt: "Break poster",
            asset: { _ref: "image-ai-break-poster", _type: "reference" },
          },
        },
      },
    },
  };
  const withMediaFieldBreak = mergeSanityAi(emptyDe, mediaFieldLandscape, "de");
  assert(
    withMediaFieldBreak.landscapeBreaks.afterAi?.videoId === "1111111111",
    "landscape mediaField Vimeo resolves",
  );

  const captionStub: SanityAi = {
    ...stub,
    experienceSection: {
      headline: {
        de: "KI + Erfahrung",
        en: "AI + Experience",
      },
      text: {
        de: "Absatz eins.\n\nAbsatz zwei.",
        en: "Para one.\n\nPara two.",
      },
      caption: {
        de: "Bildunterschrift DE",
        en: "Caption EN",
      },
      media: {
        mediaType: "image",
        image: {
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/ai-exp.jpg",
          dimensions: { width: 1600, height: 1000 },
          alt: "Experience media",
          asset: { _ref: "image-ai-exp", _type: "reference" },
        },
      },
    },
  };
  const withCaption = mergeSanityAi(emptyDe, captionStub, "de");
  assert(
    withCaption.experience.caption === "Bildunterschrift DE",
    "experience caption merges",
  );
  assert(
    withCaption.experience.media?.src?.includes("ai-exp"),
    "experience section media merges",
  );
  assert(
    withCaption.experience.body.length === 2,
    "experience body paragraphs preserved",
  );

  const live = await fetchSanityAi();
  if (live?._id === "ai") {
    const fromCms = mergeSanityAi(emptyDe, live, "de");
    assert(
      Boolean(fromCms.hero.videoId || fromCms.hero.media.src),
      "live Sanity hero media present",
    );
    assert(
      fromCms.showreel.videoId === "1228871502" ||
        Boolean(fromCms.showreel.media.src),
      "live showreel media preserved",
    );
    console.log("Live Sanity document present and merges cleanly.");
    console.log(
      `  hero.videoId=${fromCms.hero.videoId || "(none)"} showreel.videoId=${fromCms.showreel.videoId || "(none)"}`,
    );
    console.log(
      `  hero.headline empty=${!fromCms.hero.headline} (texts migrate separately)`,
    );
  } else {
    console.log(
      "No live Sanity AI document yet — stub merge checks passed.",
    );
  }

  console.log("All KI/AI merge checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
