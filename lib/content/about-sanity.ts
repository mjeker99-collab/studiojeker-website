import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type { AboutPageContent, AboutTeamMember } from "@/lib/content/about-page";
import { getAboutPageContent } from "@/lib/content/about-page";
import { urlForImage } from "@/lib/sanity/image";
import {
  ABOUT_DOCUMENT_ID,
  aboutImageSource,
  fetchSanityAbout,
  type SanityAbout,
  type SanityAboutImage,
} from "@/lib/sanity/about";

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function splitTrailingAccent(
  full: string,
  baseAccent: string | undefined,
): { headline: string; accent: string | undefined } {
  if (baseAccent && full.endsWith(baseAccent)) {
    return {
      headline: full.slice(0, full.length - baseAccent.length).trimEnd(),
      accent: baseAccent,
    };
  }
  return { headline: full, accent: undefined };
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

function splitParagraphs(text: string, fallback: string[]): string[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.length > 0 ? blocks : fallback;
}

function resolveImage(
  base: { src: string; alt: string; width: number; height: number },
  image: SanityAboutImage | undefined,
): { src: string; alt: string; width: number; height: number } {
  if (!image) {
    return base;
  }

  let src = clean(image.url ?? undefined);
  const source = aboutImageSource(image);
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

function mergeTeamMembers(
  base: AboutTeamMember[],
  incoming: NonNullable<SanityAbout["teamMembers"]>,
): AboutTeamMember[] {
  const mapped: AboutTeamMember[] = incoming.map((member, index) => {
    const portrait = member.portrait
      ? resolveImage(
          {
            src: "",
            alt: clean(member.name) || "Team member",
            width: 1920,
            height: 1080,
          },
          member.portrait,
        )
      : undefined;
    const hasPortrait = Boolean(portrait?.src);
    const isPlaceholder = Boolean(member.isPlaceholder) || !hasPortrait;

    return {
      id: base[index]?.id ?? `sanity-member-${index}`,
      name: clean(member.name) ?? "",
      role: clean(member.role) ?? "",
      isPlaceholder,
      image: hasPortrait ? portrait : undefined,
    };
  });

  if (mapped.length >= base.length) {
    return mapped;
  }

  return base.map((slot, index) => mapped[index] ?? slot);
}

/**
 * Merge published Sanity About fields onto the local About content structure.
 * Local content remains the base for links, logos, and any missing fields.
 */
export function mergeSanityAbout(
  base: AboutPageContent,
  doc: SanityAbout,
): AboutPageContent {
  const merged: AboutPageContent = {
    ...base,
    seo: { ...base.seo },
    hero: { ...base.hero, media: { ...base.hero.media } },
    values: { ...base.values, items: [...base.values.items] },
    services: {
      ...base.services,
      items: base.services.items.map((item) => ({ ...item })),
    },
    team: {
      ...base.team,
      members: [...base.team.members],
      featureMedia: { ...base.team.featureMedia },
    },
    facts: { items: [...base.facts.items] },
    approach: {
      ...base.approach,
      media: { ...base.approach.media },
      cta: { ...base.approach.cta },
      body: [...base.approach.body],
    },
    clients: { ...base.clients },
    finalCta: { ...base.finalCta, cta: { ...base.finalCta.cta } },
  };

  const seoTitle = clean(doc.seoTitle);
  if (seoTitle) merged.seo.title = seoTitle;
  const seoDescription = clean(doc.seoDescription);
  if (seoDescription) merged.seo.description = seoDescription;

  const heroLabel = clean(doc.heroLabel);
  if (heroLabel) merged.hero.label = heroLabel;
  const heroHeadline = clean(doc.heroHeadline);
  if (heroHeadline) {
    const { headline, accent } = splitTrailingAccent(
      heroHeadline,
      base.hero.headlineAccent,
    );
    merged.hero.headline = headline;
    if (accent) merged.hero.headlineAccent = accent;
  }
  const heroSubheadline = clean(doc.heroSubheadline);
  if (heroSubheadline) merged.hero.subheadline = heroSubheadline;
  const heroIntroText = clean(doc.heroIntroText);
  if (heroIntroText) merged.hero.body = splitParagraphs(heroIntroText, base.hero.body);
  const heroCtaLabel = clean(doc.heroCtaLabel);
  if (heroCtaLabel) merged.hero.primaryCta = { ...base.hero.primaryCta, label: heroCtaLabel };
  merged.hero.media = resolveImage(base.hero.media, doc.heroImage);

  const valuesLabel = clean(doc.valuesLabel);
  if (valuesLabel) merged.values.label = valuesLabel;
  if (doc.valuesItems && doc.valuesItems.length > 0) {
    merged.values.items = doc.valuesItems.map((item, index) => ({
      id: base.values.items[index]?.id ?? `value-${index}`,
      title: clean(item.title) ?? base.values.items[index]?.title ?? "",
      description:
        clean(item.description) ?? base.values.items[index]?.description ?? "",
    }));
  }

  const teamLabel = clean(doc.teamLabel);
  if (teamLabel) merged.team.label = teamLabel;
  const teamHeadline = clean(doc.teamHeadline);
  if (teamHeadline) merged.team.headline = teamHeadline;
  const teamIntroduction = clean(doc.teamIntroduction);
  if (teamIntroduction) merged.team.introduction = teamIntroduction;
  merged.team.featureMedia = resolveImage(
    base.team.featureMedia,
    doc.teamFeatureImage,
  );
  if (doc.teamMembers && doc.teamMembers.length > 0) {
    merged.team.members = mergeTeamMembers(base.team.members, doc.teamMembers);
  }

  if (doc.facts && doc.facts.length > 0) {
    merged.facts.items = doc.facts.map((item, index) => ({
      id: base.facts.items[index]?.id ?? `fact-${index}`,
      value: clean(item.value) ?? base.facts.items[index]?.value ?? "",
      label: clean(item.label) ?? base.facts.items[index]?.label ?? "",
    }));
  }

  const approachLabel = clean(doc.approachLabel);
  if (approachLabel) merged.approach.label = approachLabel;
  const approachHeadline = clean(doc.approachHeadline);
  if (approachHeadline) {
    const { headline, accent } = splitTrailingAccent(
      approachHeadline,
      base.approach.headlineAccent,
    );
    merged.approach.headline = headline;
    if (accent) merged.approach.headlineAccent = accent;
  }
  const approachSubheadline = clean(doc.approachSubheadline);
  if (approachSubheadline) merged.approach.subheadline = approachSubheadline;
  const approachText = clean(doc.approachText);
  if (approachText) {
    merged.approach.body = splitParagraphs(approachText, base.approach.body);
  }
  const approachCtaLabel = clean(doc.approachCtaLabel);
  if (approachCtaLabel) {
    merged.approach.cta = { ...base.approach.cta, label: approachCtaLabel };
  }
  merged.approach.media = resolveImage(base.approach.media, doc.approachImage);

  const servicesLabel = clean(doc.servicesLabel);
  if (servicesLabel) merged.services.label = servicesLabel;
  const servicesHeadline = clean(doc.servicesHeadline);
  if (servicesHeadline) merged.services.headline = servicesHeadline;
  if (doc.servicesItems && doc.servicesItems.length > 0) {
    merged.services.items = base.services.items.map((item, index) => {
      const incoming = doc.servicesItems?.[index];
      if (!incoming) return item;
      return {
        ...item,
        title: clean(incoming.title) ?? item.title,
        description: clean(incoming.description) ?? item.description,
      };
    });
  }

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
  if (ctaLabel) merged.finalCta.cta = { ...base.finalCta.cta, label: ctaLabel };

  return merged;
}

/**
 * Build-time About content resolver.
 * German /about is wired to Sanity. English keeps the local source.
 */
export const getResolvedAboutPageContent = cache(
  async (locale: Locale): Promise<AboutPageContent> => {
    const base = getAboutPageContent(locale);

    if (locale !== "de") {
      return base;
    }

    const doc = await fetchSanityAbout();
    if (!doc) {
      console.warn(
        "[sanity] German About: published document missing — using local content.",
      );
      return base;
    }

    console.info(
      `[sanity] German About sourced from published document ${doc._id ?? ABOUT_DOCUMENT_ID}.`,
    );
    return mergeSanityAbout(base, doc);
  },
);
