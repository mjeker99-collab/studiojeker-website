import groq from "groq";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { getSanityClient } from "@/lib/sanity/client";

/** About singleton — stable ID from Studio desk structure. Do not duplicate. */
export const ABOUT_DOCUMENT_ID = "about";

const imageProjection = groq`{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}`;

/**
 * Published About singleton projection.
 * Other page types are not fetched here.
 */
export const aboutQuery = groq`*[_id == $id && _type == "about"][0]{
  _id,
  heroLabel,
  heroHeadline,
  heroSubheadline,
  heroIntroText,
  heroCtaLabel,
  heroImage${imageProjection},
  valuesLabel,
  valuesItems[]{ title, description },
  teamLabel,
  teamHeadline,
  teamIntroduction,
  teamFeatureImage${imageProjection},
  teamMembers[]{
    name,
    role,
    isPlaceholder,
    portrait${imageProjection}
  },
  facts[]{ value, label },
  approachLabel,
  approachHeadline,
  approachSubheadline,
  approachText,
  approachCtaLabel,
  approachImage${imageProjection},
  servicesLabel,
  servicesHeadline,
  servicesItems[]{ title, description },
  clientsLabel,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription
}`;

export type SanityAboutImage = {
  _type?: string;
  asset?: { _ref?: string; _type?: string } | null;
  hotspot?: unknown;
  crop?: unknown;
  url?: string | null;
  alt?: string | null;
  dimensions?: {
    width?: number | null;
    height?: number | null;
  } | null;
} | null;

export type SanityAboutValueItem = {
  title?: string | null;
  description?: string | null;
};

export type SanityAboutTeamMember = {
  name?: string | null;
  role?: string | null;
  isPlaceholder?: boolean | null;
  portrait?: SanityAboutImage;
};

export type SanityAboutFact = {
  value?: string | null;
  label?: string | null;
};

export type SanityAboutServiceItem = {
  title?: string | null;
  description?: string | null;
};

export type SanityAbout = {
  _id?: string | null;
  heroLabel?: string | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  heroIntroText?: string | null;
  heroCtaLabel?: string | null;
  heroImage?: SanityAboutImage;
  valuesLabel?: string | null;
  valuesItems?: SanityAboutValueItem[] | null;
  teamLabel?: string | null;
  teamHeadline?: string | null;
  teamIntroduction?: string | null;
  teamFeatureImage?: SanityAboutImage;
  teamMembers?: SanityAboutTeamMember[] | null;
  facts?: SanityAboutFact[] | null;
  approachLabel?: string | null;
  approachHeadline?: string | null;
  approachSubheadline?: string | null;
  approachText?: string | null;
  approachCtaLabel?: string | null;
  approachImage?: SanityAboutImage;
  servicesLabel?: string | null;
  servicesHeadline?: string | null;
  servicesItems?: SanityAboutServiceItem[] | null;
  clientsLabel?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function aboutImageSource(
  image: SanityAboutImage,
): SanityImageSource | null {
  return image?.asset?._ref ? (image as SanityImageSource) : null;
}

/**
 * Fetch the published About document at build time.
 * Returns null on any failure so callers can fall back to local content.
 */
export async function fetchSanityAbout(): Promise<SanityAbout | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityAbout | null>(aboutQuery, {
      id: ABOUT_DOCUMENT_ID,
    });
    return doc ?? null;
  } catch (error) {
    console.warn(
      "[sanity] About fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
