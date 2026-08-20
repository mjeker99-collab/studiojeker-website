import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  ctaProjection,
  localizedStringProjection,
  localizedTextProjection,
  sanityImageProjection,
  sanityMediaProjection,
  type SanityImageProjection,
  type SanityMediaField,
} from "@/lib/sanity/media";

export type SanityLocalizedString = {
  de?: string | null;
  en?: string | null;
} | null;

export type SanityLocalizedText = {
  de?: string | null;
  en?: string | null;
} | null;

export type SanityCta = {
  label?: SanityLocalizedString;
  href?: string | null;
} | null;

export type SanityHomepageServiceItem = {
  serviceId?: "architecture" | "product" | "business" | "digital" | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
  href?: string | null;
  ctaLabel?: SanityLocalizedString;
  media?: SanityMediaField;
  sortOrder?: number | null;
};

export type SanityHomepageBenefitItem = {
  id?: string | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
  sortOrder?: number | null;
};

export type SanityHomepageProjectRef = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  shortDescription?: string | null;
  featured?: boolean | null;
  sortOrder?: number | null;
  mainImage?: SanityImageProjection;
  category?: {
    title?: string | null;
  } | null;
} | null;

export type SanityHomepageClientRef = {
  _id?: string;
  name?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  logo?: SanityImageProjection;
} | null;

/**
 * Published Homepage singleton projection.
 * Includes nested section fields and legacy root fields for backward compatibility.
 */
export const homepageQuery = groq`*[_type == "homepage"][0]{
  heroSection{
    eyebrow${localizedStringProjection},
    headline${localizedStringProjection},
    subheadline${localizedStringProjection},
    intro${localizedTextProjection},
    primaryCta${ctaProjection},
    media${sanityMediaProjection}
  },
  servicesSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    items[]{
      serviceId,
      title${localizedStringProjection},
      description${localizedTextProjection},
      href,
      ctaLabel${localizedStringProjection},
      media${sanityMediaProjection},
      sortOrder
    }
  },
  showreelSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  projectsSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    intro${localizedTextProjection},
    viewAllCta${ctaProjection},
    "selectedProjects": selectedProjects[]->{
      _id,
      title,
      slug,
      shortDescription,
      featured,
      sortOrder,
      mainImage${sanityImageProjection},
      "category": category->{ title }
    }
  },
  aboSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    benefits[]{
      id,
      title${localizedStringProjection},
      description${localizedTextProjection},
      sortOrder
    },
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  aboutSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    subheadline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  clientsSection{
    label${localizedStringProjection},
    "logos": logos[]->{
      _id,
      name,
      websiteUrl,
      sortOrder,
      active,
      logo${sanityImageProjection}
    }
  },
  finalCtaSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection}
  },
  seoSection{
    title${localizedStringProjection},
    description${localizedTextProjection},
    ogImage${sanityImageProjection}
  },
  heroHeadline,
  introText,
  heroVideoUrl,
  mainIntroHeadline,
  mainIntroText,
  servicesSectionHeadline,
  servicesIntro,
  workSectionHeadline,
  workIntro,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription,
  heroImage${sanityImageProjection}
}`;

/** @deprecated Use SanityImageProjection from lib/sanity/media */
export type SanityHomepageImage = SanityImageProjection;

export type SanityHomepage = {
  heroSection?: {
    eyebrow?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    subheadline?: SanityLocalizedString;
    intro?: SanityLocalizedText;
    primaryCta?: SanityCta;
    media?: SanityMediaField;
  } | null;
  servicesSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    items?: SanityHomepageServiceItem[] | null;
  } | null;
  showreelSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityCta;
    media?: SanityMediaField;
  } | null;
  projectsSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    intro?: SanityLocalizedText;
    viewAllCta?: SanityCta;
    selectedProjects?: SanityHomepageProjectRef[] | null;
  } | null;
  aboSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    benefits?: SanityHomepageBenefitItem[] | null;
    cta?: SanityCta;
    media?: SanityMediaField;
  } | null;
  aboutSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    subheadline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityCta;
    media?: SanityMediaField;
  } | null;
  clientsSection?: {
    label?: SanityLocalizedString;
    logos?: SanityHomepageClientRef[] | null;
  } | null;
  finalCtaSection?: {
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityCta;
  } | null;
  seoSection?: {
    title?: SanityLocalizedString;
    description?: SanityLocalizedText;
    ogImage?: SanityImageProjection;
  } | null;
  heroHeadline?: string | null;
  introText?: string | null;
  heroVideoUrl?: string | null;
  mainIntroHeadline?: string | null;
  mainIntroText?: string | null;
  servicesSectionHeadline?: string | null;
  servicesIntro?: string | null;
  workSectionHeadline?: string | null;
  workIntro?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  heroImage?: SanityImageProjection;
};

/** @deprecated Use sanityImageSource from lib/sanity/media */
export { sanityImageSource as heroImageSource } from "@/lib/sanity/media";

/**
 * Fetch the published Homepage document at build time.
 * Returns null on failure so callers can fall back to local content.
 */
export async function fetchSanityHomepage(): Promise<SanityHomepage | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityHomepage | null>(homepageQuery);
    return doc ?? null;
  } catch (error) {
    console.warn(
      "[sanity] Homepage fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
