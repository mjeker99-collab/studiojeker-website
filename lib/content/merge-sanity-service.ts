import type { Locale } from "@/types/i18n";
import type { HomepageMedia, HomepageProject } from "@/types/homepage";
import type {
  ServicePageContent,
  ServiceSolutionItem,
} from "@/types/service-page";
import type {
  SanityService,
  SanityServiceProjectItem,
  SanityServiceSolutionItem,
} from "@/lib/sanity/service";
import { mergeClientLogos } from "@/lib/content/merge-client-logos";
import { localizePathname, stripLocalePrefix } from "@/lib/i18n/config";
import { resolveSanityImage } from "@/lib/sanity/media";
import { extractVimeoId } from "@/lib/sanity/vimeo";

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

function resolveIcon(
  value: string | null | undefined,
  fallback: ServiceSolutionItem["icon"],
): ServiceSolutionItem["icon"] {
  if (value && SOLUTION_ICONS.has(value as ServiceSolutionItem["icon"])) {
    return value as ServiceSolutionItem["icon"];
  }
  return fallback;
}

/** True when CMS still points at the Work overview without a tile/category hash. */
function isBareWorkHref(href: string): boolean {
  const hashIndex = href.indexOf("#");
  if (hashIndex !== -1) {
    return false;
  }
  const stripped = stripLocalePrefix(href).replace(/\/$/, "") || "/";
  return stripped === "/work";
}

/**
 * Resolve a Service solution link for the active locale.
 * Preserves external URLs; localizes internal paths (including `/work#…`).
 * Bare `/work` yields to a more specific local fallback when available.
 */
function resolveSolutionHref(
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

  if (isBareWorkHref(value) && fallback.includes("#")) {
    return fallback;
  }

  return localizePathname(value, locale);
}

function mergeSolutions(
  base: ServiceSolutionItem[],
  items: SanityServiceSolutionItem[] | null | undefined,
  locale: Locale,
  mode: "full" | "href-only",
): ServiceSolutionItem[] {
  if (!items || items.length === 0) {
    return base;
  }

  if (mode === "href-only") {
    return base.map((fallback, index) => {
      const byId = items.find((item) => clean(item.itemId) === fallback.id);
      const item = byId ?? items[index];
      return {
        ...fallback,
        href: resolveSolutionHref(item?.href, locale, fallback.href),
      };
    });
  }

  return items.map((item, index) => {
    const fallback = base[index];
    return {
      id: clean(item.itemId) ?? fallback?.id ?? `solution-${index}`,
      title: clean(item.title) ?? fallback?.title ?? "",
      description: clean(item.description) ?? fallback?.description ?? "",
      href: resolveSolutionHref(item.href, locale, fallback?.href ?? "#"),
      icon: resolveIcon(item.icon, fallback?.icon ?? "content"),
    };
  });
}

function mergeProjects(
  base: HomepageProject[],
  items: SanityServiceProjectItem[] | null | undefined,
  fallbackImage: HomepageMedia,
  fallbackHref: string,
  fallbackTitle: string,
): HomepageProject[] {
  if (!items || items.length === 0) {
    return base;
  }

  return items.map((item, index) => {
    const fallback = base[index];
    return {
      id: clean(item.itemId) ?? fallback?.id ?? `project-${index}`,
      title: clean(item.title) ?? fallback?.title ?? fallbackTitle,
      category: clean(item.category) ?? fallback?.category ?? "",
      href: clean(item.href) ?? fallback?.href ?? fallbackHref,
      image: resolveSanityImage(
        item.image,
        fallback?.image ?? fallbackImage,
      ),
      isPlaceholder: item.isPlaceholder ?? fallback?.isPlaceholder ?? true,
    };
  });
}

/**
 * Pure merge of Sanity Service document → frontend Service content.
 *
 * Service schema fields are German plain strings (not localized).
 * - `de`: apply text + media from Sanity (local fallback when a field is empty)
 * - `en`: keep local English copy; still apply Sanity images/media so CMS
 *   image publishes appear on both locales; solution `href` values still apply
 *   (paths are language-routed, not copy)
 *
 * Safe for client and server. Does not fetch Sanity.
 */
