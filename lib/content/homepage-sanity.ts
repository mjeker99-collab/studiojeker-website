import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type {
  HomepageBenefit,
  HomepageClientLogo,
  HomepageContent,
  HomepageMedia,
  HomepageProject,
  HomepageService,
} from "@/types/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { localizePathname } from "@/lib/i18n/config";
import {
  fetchSanityHomepage,
  type SanityCta,
  type SanityHomepage,
  type SanityHomepageBenefitItem,
  type SanityHomepageClientRef,
  type SanityHomepageProjectRef,
  type SanityHomepageServiceItem,
  type SanityLocalizedString,
  type SanityLocalizedText,
} from "@/lib/sanity/homepage";
import {
  resolveSanityImage,
  resolveSanityMedia,
  type SanityImageProjection,
  type SanityMediaField,
} from "@/lib/sanity/media";
import { extractVimeoId } from "@/lib/sanity/vimeo";

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pickLocalized(
  value: SanityLocalizedString | SanityLocalizedText | undefined,
  locale: Locale,
  legacyDe?: string | null,
): string | undefined {
  const localized =
    locale === "en"
      ? clean(value?.en) ?? clean(value?.de)
      : clean(value?.de) ?? clean(value?.en);

  if (localized) {
    return localized;
  }

  if (locale === "de") {
    return clean(legacyDe);
  }

  return undefined;
}

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

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function resolveHref(
  href: string | null | undefined,
  locale: Locale,
  fallback: string,
): string {
  const value = clean(href);
  if (!value) {
    return fallback;
  }

  return localizePathname(value, locale);
}

function resolveLegacyHeroMedia(
  base: HomepageMedia,
  heroImage: SanityImageProjection | undefined,
  heroVideoUrl: string | null | undefined,
): { media: HomepageMedia; videoId?: string } {
  const videoId = extractVimeoId(heroVideoUrl ?? undefined);
  if (videoId) {
    return {
      media: resolveSanityImage(heroImage, base),
      videoId,
    };
  }

  return {
    media: resolveSanityImage(heroImage, base),
  };
}

function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function mergeServices(
  base: HomepageContent["services"],
  locale: Locale,
  section: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    items?: SanityHomepageServiceItem[] | null;
  } | null | undefined,
  legacyHeadline?: string | null,
): HomepageContent["services"] {
  const merged = { ...base, items: [...base.items] };

  const label = pickLocalized(section?.label, locale);
  if (label) merged.label = label;

  const headline = pickLocalized(section?.headline, locale, legacyHeadline);
  if (headline) merged.headline = headline;

  const items = section?.items?.filter(Boolean) ?? [];
  if (items.length === 0) {
    return merged;
  }

  const baseById = new Map(base.items.map((item) => [item.id, item]));

  merged.items = sortByOrder(items)
    .map((item) => mergeServiceItem(item, locale, baseById))
    .filter((item): item is HomepageService => Boolean(item));

  if (merged.items.length === 0) {
    merged.items = base.items;
  }

  return merged;
}

function mergeServiceItem(
  item: SanityHomepageServiceItem,
  locale: Locale,
  baseById: Map<string, HomepageService>,
): HomepageService | null {
  const serviceId = item.serviceId;
  if (!serviceId) {
    return null;
  }

  const fallback = baseById.get(serviceId);
  if (!fallback) {
    return null;
  }

  const title = pickLocalized(item.title, locale);
  const description = pickLocalized(item.description, locale);

  return {
    id: serviceId,
    title: title ?? fallback.title,
    description: description ?? fallback.description,
    href: resolveHref(item.href, locale, fallback.href),
  };
}

