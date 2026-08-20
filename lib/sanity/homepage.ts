import groq from "groq";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { getSanityClient } from "@/lib/sanity/client";

/** Existing published Homepage singleton — do not fetch a duplicate. */
export const HOMEPAGE_DOCUMENT_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

/**
 * Published Homepage singleton projection.
 *
 * Only the fields wired into the German marketing homepage are selected.
 * Other page types (About, Services, Work, Team, Clients, Contact) are NOT
 * fetched here — this step wires the Homepage only.
 */
export const homepageQuery = groq`*[_id == $id && _type == "homepage"][0]{
  _id,
  heroHeadline,
  introText,
  heroVideoUrl,
  mainIntroHeadline,
  mainIntroText,
  servicesSectionHeadline,
  workSectionHeadline,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription,
  heroImage{
    ...,
    "url": asset->url,
    "dimensions": asset->metadata.dimensions,
    "alt": coalesce(alt, asset->altText)
  }
}`;

export type SanityHomepageImage = {
  /** Raw asset reference kept so the image-url builder can honor hotspot/crop. */
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

export type SanityHomepage = {
  _id?: string | null;
  heroHeadline?: string | null;
  introText?: string | null;
  heroVideoUrl?: string | null;
  mainIntroHeadline?: string | null;
  mainIntroText?: string | null;
  servicesSectionHeadline?: string | null;
  workSectionHeadline?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  heroImage?: SanityHomepageImage;
};

/** The `heroImage` object is a valid source for the image-url builder. */
export function heroImageSource(
  image: SanityHomepageImage,
): SanityImageSource | null {
  return image?.asset?._ref ? (image as SanityImageSource) : null;
}

/**
 * Fetch the published Homepage document at build time.
 *
 * Returns `null` on any failure (network, missing document, malformed data)
 * so callers can fall back to the local content source and the static build
 * never breaks.
 */
export async function fetchSanityHomepage(): Promise<SanityHomepage | null> {
  try {
    const client = getSanityClient({ useCdn: false });
    const doc = await client.fetch<SanityHomepage | null>(homepageQuery, {
      id: HOMEPAGE_DOCUMENT_ID,
    });
    return doc ?? null;
  } catch (error) {
    // Non-fatal: keep the build green and fall back to local content.
    console.warn(
      "[sanity] Homepage fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
