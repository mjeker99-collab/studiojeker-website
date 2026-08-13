import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type { HomepageContent, HomepageMedia } from "@/types/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { urlForImage } from "@/lib/sanity/image";
import {
  fetchSanityHomepage,
  heroImageSource,
  type SanityHomepage,
  type SanityHomepageImage,
} from "@/lib/sanity/homepage";

/** Trim and treat empty strings as "not provided" so we fall back per field. */
function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Split a flattened headline into `headline` + trailing accent span, matching
 * the current visual (e.g. "We create visibility." → "We create visibility" + ".").
 * Falls back to no accent span when the value does not end with the base accent.
 */
function splitTrailingAccent(
  full: string,
  baseAccent: string | undefined,
): { headline: string; accent: string } {
  if (baseAccent && full.endsWith(baseAccent)) {
    return {
      headline: full.slice(0, full.length - baseAccent.length).trimEnd(),
      accent: baseAccent,
    };
  }
  return { headline: full, accent: "" };
}

/**
 * Split a single CTA headline around the accented word so the cyan accent span
 * renders exactly as before (e.g. "… Sichtbarkeit schaffen." keeps the accent
 * on "Sichtbarkeit").
 */
function splitAroundAccent(
  full: string,
  accentWord: string | undefined,
): { before: string; accent: string; after: string } {
  const index = accentWord ? full.indexOf(accentWord) : -1;
  if (index === -1 || !accentWord) {
    return { before: full, accent: "", after: "" };
  }
  return {
    before: full.slice(0, index),
    accent: accentWord,
    after: full.slice(index + accentWord.length),
  };
}

/**
 * The hero intro is stored as one rich text field in Sanity. The current hero
 * renders a lead subheadline plus body paragraphs, so split on blank lines:
 * first block = subheadline, remaining blocks = body paragraphs.
 */
function splitIntro(
  introText: string,
  base: HomepageContent["hero"],
): { subheadline: string; body: string[] } {
  const blocks = introText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { subheadline: base.subheadline, body: base.body };
  }

  const [subheadline, ...rest] = blocks;
  return {
    subheadline,
    body: rest.length > 0 ? rest : base.body,
  };
}

/** Resolve the hero image from Sanity, keeping local media as a safe fallback. */
function resolveHeroMedia(
  base: HomepageMedia,
  image: SanityHomepageImage | undefined,
): HomepageMedia {
  if (!image) {
    return base;
  }

  let src = clean(image.url ?? undefined);
  const source = heroImageSource(image);
  if (source) {
    try {
      src = urlForImage(source).width(1920).auto("format").url();
    } catch {
      // Keep the raw asset URL resolved above.
    }
  }

  if (!src) {
    return base;
  }

  return {
    src,
    alt: clean(image.alt) ?? base.alt,
    width: image.dimensions?.width ?? base.width,
    height: image.dimensions?.height ?? base.height,
  };
}

/**
 * Merge the published Sanity Homepage fields onto the local content structure.
 *
 * The local content is the base: every section without a Sanity equivalent
 * (services items, showreel, projects, subscription, clients, CTA links) is kept
 * exactly as-is. Sanity only overrides the mapped text/image fields, and each
 * override is applied only when the Sanity value is present.
 *
 * `heroVideoUrl` is intentionally not rendered: the approved hero design has no
 * video slot, so wiring it would change the visual layout. It is still fetched
 * and available for a future hero-video treatment.
 */
export function mergeSanityHomepage(
  base: HomepageContent,
  doc: SanityHomepage,
): HomepageContent {
  const merged: HomepageContent = {
    ...base,
    seo: { ...base.seo },
    hero: { ...base.hero, media: { ...base.hero.media } },
    services: { ...base.services },
    projects: { ...base.projects },
    about: { ...base.about, media: { ...base.about.media } },
    finalCta: { ...base.finalCta, cta: { ...base.finalCta.cta } },
  };

  const seoTitle = clean(doc.seoTitle);
  if (seoTitle) merged.seo.title = seoTitle;

  const seoDescription = clean(doc.seoDescription);
  if (seoDescription) merged.seo.description = seoDescription;

  const heroHeadline = clean(doc.heroHeadline);
  if (heroHeadline) {
    const { headline, accent } = splitTrailingAccent(
      heroHeadline,
      base.hero.headlineAccent,
    );
    merged.hero.headline = headline;
    merged.hero.headlineAccent = accent;
  }

  const introText = clean(doc.introText);
  if (introText) {
    const { subheadline, body } = splitIntro(introText, base.hero);
    merged.hero.subheadline = subheadline;
    merged.hero.body = body;
  }

  merged.hero.media = resolveHeroMedia(base.hero.media, doc.heroImage);

  const mainIntroHeadline = clean(doc.mainIntroHeadline);
  if (mainIntroHeadline) {
    // AboutSection splits on sentence boundaries and appends the accent to the
    // last line, so strip a duplicate trailing accent before handing it over.
    const { headline } = splitTrailingAccent(
      mainIntroHeadline,
      base.about.headlineAccent,
    );
    merged.about.headline = headline;
  }

  const mainIntroText = clean(doc.mainIntroText);
  if (mainIntroText) merged.about.body = [mainIntroText];

  const servicesSectionHeadline = clean(doc.servicesSectionHeadline);
  if (servicesSectionHeadline) merged.services.headline = servicesSectionHeadline;

  const workSectionHeadline = clean(doc.workSectionHeadline);
  if (workSectionHeadline) merged.projects.headline = workSectionHeadline;

  const ctaHeadline = clean(doc.ctaHeadline);
  if (ctaHeadline) {
    const { before, accent, after } = splitAroundAccent(
      ctaHeadline,
      base.finalCta.headlineAccent,
    );
    merged.finalCta.headlineBefore = before;
    merged.finalCta.headlineAccent = accent;
    merged.finalCta.headlineAfter = after;
  }

  const ctaText = clean(doc.ctaText);
  if (ctaText) merged.finalCta.text = ctaText;

  const ctaLabel = clean(doc.ctaLabel);
  if (ctaLabel) merged.finalCta.cta.label = ctaLabel;

  return merged;
}

/**
 * Build-time Homepage content resolver.
 *
 * Only the German homepage is wired to Sanity in this step: the published
 * Homepage document holds German content, so English keeps the local source.
 * `cache` dedupes the fetch between `generateMetadata` and the page render.
 * Any fetch failure falls back to the local content so the static export
 * (`output: "export"`) always succeeds.
 */
export const getResolvedHomepageContent = cache(
  async (locale: Locale): Promise<HomepageContent> => {
    const base = getHomepageContent(locale);

    if (locale !== "de") {
      return base;
    }

    const doc = await fetchSanityHomepage();
    if (!doc) {
      return base;
    }

    return mergeSanityHomepage(base, doc);
  },
);
