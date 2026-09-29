import type { Locale } from "@/types/i18n";
import type { HomepageMedia } from "@/types/homepage";
import {
  getAiPageContent,
  type AiApplicationItem,
  type AiPageContent,
  type AiProcessStep,
  type AiTextBlock,
} from "@/lib/content/ai-page";
import { mergeClientLogos } from "@/lib/content/merge-client-logos";
import { localizePathname, stripLocalePrefix } from "@/lib/i18n/config";
import type {
  SanityAi,
  SanityAiApplicationItem,
  SanityAiCta,
  SanityAiProcessStep,
  SanityAiTextSection,
} from "@/lib/sanity/ai";
import type {
  SanityLocalizedString,
  SanityLocalizedText,
} from "@/lib/sanity/homepage";
import {
  HERO_MEDIA_MAX_WIDTH,
  resolveSanityImage,
  resolveSanityMedia,
  type SanityMediaField,
} from "@/lib/sanity/media";
import { fetchEnabledClientLogos } from "@/lib/sanity/clients";
import { sanitizeHref } from "@/lib/security/safe-href";

type Localized = SanityLocalizedString | SanityLocalizedText | null | undefined;

export type ResolvedAiPageContent = AiPageContent;

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pickLocalized(value: Localized, locale: Locale): string | undefined {
  const localized =
    locale === "en"
      ? clean(value?.en) ?? clean(value?.de)
      : clean(value?.de) ?? clean(value?.en);
  return localized;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function resolveCtaHref(
  href: string | null | undefined,
  locale: Locale,
  fallback: string,
): string {
  const value = sanitizeHref(clean(href));
  if (!value) {
    return fallback;
  }

  if (
    value.startsWith("#") ||
    /^https:/i.test(value) ||
    /^mailto:/i.test(value) ||
    /^tel:/i.test(value)
  ) {
    return value;
  }

  const stripped = stripLocalePrefix(value).replace(/\/$/, "") || "/";
  return localizePathname(stripped, locale);
}

function resolveCta(
  cta: SanityAiCta | undefined,
  locale: Locale,
  fallback: { label: string; href: string },
): { label: string; href: string } {
  const label = pickLocalized(cta?.label, locale) ?? fallback.label;
  const href = resolveCtaHref(cta?.href, locale, fallback.href);
  return { label, href };
}

function mergeOptionalMedia(
  field: SanityMediaField | undefined,
  fallback?: HomepageMedia,
): { media?: HomepageMedia; videoId: string } {
  if (!field) {
    return fallback ? { media: fallback, videoId: "" } : { videoId: "" };
  }

  if (!fallback) {
    const empty: HomepageMedia = {
      src: "",
      alt: "",
      width: 1920,
      height: 1080,
    };
    const resolved = resolveSanityMedia(field, empty);
    if (!resolved.media.src) {
      return { videoId: "" };
    }
    return {
      media: resolved.media,
      // Always assign (incl. "") so a cleared CMS video does not leave a stale ID.
      videoId: resolved.videoId ?? "",
    };
  }

  const resolved = resolveSanityMedia(field, fallback);
  return {
    media: resolved.media,
    videoId: resolved.videoId ?? "",
  };
}

function mergeTextSection(
  base: AiTextBlock,
  section: SanityAiTextSection | undefined,
  locale: Locale,
): AiTextBlock {
  const headline = pickLocalized(section?.headline, locale) ?? base.headline;
  const text = pickLocalized(section?.text, locale);
  const body = text ? splitParagraphs(text) : base.body;
  const mediaResult = mergeOptionalMedia(section?.media, base.media);
  const caption = pickLocalized(section?.caption, locale) ?? base.caption;
  const next: AiTextBlock = {
    headline,
    body: body.length > 0 ? body : base.body,
  };
  if (mediaResult.media) {
    next.media = mediaResult.media;
  }
  // Match Abo showreel: always set videoId when CMS media was present.
  if (section?.media) {
    next.videoId = mediaResult.videoId;
  } else if (base.videoId) {
    next.videoId = base.videoId;
  }
  if (caption) {
    next.caption = caption;
  }
  return next;
}

function mergeApplications(
  base: AiApplicationItem[],
  items: SanityAiApplicationItem[] | null | undefined,
  locale: Locale,
): AiApplicationItem[] {
  const source = (items ?? []).filter(
    (item): item is NonNullable<SanityAiApplicationItem> =>
      Boolean(item && (item.id || item.title)),
  );

  if (source.length === 0) {
    return base.map((item) => ({ ...item }));
  }

  return source.map((item, index) => {
    const fallback = base[index];
    const id = clean(item.id) ?? fallback?.id ?? `application-${index + 1}`;
    const number =
      clean(item.number) ??
      fallback?.number ??
      String(index + 1).padStart(2, "0");
    const title =
      pickLocalized(item.title, locale) ?? fallback?.title ?? "Application";
    const description =
      pickLocalized(item.description, locale) ?? fallback?.description ?? "";

    return { id, number, title, description };
  });
}

function mergeProcessSteps(
  base: AiProcessStep[],
  items: SanityAiProcessStep[] | null | undefined,
  locale: Locale,
): AiProcessStep[] {
  const source = (items ?? []).filter(
    (item): item is NonNullable<SanityAiProcessStep> =>
      Boolean(item && (item.id || item.title)),
  );

  if (source.length === 0) {
    return base.map((item) => ({ ...item }));
  }

  return source.map((item, index) => {
    const fallback = base[index];
    const id = clean(item.id) ?? fallback?.id ?? `step-${index + 1}`;
    const title =
      pickLocalized(item.title, locale) ?? fallback?.title ?? "Step";
    const description =
      pickLocalized(item.description, locale) ?? fallback?.description ?? "";
    return { id, title, description };
  });
}

/**
 * Pure merge of Sanity KI/AI document → frontend content.
 * Safe for client and server. Does not fetch Sanity.
 */
export function mergeSanityAi(
  base: AiPageContent,
  doc: SanityAi,
  locale: Locale,
): ResolvedAiPageContent {
  const merged: ResolvedAiPageContent = {
    ...base,
    seo: { ...base.seo },
    hero: { ...base.hero, media: { ...base.hero.media } },
    intro: {
      ...base.intro,
      body: [...base.intro.body],
      ...(base.intro.media ? { media: { ...base.intro.media } } : {}),
    },
    process: {
      ...base.process,
      steps: base.process.steps.map((step) => ({ ...step })),
    },
    showreel: {
      ...base.showreel,
      cta: { ...base.showreel.cta },
      media: { ...base.showreel.media },
    },
    applications: {
      ...base.applications,
      items: base.applications.items.map((item) => ({ ...item })),
      ...(base.applications.media
        ? { media: { ...base.applications.media } }
        : {}),
    },
    models: {
      ...base.models,
      body: [...base.models.body],
      ...(base.models.media ? { media: { ...base.models.media } } : {}),
    },
    experience: {
      ...base.experience,
      body: [...base.experience.body],
      ...(base.experience.media ? { media: { ...base.experience.media } } : {}),
    },
    approach: {
      ...base.approach,
      body: [...base.approach.body],
      ...(base.approach.media ? { media: { ...base.approach.media } } : {}),
    },
    visuals: { ...base.visuals },
    landscapeBreaks: { ...base.landscapeBreaks },
    clients: {
      ...base.clients,
      logos: [...base.clients.logos],
    },
    closing: {
      ...base.closing,
      cta: { ...base.closing.cta },
    },
  };

  const seoTitle = pickLocalized(doc.seoSection?.title, locale);
  if (seoTitle) merged.seo.title = seoTitle;

  const seoDescription = pickLocalized(doc.seoSection?.description, locale);
  if (seoDescription) merged.seo.description = seoDescription;

  if (doc.seoSection?.ogImage) {
    const og = resolveSanityImage(doc.seoSection.ogImage, {
      src: "",
      alt: "",
      width: 1200,
      height: 630,
    });
    if (og.src) {
      merged.seo.ogImagePath = og.src;
    }
  }

  const heroLabel = pickLocalized(doc.heroSection?.label, locale);
  if (heroLabel) merged.hero.label = heroLabel;

  const heroHeadline = pickLocalized(doc.heroSection?.headline, locale);
  if (heroHeadline) merged.hero.headline = heroHeadline;

  const heroText = pickLocalized(doc.heroSection?.text, locale);
  if (heroText) merged.hero.body = heroText;

  if (doc.heroSection?.media) {
    const heroMedia = resolveSanityMedia(
      doc.heroSection.media,
      merged.hero.media,
      { width: HERO_MEDIA_MAX_WIDTH },
    );
    merged.hero.media = heroMedia.media;
    // Always assign (incl. "") — same stale-ID guard as Abo showreel merge.
    merged.hero.videoId = heroMedia.videoId ?? "";
    if (heroMedia.mobileMedia?.src) {
      merged.hero.mobilePoster = heroMedia.mobileMedia;
    } else {
      delete merged.hero.mobilePoster;
    }

    // Video selected but Vimeo URL missing: keep the still Image asset as
    // visible fallback (prefer image over portrait poster), matching homepage
    // “image when no videoId” behaviour.
    if (!merged.hero.videoId && doc.heroSection.media.mediaType === "video") {
      const still = resolveSanityMedia(
        {
          mediaType: "image",
          image: doc.heroSection.media.image ?? doc.heroSection.media.poster,
        },
        merged.hero.media,
        { width: HERO_MEDIA_MAX_WIDTH },
      );
      if (still.media.src) {
        merged.hero.media = still.media;
      }
    }
  }

  merged.intro = mergeTextSection(merged.intro, doc.introSection, locale);

  const processLabel = pickLocalized(doc.processSection?.label, locale);
  if (processLabel) merged.process.label = processLabel;
  const processHeadline = pickLocalized(doc.processSection?.headline, locale);
  if (processHeadline) merged.process.headline = processHeadline;
  const processIntro = pickLocalized(doc.processSection?.introduction, locale);
  if (processIntro) merged.process.introduction = processIntro;
  merged.process.steps = mergeProcessSteps(
    merged.process.steps,
    doc.processSection?.steps,
    locale,
  );

  const showreelLabel = pickLocalized(doc.showreelSection?.label, locale);
  if (showreelLabel) merged.showreel.label = showreelLabel;
  const showreelHeadline = pickLocalized(doc.showreelSection?.headline, locale);
  if (showreelHeadline) merged.showreel.headline = showreelHeadline;
  const showreelText = pickLocalized(doc.showreelSection?.text, locale);
  if (showreelText) merged.showreel.body = showreelText;
  if (doc.showreelSection?.cta) {
    merged.showreel.cta = resolveCta(
      doc.showreelSection.cta,
      locale,
      merged.showreel.cta,
    );
  }
  if (doc.showreelSection?.media) {
    const showreelMedia = resolveSanityMedia(
      doc.showreelSection.media,
      merged.showreel.media,
    );
    merged.showreel.media = showreelMedia.media;
    merged.showreel.videoId = showreelMedia.videoId ?? "";
  }

  const applicationsHeadline = pickLocalized(
    doc.applicationsSection?.headline,
    locale,
  );
  if (applicationsHeadline) {
    merged.applications.headline = applicationsHeadline;
  }
  merged.applications.items = mergeApplications(
    merged.applications.items,
    doc.applicationsSection?.items,
    locale,
  );
  if (doc.applicationsSection?.media) {
    const applicationsMedia = mergeOptionalMedia(
      doc.applicationsSection.media,
      merged.applications.media,
    );
    if (applicationsMedia.media) {
      merged.applications.media = applicationsMedia.media;
    }
    merged.applications.videoId = applicationsMedia.videoId;
  }
  const applicationsCaption = pickLocalized(
    doc.applicationsSection?.caption,
    locale,
  );
  if (applicationsCaption) {
    merged.applications.caption = applicationsCaption;
  }

  merged.models = mergeTextSection(merged.models, doc.modelsSection, locale);
  merged.experience = mergeTextSection(
    merged.experience,
    doc.experienceSection,
    locale,
  );
  merged.approach = mergeTextSection(
    merged.approach,
    doc.approachSection,
    locale,
  );

  if (doc.visualMedia) {
    const stillFallback: HomepageMedia = {
      src: "",
      alt: "",
      width: 1920,
      height: 1080,
    };
    const mergeStill = (
      image: Parameters<typeof resolveSanityImage>[0],
    ): HomepageMedia | undefined => {
      if (!image) return undefined;
      const resolved = resolveSanityImage(image, stillFallback);
      return resolved.src ? resolved : undefined;
    };

    const keyVisual = mergeStill(doc.visualMedia.keyVisual);
    if (keyVisual) merged.visuals.keyVisual = keyVisual;

    const clayVilla = mergeStill(doc.visualMedia.clayVilla);
    if (clayVilla) merged.visuals.clayVilla = clayVilla;

    const photoVilla = mergeStill(doc.visualMedia.photoVilla);
    if (photoVilla) merged.visuals.photoVilla = photoVilla;

    const contentFormats = mergeStill(doc.visualMedia.contentFormats);
    if (contentFormats) merged.visuals.contentFormats = contentFormats;

    const distributionChannels = mergeStill(
      doc.visualMedia.distributionChannels,
    );
    if (distributionChannels) {
      merged.visuals.distributionChannels = distributionChannels;
    }
  }

  if (doc.landscapeBreaks) {
    const stillFallback: HomepageMedia = {
      src: "",
      alt: "",
      width: 1920,
      height: 1080,
    };
    const mergeBreak = (
      slot: { image?: Parameters<typeof resolveSanityImage>[0] } | null | undefined,
    ): HomepageMedia | undefined => {
      if (!slot?.image) return undefined;
      const resolved = resolveSanityImage(slot.image, stillFallback);
      return resolved.src ? resolved : undefined;
    };

    const afterAi = mergeBreak(doc.landscapeBreaks.afterAi);
    if (afterAi) merged.landscapeBreaks.afterAi = afterAi;

    const afterDistribution = mergeBreak(doc.landscapeBreaks.afterDistribution);
    if (afterDistribution) {
      merged.landscapeBreaks.afterDistribution = afterDistribution;
    }

    const afterVisibility = mergeBreak(doc.landscapeBreaks.afterVisibility);
    if (afterVisibility) {
      merged.landscapeBreaks.afterVisibility = afterVisibility;
    }

    const midApplications = mergeBreak(doc.landscapeBreaks.midApplications);
    if (midApplications) {
      merged.landscapeBreaks.midApplications = midApplications;
    }

    const afterApplications = mergeBreak(doc.landscapeBreaks.afterApplications);
    if (afterApplications) {
      merged.landscapeBreaks.afterApplications = afterApplications;
    }

    const afterModels = mergeBreak(doc.landscapeBreaks.afterModels);
    if (afterModels) {
      merged.landscapeBreaks.afterModels = afterModels;
    }

    const afterExperience = mergeBreak(doc.landscapeBreaks.afterExperience);
    if (afterExperience) {
      merged.landscapeBreaks.afterExperience = afterExperience;
    }
  }

  const clientsLabel = pickLocalized(doc.clientsLabel, locale);
  if (clientsLabel) merged.clients.label = clientsLabel;

  const closingHeadline = pickLocalized(doc.closingSection?.headline, locale);
  if (closingHeadline) merged.closing.headline = closingHeadline;

  const closingText = pickLocalized(doc.closingSection?.text, locale);
  if (closingText) merged.closing.text = closingText;

  if (doc.closingSection?.cta) {
    merged.closing.cta = resolveCta(
      doc.closingSection.cta,
      locale,
      merged.closing.cta,
    );
  }

  return merged;
}

/** Local-only resolution (no Sanity fetch). Used as Live fallback base. */
export function getLocalResolvedAiContent(
  locale: Locale,
): ResolvedAiPageContent {
  return getAiPageContent(locale);
}

/** Attach live Client logos when available (same source as About/Contact). */
export async function mergeAiClientLogos(
  content: ResolvedAiPageContent,
): Promise<ResolvedAiPageContent> {
  try {
    const clients = await fetchEnabledClientLogos();
    return {
      ...content,
      clients: {
        ...content.clients,
        logos: mergeClientLogos(content.clients.logos, clients),
      },
    };
  } catch {
    return content;
  }
}
