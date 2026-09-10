import type { Locale } from "@/types/i18n";
import type { HomepageBenefit, HomepageMedia } from "@/types/homepage";
import {
  getAboPageContent,
  type AboPageContent,
} from "@/lib/content/abo-page";
import { localizePathname, stripLocalePrefix } from "@/lib/i18n/config";
import type {
  SanityAbo,
  SanityAboBenefitItem,
  SanityAboCta,
  SanityAboProcessStep,
  SanityAboScopeItem,
} from "@/lib/sanity/abo";
import type {
  SanityLocalizedString,
  SanityLocalizedText,
} from "@/lib/sanity/homepage";
import { resolveSanityImage, resolveSanityMedia } from "@/lib/sanity/media";
import type { SanityMediaField } from "@/lib/sanity/media";

type Localized = SanityLocalizedString | SanityLocalizedText | null | undefined;

export type ResolvedAboPageContent = AboPageContent;

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
  const value = clean(href);
  if (!value) {
    return fallback;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("mailto:")) {
    return value;
  }

  const stripped = stripLocalePrefix(value).replace(/\/$/, "") || "/";
  if (stripped === "/de/contact") {
    return localizePathname("/contact", locale);
  }

  return localizePathname(value, locale);
}

function resolveCta(
  cta: SanityAboCta | undefined,
  locale: Locale,
  fallback: { label: string; href: string },
): { label: string; href: string } {
  const label = pickLocalized(cta?.label, locale) ?? fallback.label;
  const href = resolveCtaHref(cta?.href, locale, fallback.href);
  return { label, href };
}

function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function mergeBenefits(
  base: HomepageBenefit[],
  items: SanityAboBenefitItem[] | null | undefined,
  locale: Locale,
): HomepageBenefit[] {
  const source = (items ?? []).filter(
    (item): item is NonNullable<SanityAboBenefitItem> => Boolean(item?.id),
  );

  if (source.length === 0) {
    return base;
  }

  const ordered = sortByOrder(source);
  const merged = ordered
    .map((item, index) => {
      const id = clean(item.id ?? undefined);
      if (!id) return null;
      const fallback = base.find((benefit) => benefit.id === id) ?? base[index];
      const title = pickLocalized(item.title, locale) ?? fallback?.title;
      const description =
        pickLocalized(item.description, locale) ?? fallback?.description;
      if (!title || !description) return null;
      return { id, title, description };
    })
    .filter((item): item is HomepageBenefit => Boolean(item));

  return merged.length > 0 ? merged : base;
}

function mergeProcessSteps(
  base: AboPageContent["process"]["steps"],
  steps: SanityAboProcessStep[] | null | undefined,
  locale: Locale,
): AboPageContent["process"]["steps"] {
  const source = (steps ?? []).filter(
    (step): step is NonNullable<SanityAboProcessStep> => Boolean(step),
  );

  if (source.length === 0) {
    return base;
  }

  const merged = source
    .map((step, index) => {
      const fallback = base[index];
      const id = clean(step.id ?? undefined) ?? fallback?.id ?? `step-${index}`;
      const number =
        clean(step.number ?? undefined) ?? fallback?.number ?? String(index + 1).padStart(2, "0");
      const title = pickLocalized(step.title, locale) ?? fallback?.title;
      const description =
        pickLocalized(step.description, locale) ?? fallback?.description;
      if (!title || !description) return null;
      return { id, number, title, description };
    })
    .filter(
      (
        step,
      ): step is AboPageContent["process"]["steps"][number] => Boolean(step),
    );

  return merged.length > 0 ? merged : base;
}

function mergeScopeItems(
  base: string[],
  items: SanityAboScopeItem[] | null | undefined,
  locale: Locale,
): string[] {
  const source = (items ?? []).filter(
    (item): item is NonNullable<SanityAboScopeItem> => Boolean(item),
  );

  if (source.length === 0) {
    return base;
  }

  const merged = source
    .map((item) => pickLocalized(item.label, locale))
    .filter((label): label is string => Boolean(label));

  return merged.length > 0 ? merged : base;
}

function applyMedia(
  base: HomepageMedia,
  media: SanityMediaField | undefined,
): { media: HomepageMedia; videoId?: string } {
  return resolveSanityMedia(media, base, { width: 1600 });
}

/**
 * Pure merge of Sanity Content-Abo document → frontend page content.
 */
