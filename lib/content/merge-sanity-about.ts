import type { Locale } from "@/types/i18n";
import type { HomepageMedia } from "@/types/homepage";
import {
  getAboutPageContent,
  type AboutPageContent,
  type AboutTeamMember,
} from "@/lib/content/about-page";
import { mergeClientLogos } from "@/lib/content/merge-client-logos";
import { fetchEnabledClientLogos } from "@/lib/sanity/clients";
import type { SanityAbout } from "@/lib/sanity/about";
import { resolveSanityImage } from "@/lib/sanity/media";

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function paragraphs(value: string | null | undefined): string[] | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const parts = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
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

const EMPTY_MEDIA: HomepageMedia = {
  src: "",
  alt: "",
  width: 1920,
  height: 1080,
};

export type ResolvedAboutPageContent = AboutPageContent;

/**
 * Pure merge of Sanity About document → frontend About content.
 * Safe for client and server. Does not fetch Sanity.
 *
 * Nonempty published values win. Missing/empty fields keep local fallbacks
 * (including `/images/team/*` portraits) so the page never goes blank.
 */
export function mergeSanityAbout(
  base: AboutPageContent,
  doc: SanityAbout,
  locale: Locale,
): ResolvedAboutPageContent {
  // About Studio fields are monolingual today; locale is kept for API parity
  // with Contact/Abo merge helpers and future localized About content.
  void locale;
  const merged: ResolvedAboutPageContent = {
    ...base,
    seo: { ...base.seo },
    hero: {
      ...base.hero,
      primaryCta: { ...base.hero.primaryCta },
      media: { ...base.hero.media },
      body: [...base.hero.body],
    },
    values: {
      ...base.values,
      items: base.values.items.map((item) => ({ ...item })),
    },
    services: {
      ...base.services,
      items: base.services.items.map((item) => ({ ...item })),
    },
    team: {
      ...base.team,
      members: base.team.members.map((member) => ({
        ...member,
        image: member.image ? { ...member.image } : undefined,
      })),
      featureMedia: { ...base.team.featureMedia },
    },
    facts: {
      items: base.facts.items.map((item) => ({ ...item })),
    },
    approach: {
      ...base.approach,
      body: [...base.approach.body],
      cta: { ...base.approach.cta },
      media: { ...base.approach.media },
    },
    clients: {
      ...base.clients,
      logos: [...base.clients.logos],
    },
    finalCta: {
      ...base.finalCta,
      cta: { ...base.finalCta.cta },
    },
  };

  const seoTitle = clean(doc.seoTitle);
  if (seoTitle) merged.seo.title = seoTitle;

  const seoDescription = clean(doc.seoDescription);
  if (seoDescription) merged.seo.description = seoDescription;

  const heroLabel = clean(doc.heroLabel);
  if (heroLabel) merged.hero.label = heroLabel;

  const heroHeadline = clean(doc.heroHeadline);
  if (heroHeadline) merged.hero.headline = heroHeadline;

  const heroSubheadline = clean(doc.heroSubheadline);
  if (heroSubheadline) merged.hero.subheadline = heroSubheadline;

  const heroBody = paragraphs(doc.heroIntroText);
  if (heroBody) merged.hero.body = heroBody;

  const heroCta = clean(doc.heroCtaLabel);
  if (heroCta) merged.hero.primaryCta.label = heroCta;

  if (doc.heroImage?.asset?._ref || doc.heroImage?.url) {
    merged.hero.media = resolveSanityImage(doc.heroImage, merged.hero.media);
  }

  const valuesLabel = clean(doc.valuesLabel);
  if (valuesLabel) merged.values.label = valuesLabel;

  if (doc.valuesItems && doc.valuesItems.length > 0) {
    merged.values.items = doc.valuesItems.map((item, index) => {
      const fallback = base.values.items[index];
      return {
        id: clean(item?._key) ?? fallback?.id ?? `value-${index}`,
        title: clean(item?.title) ?? fallback?.title ?? "",
        description: clean(item?.description) ?? fallback?.description ?? "",
      };
    });
  }

  const teamLabel = clean(doc.teamLabel);
  if (teamLabel) merged.team.label = teamLabel;

  const teamHeadline = clean(doc.teamHeadline);
  if (teamHeadline) merged.team.headline = teamHeadline;

  const teamIntroduction = clean(doc.teamIntroduction);
  if (teamIntroduction) merged.team.introduction = teamIntroduction;

  if (doc.teamFeatureImage?.asset?._ref || doc.teamFeatureImage?.url) {
    merged.team.featureMedia = resolveSanityImage(
      doc.teamFeatureImage,
      merged.team.featureMedia,
    );
  }

  if (doc.teamMembers && doc.teamMembers.length > 0) {
    merged.team.members = doc.teamMembers.map((member, index) => {
      const fallback = base.team.members[index];
      const isPlaceholder = Boolean(member?.isPlaceholder);
      const name = clean(member?.name) ?? (isPlaceholder ? "" : fallback?.name) ?? "";
      const role = clean(member?.role) ?? (isPlaceholder ? "" : fallback?.role) ?? "";
      const fallbackImage = fallback?.image ?? EMPTY_MEDIA;
      const hasPortrait =
        Boolean(member?.portrait?.asset?._ref) || Boolean(member?.portrait?.url);
      const resolvedImage = hasPortrait
        ? resolveSanityImage(member?.portrait, fallbackImage, 1200)
        : fallback?.image;

      const next: AboutTeamMember = {
        id: clean(member?._key) ?? fallback?.id ?? `member-${index}`,
        name,
        role,
        isPlaceholder,
      };

      if (resolvedImage?.src) {
        next.image = resolvedImage;
      }

      return next;
    });
  }

  if (doc.facts && doc.facts.length > 0) {
    merged.facts.items = doc.facts.map((fact, index) => {
      const fallback = base.facts.items[index];
      return {
        id: clean(fact?._key) ?? fallback?.id ?? `fact-${index}`,
        value: clean(fact?.value) ?? fallback?.value ?? "",
        label: clean(fact?.label) ?? fallback?.label ?? "",
      };
    });
  }

  const approachLabel = clean(doc.approachLabel);
  if (approachLabel) merged.approach.label = approachLabel;

  const approachHeadline = clean(doc.approachHeadline);
  if (approachHeadline) {
    const accent = base.approach.headlineAccent;
    if (accent && approachHeadline.endsWith(accent)) {
      merged.approach.headline = approachHeadline.slice(0, -accent.length);
      merged.approach.headlineAccent = accent;
    } else {
      merged.approach.headline = approachHeadline;
    }
  }

  const approachSubheadline = clean(doc.approachSubheadline);
  if (approachSubheadline) merged.approach.subheadline = approachSubheadline;

  const approachBody = paragraphs(doc.approachText);
  if (approachBody) merged.approach.body = approachBody;

  const approachCta = clean(doc.approachCtaLabel);
  if (approachCta) merged.approach.cta.label = approachCta;

  if (doc.approachImage?.asset?._ref || doc.approachImage?.url) {
    merged.approach.media = resolveSanityImage(
      doc.approachImage,
      merged.approach.media,
    );
  }

  const servicesLabel = clean(doc.servicesLabel);
  if (servicesLabel) merged.services.label = servicesLabel;

  const servicesHeadline = clean(doc.servicesHeadline);
  if (servicesHeadline) merged.services.headline = servicesHeadline;

  if (doc.servicesItems && doc.servicesItems.length > 0) {
    merged.services.items = doc.servicesItems.map((item, index) => {
      const fallback = base.services.items[index];
      if (!fallback) {
        return {
          id: "digital" as const,
          title: clean(item?.title) ?? "",
          description: clean(item?.description) ?? "",
          href: "#",
        };
      }
      return {
        ...fallback,
        title: clean(item?.title) ?? fallback.title,
        description: clean(item?.description) ?? fallback.description,
      };
    });
  }

  const clientsLabel = clean(doc.clientsLabel);
  if (clientsLabel) merged.clients.label = clientsLabel;

  const ctaHeadline = clean(doc.ctaHeadline);
  if (ctaHeadline) {
    const { before, accent, after } = splitAroundAccent(
      ctaHeadline,
      base.finalCta.headlineAccent,
    );
    merged.finalCta.headlineBefore = before;
    merged.finalCta.headlineAccent = accent || base.finalCta.headlineAccent;
    merged.finalCta.headlineAfter = after;
  }

  const ctaText = clean(doc.ctaText);
  if (ctaText) merged.finalCta.text = ctaText;

  const ctaLabel = clean(doc.ctaLabel);
  if (ctaLabel) merged.finalCta.cta.label = ctaLabel;

  return merged;
}

export function getLocalResolvedAboutPageContent(
  locale: Locale,
): ResolvedAboutPageContent {
  return getAboutPageContent(locale);
}

/**
 * Optional async helper used by tests — merges client logos like the resolver.
 */
export async function mergeAboutClientLogos(
  content: ResolvedAboutPageContent,
): Promise<ResolvedAboutPageContent> {
  const logos = await fetchEnabledClientLogos();
  const mergedLogos = mergeClientLogos(content.clients.logos, logos);
  if (mergedLogos === content.clients.logos) {
    return content;
  }
  return {
    ...content,
    clients: {
      ...content.clients,
      logos: mergedLogos,
    },
  };
}