export function mergeSanityService(
  base: ServicePageContent,
  doc: SanityService | null | undefined,
  locale: Locale = "de",
): ServicePageContent {
  if (!doc) {
    return base;
  }

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
    clients: {
      ...base.clients,
      logos: [...base.clients.logos],
    },
    finalCta: { ...base.finalCta, cta: { ...base.finalCta.cta } },
  };

  // Media always — language-agnostic CMS assets.
  const hasHeroImage = Boolean(
    doc.heroImage?.asset?._ref || doc.heroImage?.url,
  );
  if (hasHeroImage) {
    merged.hero.media = resolveSanityImage(doc.heroImage, base.hero.media);
  }

  const hasShowreelImage = Boolean(
    doc.showreelImage?.asset?._ref || doc.showreelImage?.url,
  );
  if (hasShowreelImage) {
    merged.showreel.media = resolveSanityImage(
      doc.showreelImage,
      base.showreel.media,
    );
  }

  // Always assign when Studio provides a value (including clear → empty),
  // matching homepage/abo merge behaviour for video ↔ image switches.
  if (doc.showreelVideoId != null) {
    merged.showreel.videoId =
      extractVimeoId(doc.showreelVideoId) ?? clean(doc.showreelVideoId) ?? "";
  }

  const hasAboutImage = Boolean(
    doc.aboutImage?.asset?._ref || doc.aboutImage?.url,
  );
  if (hasAboutImage) {
    merged.about.media = resolveSanityImage(doc.aboutImage, base.about.media);
  }

  if (doc.projects && doc.projects.length > 0) {
    merged.projects.items = mergeProjects(
      base.projects.items,
      doc.projects,
      base.hero.media,
      base.projects.viewAll.href,
      base.hero.label,
    );
  }

  // Logos are language-agnostic — same Contact ClientsSection source for DE/EN.
  merged.clients.logos = mergeClientLogos(
    merged.clients.logos,
    doc.clientLogos,
  );

  // Solution link targets apply on both locales (localized paths + hashes).
  if (doc.solutions && doc.solutions.length > 0) {
    merged.solutions.items = mergeSolutions(
      base.solutions.items,
      doc.solutions,
      locale,
      locale === "de" ? "full" : "href-only",
    );
  }

  // German plain-string fields only — EN keeps local copywriting.
  if (locale !== "de") {
    return merged;
  }

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

  const solutionsLabel = clean(doc.solutionsLabel);
  if (solutionsLabel) merged.solutions.label = solutionsLabel;
  const solutionsHeadline = clean(doc.solutionsHeadline);
  if (solutionsHeadline) merged.solutions.headline = solutionsHeadline;
  // Full DE solutions already merged above (text + href + icon).

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

  const projectsLabel = clean(doc.projectsLabel);
  if (projectsLabel) merged.projects.label = projectsLabel;
  const projectsHeadline = clean(doc.projectsHeadline);
  if (projectsHeadline) merged.projects.headline = projectsHeadline;
  const projectsViewAllLabel = clean(doc.projectsViewAllLabel);
  if (projectsViewAllLabel) merged.projects.viewAll.label = projectsViewAllLabel;
  const projectsViewAllHref = clean(doc.projectsViewAllHref);
  if (projectsViewAllHref) merged.projects.viewAll.href = projectsViewAllHref;

  const aboutLabel = clean(doc.aboutLabel);
  if (aboutLabel) merged.about.label = aboutLabel;
  const aboutHeadline = clean(doc.aboutHeadline);
  if (aboutHeadline) merged.about.headline = aboutHeadline;
  if (doc.aboutHeadlineAccent != null) {
    merged.about.headlineAccent = doc.aboutHeadlineAccent;
  }
  if (doc.aboutSubheadline != null) {
    const aboutSub = clean(doc.aboutSubheadline);
    merged.about.subheadline = aboutSub ?? "";
  }
  const aboutText = clean(doc.aboutText);
  if (aboutText) {
    merged.about.body = splitParagraphs(aboutText, base.about.body);
  }
  const aboutCtaLabel = clean(doc.aboutCtaLabel);
  if (aboutCtaLabel) merged.about.cta.label = aboutCtaLabel;
  const aboutCtaHref = clean(doc.aboutCtaHref);
  if (aboutCtaHref) merged.about.cta.href = aboutCtaHref;

  const clientsLabel = clean(doc.clientsLabel);
  if (clientsLabel) merged.clients.label = clientsLabel;

  const ctaHeadline = clean(doc.ctaHeadline);
  if (ctaHeadline) {
    const split = splitAroundAccent(ctaHeadline, base.finalCta.headlineAccent);
    if (split.accent) {
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
