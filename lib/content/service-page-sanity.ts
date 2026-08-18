import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type {
  ServicePageContent,
  ServicePageSlug,
  ServiceSolutionItem,
} from "@/types/service-page";
import type { HomepageMedia, HomepageProject } from "@/types/homepage";
import { getServicePageContent } from "@/lib/content/services";
import { urlForImage } from "@/lib/sanity/image";
import {
  fetchSanityServicePage,
  SERVICE_DOCUMENT_IDS,
  serviceImageSource,
  type SanityServiceImage,
  type SanityServicePage,
} from "@/lib/sanity/service";

const SOLUTION_ICONS = new Set<ServiceSolutionItem["icon"]>([
  "film",
  "portrait",
  "reportage",
  "internal",
  "product-photo",
  "product-film",
  "viz3d",
  "animation",
  "architecture",
  "drone",
  "tour",
  "strategy",
  "social",
  "content",
  "abo",
]);

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function splitParagraphs(text: string, fallback: string[]): string[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.length > 0 ? blocks : fallback;
}

function splitAroundAccent(
  full: string,
  accentWord: string | undefined,
): { before: string; accent: string; after: string } | null {
  const index = accentWord ? full.indexOf(accentWord) : -1;
  if (index === -1 || !accentWord) {
    return null;
  }
  return {
    before: full.slice(0, index),
    accent: accentWord,
    after: full.slice(index + accentWord.length),
  };
}

function parseVimeoId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1];
}