export function mergeSanityAbo(
  base: AboPageContent,
  doc: SanityAbo,
  locale: Locale,
): ResolvedAboPageContent {
  const merged: ResolvedAboPageContent = {
    ...base,
    seo: { ...base.seo },
    hero: {
      ...base.hero,
      primaryCta: { ...base.hero.primaryCta },
      media: { ...base.hero.media },
    },
    problem: { ...base.problem, body: [...base.problem.body] },
    benefits: { items: [...base.benefits.items] },
    process: {
      ...base.process,
      steps: base.process.steps.map((step) => ({ ...step })),
    },
    scope: {
      ...base.scope,
      items: [...base.scope.items],
    },
    showreel: {
      ...base.showreel,
      cta: { ...base.showreel.cta },
      media: { ...base.showreel.media },
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
      alt: merged.seo.title,
      width: 1200,
      height: 630,
    });
    if (og.src) merged.seo.ogImagePath = og.src;
  }

  const heroLabel = pickLocalized(doc.heroSection?.label, locale);
  if (heroLabel) merged.hero.label = heroLabel;

  const heroHeadline = pickLocalized(doc.heroSection?.headline, locale);
  if (heroHeadline) merged.hero.headline = heroHeadline;

  const heroText = pickLocalized(doc.heroSection?.text, locale);
  if (heroText) merged.hero.body = heroText;

  merged.hero.primaryCta = resolveCta(
    doc.heroSection?.cta,
    locale,
    base.hero.primaryCta,
  );

  if (doc.heroSection?.media) {
    const media = doc.heroSection.media;
    // /content-abo renders a still image. A leftover video selection must not
    // hide a newly uploaded hero image behind an older poster/local fallback.
    const heroMedia = locale === "de" && (media.image?.asset?._ref || media.image?.url)
      ? { media: resolveSanityImage(media.image, base.hero.media, 1600) }
      : applyMedia(base.hero.media, media);
    merged.hero.media = heroMedia.media;
  }

  const problemLabel = pickLocalized(doc.problemSection?.label, locale);
  if (problemLabel) merged.problem.label = problemLabel;

  const problemHeadline = pickLocalized(doc.problemSection?.headline, locale);
  if (problemHeadline) merged.problem.headline = problemHeadline;

  const problemText = pickLocalized(doc.problemSection?.text, locale);
  if (problemText) merged.problem.body = splitParagraphs(problemText);

  const problemHighlight = pickLocalized(doc.problemSection?.highlight, locale);
  if (problemHighlight) merged.problem.highlight = problemHighlight;

  merged.benefits.items = mergeBenefits(
    base.benefits.items,
    doc.benefitsSection?.items,
    locale,
  );

  const processHeadline = pickLocalized(doc.processSection?.headline, locale);
  if (processHeadline) merged.process.headline = processHeadline;

  merged.process.steps = mergeProcessSteps(
    base.process.steps,
    doc.processSection?.steps,
    locale,
  );

  const scopeHeadline = pickLocalized(doc.scopeSection?.headline, locale);
  if (scopeHeadline) merged.scope.headline = scopeHeadline;

  const scopeIntro = pickLocalized(doc.scopeSection?.introduction, locale);
  if (scopeIntro) merged.scope.introduction = scopeIntro;

  merged.scope.items = mergeScopeItems(
    base.scope.items,
    doc.scopeSection?.items,
    locale,
  );

  const scopeClosing = pickLocalized(doc.scopeSection?.closing, locale);
  if (scopeClosing) merged.scope.closing = scopeClosing;

  const scopeHighlight = pickLocalized(doc.scopeSection?.highlight, locale);
  if (scopeHighlight) merged.scope.highlight = scopeHighlight;

  const showreelLabel = pickLocalized(doc.showreelSection?.label, locale);
  if (showreelLabel) merged.showreel.label = showreelLabel;

  const showreelHeadline = pickLocalized(doc.showreelSection?.headline, locale);
  if (showreelHeadline) merged.showreel.headline = showreelHeadline;

  const showreelText = pickLocalized(doc.showreelSection?.text, locale);
  if (showreelText) merged.showreel.body = showreelText;

  merged.showreel.cta = resolveCta(
    doc.showreelSection?.cta,
    locale,
    base.showreel.cta,
  );

  if (doc.showreelSection?.media) {
    const showreelMedia = applyMedia(
      base.showreel.media,
      doc.showreelSection.media,
    );
    merged.showreel.media = showreelMedia.media;
    // Always assign — same as homepage merge. A truthy-only update left the
    // hardcoded `showreels.homepage` Vimeo ID in place when Studio switched
    // the block to image-only (or cleared the Vimeo URL), so showreel media
    // edits appeared to have no effect.
    merged.showreel.videoId = showreelMedia.videoId ?? "";
  }

  const closingLabel = pickLocalized(doc.closingSection?.label, locale);
  if (closingLabel) merged.closing.label = closingLabel;

  const closingHeadline = pickLocalized(doc.closingSection?.headline, locale);
  if (closingHeadline) merged.closing.headline = closingHeadline;

  const closingText = pickLocalized(doc.closingSection?.text, locale);
  if (closingText) merged.closing.text = closingText;

  merged.closing.cta = resolveCta(
    doc.closingSection?.cta,
    locale,
    base.closing.cta,
  );

  return merged;
}

export function getLocalResolvedAboContent(
  locale: Locale,
): ResolvedAboPageContent {
  return getAboPageContent(locale);
}