function mergeBenefits(
  base: HomepageBenefit[],
  locale: Locale,
  items: SanityHomepageBenefitItem[] | null | undefined,
): HomepageBenefit[] {
  const cmsItems = items?.filter((item) => item.id) ?? [];
  if (cmsItems.length === 0) {
    return base;
  }

  const baseById = new Map(base.map((item) => [item.id, item]));

  const merged = sortByOrder(cmsItems)
    .map((item) => {
      const id = item.id!;
      const fallback = baseById.get(id);
      const title = pickLocalized(item.title, locale);
      const description = pickLocalized(item.description, locale);

      if (!title && !description && !fallback) {
        return null;
      }

      return {
        id,
        title: title ?? fallback?.title ?? "",
        description: description ?? fallback?.description ?? "",
      };
    })
    .filter((item): item is HomepageBenefit => Boolean(item?.title));

  return merged.length > 0 ? merged : base;
}

function mergeProjects(
  base: HomepageContent["projects"],
  locale: Locale,
  section: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    viewAllCta?: SanityCta;
    selectedProjects?: SanityHomepageProjectRef[] | null;
  } | null | undefined,
  legacyHeadline?: string | null,
): HomepageContent["projects"] {
  const merged = {
    ...base,
    viewAll: { ...base.viewAll },
    items: [...base.items],
  };

  const label = pickLocalized(section?.label, locale);
  if (label) merged.label = label;

  const headline = pickLocalized(section?.headline, locale, legacyHeadline);
  if (headline) merged.headline = headline;

  const viewAllLabel = pickLocalized(section?.viewAllCta?.label, locale);
  if (viewAllLabel) merged.viewAll.label = viewAllLabel;

  merged.viewAll.href = resolveHref(
    section?.viewAllCta?.href,
    locale,
    base.viewAll.href,
  );

  const selected = section?.selectedProjects?.filter(Boolean) ?? [];
  if (selected.length === 0) {
    return merged;
  }

  const cmsItems = selected
    .filter((project): project is NonNullable<SanityHomepageProjectRef> =>
      Boolean(project),
    )
    .map((project) => mergeProjectItem(project, locale, base.viewAll.href))
    .filter((item): item is HomepageProject => Boolean(item));

  if (cmsItems.length > 0) {
    merged.items = cmsItems;
  }

  return merged;
}

function mergeProjectItem(
  project: NonNullable<SanityHomepageProjectRef>,
  locale: Locale,
  workHref: string,
): HomepageProject | null {
  const title = clean(project.title ?? undefined);
  if (!title) {
    return null;
  }

  const category = clean(project.category?.title ?? undefined) ?? "";
  const fallbackImage: HomepageMedia = {
    src: "/images/architecture/Architekturvisualisierung.jpg",
    alt: title,
    width: 1200,
    height: 800,
  };

  const image = resolveSanityImage(project.mainImage, fallbackImage, 1200);
  const slug = clean(project.slug?.current ?? undefined);
  const href = slug
    ? localizePathname(`/work/${slug}`, locale)
    : workHref;

  return {
    id: project._id ?? title,
    title,
    category,
    href,
    image,
    isPlaceholder: false,
  };
}

function mergeClientLogos(
  base: HomepageClientLogo[],
  clients: SanityHomepageClientRef[] | null | undefined,
): HomepageClientLogo[] {
  const source = clients ?? [];
  const activeClients = sortByOrder(
    source.filter(
      (client): client is NonNullable<SanityHomepageClientRef> =>
        Boolean(client && client.active !== false && client.logo),
    ),
  );

  if (activeClients.length === 0) {
    return base;
  }

  const merged = activeClients
    .map((client, index) => {
      const name = clean(client.name ?? undefined);
      const logo = client.logo;
      if (!name || !logo) {
        return null;
      }

      const resolved = resolveSanityImage(logo, {
        src: "",
        alt: name,
        width: 160,
        height: 48,
      });

      if (!resolved.src) {
        return null;
      }

      return {
        id: client._id ?? `client-${index}`,
        name,
        src: resolved.src,
        width: resolved.width,
        height: resolved.height,
      };
    })
    .filter((logo): logo is HomepageClientLogo => Boolean(logo?.src));

  return merged.length > 0 ? merged : base;
}