function resolveImage(
  base: HomepageMedia,
  image: SanityServiceImage | undefined,
): HomepageMedia {
  if (!image) {
    return base;
  }

  let src = clean(image.url ?? undefined);
  const source = serviceImageSource(image);
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

function resolveIcon(
  value: string | null | undefined,
  fallback: ServiceSolutionItem["icon"],
): ServiceSolutionItem["icon"] {
  if (value && SOLUTION_ICONS.has(value as ServiceSolutionItem["icon"])) {
    return value as ServiceSolutionItem["icon"];
  }
  return fallback;
}

/**
 * Merge published Sanity service fields onto the local page structure.
 * Local content remains the base for missing fields, logos, and EN copy.
 */
export function mergeSanityServicePage(
  base: ServicePageContent,
  doc: SanityServicePage,
): ServicePageContent {
  const merged: ServicePageContent = {
    ...base,
    seo: { ...base.seo },
    hero: {
      ...base.hero,
      primaryCta: { ...base.hero.primaryCta },
      media: { ...base.hero.media },
      body: [...base.hero.body],
    },
    solutions: {
      ...base.solutions,
      items: base.solutions.items.map((item) => ({ ...item })),
    },
    showreel: {
      ...base.showreel,
      cta: { ...base.showreel.cta },
      media: { ...base.showreel.media },
    },
    projects: {
      ...base.projects,
      viewAll: { ...base.projects.viewAll },
      items: base.projects.items.map((item) => ({
        ...item,
        image: { ...item.image },
      })),
    },
    about: {
      ...base.about,
      cta: { ...base.about.cta },
      media: { ...base.about.media },
      body: [...base.about.body],
    },
    clients: { ...base.clients },
    finalCta: { ...base.finalCta, cta: { ...base.finalCta.cta } },
  };

  const seoTitle = clean(doc.seoTitle);
  if (seoTitle) merged.seo.title = seoTitle;
  const seoDescription = clean(doc.seoDescription);
  if (seoDescription) merged.seo.description = seoDescription;

  const heroLabel = clean(doc.heroLabel) ?? clean(doc.displayTitle);
  if (heroLabel) merged.hero.label = heroLabel;
  const heroHeadline = clean(doc.heroHeadline);
  if (heroHeadline) merged.hero.headline = heroHeadline;
  if (doc.heroHeadlineAccent != null) {
    merged.hero.headlineAccent = doc.heroHeadlineAccent;
  }
  const heroSubheadline = clean(doc.heroSubheadline);
  if (heroSubheadline) merged.hero.subheadline = heroSubheadline;
  const heroIntroText = clean(doc.heroIntroText);
  if (heroIntroText) {
    merged.hero.body = splitParagraphs(heroIntroText, base.hero.body);
  }
  const heroCtaLabel = clean(doc.heroCtaLabel);
  if (heroCtaLabel) merged.hero.primaryCta.label = heroCtaLabel;
  const heroCtaHref = clean(doc.heroCtaHref);
  if (heroCtaHref) merged.hero.primaryCta.href = heroCtaHref;
  merged.hero.media = resolveImage(base.hero.media, doc.heroImage);

  const solutionsLabel = clean(doc.solutionsLabel);
  if (solutionsLabel) merged.solutions.label = solutionsLabel;
  const solutionsHeadline = clean(doc.solutionsHeadline);
  if (solutionsHeadline) merged.solutions.headline = solutionsHeadline;
  if (doc.solutions && doc.solutions.length > 0) {
    merged.solutions.items = doc.solutions.map((item, index) => {
      const fallback = base.solutions.items[index];
      return {
        id: clean(item.itemId) ?? fallback?.id ?? `solution-${index}`,
        title: clean(item.title) ?? fallback?.title ?? "",
        description: clean(item.description) ?? fallback?.description ?? "",
        href: clean(item.href) ?? fallback?.href ?? base.hero.primaryCta.href,
        icon: resolveIcon(item.icon, fallback?.icon ?? "content"),
      };
    });
  }

  const showreelLabel = clean(doc.showreelLabel);
  if (showreelLabel) merged.showreel.label = showreelLabel;
  const showreelHeadline = clean(doc.showreelHeadline);
  if (showreelHeadline) {
    merged.showreel.headline = showreelHeadline.replace(/\.+$/, "");
  }
  const showreelBody = clean(doc.showreelBody);
  if (showreelBody) merged.showreel.body = showreelBody;
  const showreelCtaLabel = clean(doc.showreelCtaLabel);
  if (showreelCtaLabel) merged.showreel.cta.label = showreelCtaLabel;
  const showreelCtaHref = clean(doc.showreelCtaHref);
  if (showreelCtaHref) merged.showreel.cta.href = showreelCtaHref;
  merged.showreel.media = resolveImage(base.showreel.media, doc.showreelImage);
  const videoId = parseVimeoId(clean(doc.showreelVideoId));
  if (videoId) merged.showreel.videoId = videoId;

  const projectsLabel = clean(doc.projectsLabel);
  if (projectsLabel) merged.projects.label = projectsLabel;
  const projectsHeadline = clean(doc.projectsHeadline);
  if (projectsHeadline) merged.projects.headline = projectsHeadline;
  const projectsViewAllLabel = clean(doc.projectsViewAllLabel);
  if (projectsViewAllLabel) merged.projects.viewAll.label = projectsViewAllLabel;
  const projectsViewAllHref = clean(doc.projectsViewAllHref);
  if (projectsViewAllHref) merged.projects.viewAll.href = projectsViewAllHref;
  if (doc.projects && doc.projects.length > 0) {
    merged.projects.items = doc.projects.map((item, index) => {
      const fallback: HomepageProject | undefined = base.projects.items[index];
      const image = resolveImage(
        fallback?.image ?? base.hero.media,
        item.image,
      );
      return {
        id: clean(item.itemId) ?? fallback?.id ?? `project-${index}`,
        title: clean(item.title) ?? fallback?.title ?? merged.hero.label,
        category: clean(item.category) ?? fallback?.category ?? "",
        href: clean(item.href) ?? fallback?.href ?? base.projects.viewAll.href,
        image,
        isPlaceholder:
          item.isPlaceholder ?? fallback?.isPlaceholder ?? true,
      };
    });
  }

  const aboutLabel = clean(doc.aboutLabel);
  if (aboutLabel) merged.about.label = aboutLabel;
  const aboutHeadline = clean(doc.aboutHeadline);
  if (aboutHeadline) merged.about.headline = aboutHeadline;
  if (doc.aboutHeadlineAccent != null) {
    merged.about.headlineAccent = doc.aboutHeadlineAccent;
  }
  if (doc.aboutSubheadline != null) {
    merged.about.subheadline = doc.aboutSubheadline;
  }
  const aboutText = clean(doc.aboutText);
  if (aboutText) merged.about.body = splitParagraphs(aboutText, base.about.body);
  const aboutCtaLabel = clean(doc.aboutCtaLabel);
  if (aboutCtaLabel) merged.about.cta.label = aboutCtaLabel;
  const aboutCtaHref = clean(doc.aboutCtaHref);
  if (aboutCtaHref) merged.about.cta.href = aboutCtaHref;
  merged.about.media = resolveImage(base.about.media, doc.aboutImage);

  const clientsLabel = clean(doc.clientsLabel);
  if (clientsLabel) merged.clients.label = clientsLabel;

  const ctaHeadline = clean(doc.ctaHeadline);
  if (ctaHeadline) {
    const split = splitAroundAccent(ctaHeadline, base.finalCta.headlineAccent);
    if (split) {
      merged.finalCta.headlineBefore = split.before;
      merged.finalCta.headlineAccent = split.accent;
      merged.finalCta.headlineAfter = split.after;
    } else {
      merged.finalCta.headlineBefore = ctaHeadline;
      merged.finalCta.headlineAccent = "";
      merged.finalCta.headlineAfter = "";
    }
  }
  const ctaText = clean(doc.ctaText);
  if (ctaText) merged.finalCta.text = ctaText;
  const ctaLabel = clean(doc.ctaLabel);
  if (ctaLabel) merged.finalCta.cta.label = ctaLabel;
  const ctaHref = clean(doc.ctaHref);
  if (ctaHref) merged.finalCta.cta.href = ctaHref;

  return merged;
}

/**
 * Build-time service page resolver.
 *
 * German service routes read published Sanity documents. English keeps the
 * local source (Sanity currently holds DE copy). Any fetch failure falls back
 * to local content so the static export always succeeds.
 */
export const getResolvedServicePageContent = cache(
  async (
    slug: ServicePageSlug,
    locale: Locale,
  ): Promise<ServicePageContent> => {
    const base = getServicePageContent(slug, locale);

    if (locale !== "de") {
      return base;
    }

    const doc = await fetchSanityServicePage(slug);
    if (!doc) {
      console.warn(
        `[sanity] German service "${slug}": published document missing — using local content.`,
      );
      return base;
    }

    console.info(
      `[sanity] German service "${slug}" sourced from published document ${doc._id ?? SERVICE_DOCUMENT_IDS[slug]}.`,
    );
    return mergeSanityServicePage(base, doc);
  },
);