function applyMediaSection(
  fallback: HomepageMedia,
  field: SanityMediaField | undefined,
  width?: number,
): { media: HomepageMedia; videoId?: string } {
  return resolveSanityMedia(field, fallback, { width });
}

export function mergeSanityHomepage(
  base: HomepageContent,
  doc: SanityHomepage,
  locale: Locale,
): HomepageContent {
  const merged: HomepageContent = {
    ...base,
    seo: { ...base.seo },
    hero: { ...base.hero, media: { ...base.hero.media } },
    services: { ...base.services, items: [...base.services.items] },
    showreel: {
      ...base.showreel,
      media: { ...base.showreel.media },
      cta: { ...base.showreel.cta },
    },
    projects: {
      ...base.projects,
      viewAll: { ...base.projects.viewAll },
      items: [...base.projects.items],
    },
    abo: {
      ...base.abo,
      media: { ...base.abo.media },
      cta: { ...base.abo.cta },
      benefits: [...base.abo.benefits],
    },
    about: { ...base.about, media: { ...base.about.media }, cta: { ...base.about.cta } },
    clients: { ...base.clients, logos: [...base.clients.logos] },
    finalCta: { ...base.finalCta, cta: { ...base.finalCta.cta } },
  };

  const seoTitle = pickLocalized(
    doc.seoMetaTitle ?? doc.seoSection?.title,
    locale,
    doc.seoTitle,
  );
  if (seoTitle) merged.seo.title = seoTitle;

  const seoDescription = pickLocalized(
    doc.seoMetaDescription ?? doc.seoSection?.description,
    locale,
    doc.seoDescription,
  );
  if (seoDescription) merged.seo.description = seoDescription;

  const ogImage = resolveSanityImage(doc.seoOgImage ?? doc.seoSection?.ogImage, {
    src: "",
    alt: "",
    width: 1200,
    height: 630,
  });
  if (ogImage.src) {
    merged.seo.ogImagePath = ogImage.src;
  }

  const heroHeadline =
    pickLocalized(
      doc.heroHeadlineLocalized ?? doc.heroSection?.headline,
      locale,
      doc.heroHeadline,
    ) ?? undefined;
  if (heroHeadline) {
    const { headline, accent } = splitTrailingAccent(
      heroHeadline,
      base.hero.headlineAccent,
    );
    merged.hero.headline = headline;
    merged.hero.headlineAccent = accent;
  }

  const heroSubheadline = pickLocalized(
    doc.heroSubheadline ?? doc.heroSection?.subheadline,
    locale,
  );
  if (heroSubheadline) {
    merged.hero.subheadline = heroSubheadline;
  }

  const hasStructuredHeroIntro = Boolean(
    doc.heroIntro ||
      doc.heroSubheadline ||
      doc.heroSection?.intro ||
      doc.heroSection?.subheadline,
  );
  const heroIntro = pickLocalized(
    doc.heroIntro ?? doc.heroSection?.intro,
    locale,
    doc.introText,
  );
  if (heroIntro) {
    if (hasStructuredHeroIntro) {
      merged.hero.body = splitParagraphs(heroIntro);
      if (!heroSubheadline) {
        // Keep subheadline from dedicated field when present; otherwise leave base.
      }
    } else if (locale === "de" && doc.introText) {
      const split = splitIntro(doc.introText, base.hero);
      if (!heroSubheadline) merged.hero.subheadline = split.subheadline;
      merged.hero.body = split.body;
    } else {
      merged.hero.body = splitParagraphs(heroIntro);
    }
  }

  const heroCtaLabel = pickLocalized(
    doc.heroPrimaryCta?.label ?? doc.heroSection?.primaryCta?.label,
    locale,
  );
  if (heroCtaLabel) merged.hero.primaryCta.label = heroCtaLabel;

  merged.hero.primaryCta.href = resolveHref(
    doc.heroPrimaryCta?.href ?? doc.heroSection?.primaryCta?.href,
    locale,
    base.hero.primaryCta.href,
  );

  const heroMedia =
    doc.heroMedia ??
    doc.heroSection?.media ??
    (doc.heroImage || doc.heroVideoUrl
      ? ({
          mediaType: doc.heroVideoUrl ? "video" : "image",
          image: doc.heroImage,
          vimeoUrl: doc.heroVideoUrl,
          poster: doc.heroImage,
        } satisfies SanityMediaField)
      : undefined);

  const resolvedHeroMedia = heroMedia
    ? applyMediaSection(base.hero.media, heroMedia)
    : resolveLegacyHeroMedia(base.hero.media, doc.heroImage, doc.heroVideoUrl);

  merged.hero.media = resolvedHeroMedia.media;
  if (resolvedHeroMedia.videoId) {
    merged.hero.videoId = resolvedHeroMedia.videoId;
  }

  merged.services = mergeServices(
    base.services,
    locale,
    {
      label: doc.servicesLabel ?? doc.servicesSection?.label,
      headline: doc.servicesHeadline ?? doc.servicesSection?.headline,
      items: doc.servicesItems ?? doc.servicesSection?.items,
    },
    doc.servicesSectionHeadline,
  );

  const showreelLabel = pickLocalized(
    doc.showreelLabel ?? doc.showreelSection?.label,
    locale,
  );
  if (showreelLabel) merged.showreel.label = showreelLabel;

  const showreelHeadline = pickLocalized(
    doc.showreelHeadline ?? doc.showreelSection?.headline,
    locale,
  );
  if (showreelHeadline) merged.showreel.headline = showreelHeadline;

  const showreelText = pickLocalized(
    doc.showreelText ?? doc.showreelSection?.text,
    locale,
  );
  if (showreelText) merged.showreel.body = showreelText;

  const showreelCtaLabel = pickLocalized(
    doc.showreelCta?.label ?? doc.showreelSection?.cta?.label,
    locale,
  );
  if (showreelCtaLabel) merged.showreel.cta.label = showreelCtaLabel;

  merged.showreel.cta.href = resolveHref(
    doc.showreelCta?.href ?? doc.showreelSection?.cta?.href,
    locale,
    base.showreel.cta.href,
  );

  const showreelMediaField = doc.showreelMedia ?? doc.showreelSection?.media;
  if (showreelMediaField) {
    const showreelMedia = applyMediaSection(base.showreel.media, showreelMediaField);
    merged.showreel.media = showreelMedia.media;
    if (showreelMedia.videoId) {
      merged.showreel.videoId = showreelMedia.videoId;
    }
  }

  merged.projects = mergeProjects(
    base.projects,
    locale,
    {
      label: doc.projectsLabel ?? doc.projectsSection?.label,
      headline: doc.projectsHeadline ?? doc.projectsSection?.headline,
      viewAllCta: doc.projectsViewAllCta ?? doc.projectsSection?.viewAllCta,
      selectedProjects:
        doc.selectedProjects ?? doc.projectsSection?.selectedProjects,
    },
    doc.workSectionHeadline,
  );

  const aboHeadline =
    pickLocalized(doc.aboHeadline ?? doc.aboSection?.headline, locale) ??
    pickLocalized(doc.aboLabel ?? doc.aboSection?.label, locale);
  if (aboHeadline) merged.abo.headline = aboHeadline;

  const aboText = pickLocalized(doc.aboText ?? doc.aboSection?.text, locale);
  if (aboText) merged.abo.introduction = aboText;

  merged.abo.benefits = mergeBenefits(
    base.abo.benefits,
    locale,
    doc.aboBenefits ?? doc.aboSection?.benefits,
  );

  const aboCtaLabel = pickLocalized(
    doc.aboCta?.label ?? doc.aboSection?.cta?.label,
    locale,
  );
  if (aboCtaLabel) merged.abo.cta.label = aboCtaLabel;

  merged.abo.cta.href = resolveHref(
    doc.aboCta?.href ?? doc.aboSection?.cta?.href,
    locale,
    base.abo.cta.href,
  );

  const aboMediaField = doc.aboMedia ?? doc.aboSection?.media;
  if (aboMediaField) {
    const aboMedia = applyMediaSection(base.abo.media, aboMediaField, 1200);
    merged.abo.media = aboMedia.media;
    if (aboMedia.videoId) merged.abo.videoId = aboMedia.videoId;
  }

  const aboutLabel = pickLocalized(
    doc.aboutLabel ?? doc.aboutSection?.label,
    locale,
  );
  if (aboutLabel) merged.about.label = aboutLabel;

  const aboutHeadline = pickLocalized(
    doc.aboutHeadline ?? doc.aboutSection?.headline,
    locale,
    doc.mainIntroHeadline,
  );
  if (aboutHeadline) {
    const { headline } = splitTrailingAccent(
      aboutHeadline,
      base.about.headlineAccent,
    );
    merged.about.headline = headline;
  }

  const aboutSubheadline = pickLocalized(
    doc.aboutSubheadline ?? doc.aboutSection?.subheadline,
    locale,
  );
  if (aboutSubheadline) merged.about.subheadline = aboutSubheadline;

  const aboutText = pickLocalized(
    doc.aboutText ?? doc.aboutSection?.text,
    locale,
    doc.mainIntroText,
  );
  if (aboutText) merged.about.body = splitParagraphs(aboutText);

  const aboutCtaLabel = pickLocalized(
    doc.aboutCta?.label ?? doc.aboutSection?.cta?.label,
    locale,
  );
  if (aboutCtaLabel) merged.about.cta.label = aboutCtaLabel;

  merged.about.cta.href = resolveHref(
    doc.aboutCta?.href ?? doc.aboutSection?.cta?.href,
    locale,
    base.about.cta.href,
  );

  const aboutMediaField = doc.aboutMedia ?? doc.aboutSection?.media;
  if (aboutMediaField) {
    const aboutMedia = applyMediaSection(base.about.media, aboutMediaField);
    merged.about.media = aboutMedia.media;
    if (aboutMedia.videoId) merged.about.videoId = aboutMedia.videoId;
  }

  const clientsLabel = pickLocalized(
    doc.clientsLabel ?? doc.clientsSection?.label,
    locale,
  );
  if (clientsLabel) merged.clients.label = clientsLabel;

  merged.clients.logos = mergeClientLogos(
    base.clients.logos,
    doc.clientsLogos ?? doc.clientsSection?.logos,
  );

  const finalHeadline = pickLocalized(
    doc.finalCtaHeadline ?? doc.finalCtaSection?.headline,
    locale,
    doc.ctaHeadline,
  );
  if (finalHeadline) {
    const { before, accent, after } = splitAroundAccent(
      finalHeadline,
      base.finalCta.headlineAccent,
    );
    merged.finalCta.headlineBefore = before;
    merged.finalCta.headlineAccent = accent;
    merged.finalCta.headlineAfter = after;
  }

  const finalText = pickLocalized(
    doc.finalCtaText ?? doc.finalCtaSection?.text,
    locale,
    doc.ctaText,
  );
  if (finalText) merged.finalCta.text = finalText;

  const finalCtaLabel = pickLocalized(
    doc.finalCtaButton?.label ?? doc.finalCtaSection?.cta?.label,
    locale,
    doc.ctaLabel,
  );
  if (finalCtaLabel) merged.finalCta.cta.label = finalCtaLabel;

  merged.finalCta.cta.href = resolveHref(
    doc.finalCtaButton?.href ?? doc.finalCtaSection?.cta?.href,
    locale,
    base.finalCta.cta.href,
  );

  return merged;
}

export const getResolvedHomepageContent = cache(
  async (locale: Locale): Promise<HomepageContent> => {
    const base = getHomepageContent(locale);
    const doc = await fetchSanityHomepage();

    if (!doc) {
      return base;
    }

    return mergeSanityHomepage(base, doc, locale);
  },
);
