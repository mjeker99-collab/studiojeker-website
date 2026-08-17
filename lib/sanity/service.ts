import groq from "groq";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { getSanityClient } from "@/lib/sanity/client";
import type { ServicePageSlug } from "@/types/service-page";

/** Stable service document IDs — one per current service route. */
export const SERVICE_DOCUMENT_IDS: Record<ServicePageSlug, string> = {
  "digital-marketing": "service-digital-marketing",
  "business-communication": "service-business-communication",
  "product-communication": "service-product-communication",
  architecture: "service-architecture",
};

const imageProjection = groq`{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}`;

export const serviceBySlugQuery = groq`*[_type == "service" && slug.current == $slug][0]{
  _id,
  internalTitle,
  displayTitle,
  "slug": slug.current,
  heroLabel,
  heroHeadline,
  heroHeadlineAccent,
  heroSubheadline,
  heroIntroText,
  heroCtaLabel,
  heroCtaHref,
  heroImage${imageProjection},
  solutionsLabel,
  solutionsHeadline,
  solutions[]{
    itemId,
    title,
    description,
    href,
    icon
  },
  showreelLabel,
  showreelHeadline,
  showreelBody,
  showreelCtaLabel,
  showreelCtaHref,
  showreelImage${imageProjection},
  showreelVideoId,
  projectsLabel,
  projectsHeadline,
  projectsViewAllLabel,
  projectsViewAllHref,
  projects[]{
    itemId,
    title,
    category,
    href,
    isPlaceholder,
    image${imageProjection}
  },
  aboutLabel,
  aboutHeadline,
  aboutHeadlineAccent,
  aboutSubheadline,
  aboutText,
  aboutCtaLabel,
  aboutCtaHref,
  aboutImage${imageProjection},
  clientsLabel,
  ctaHeadline,
  ctaText,
  ctaLabel,
  ctaHref,
  seoTitle,
  seoDescription
}`;

export type SanityServiceImage = {
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

export type SanityServiceSolutionItem = {
  itemId?: string | null;
  title?: string | null;
  description?: string | null;
  href?: string | null;
  icon?: string | null;
};

export type SanityServiceProjectItem = {
  itemId?: string | null;
  title?: string | null;
  category?: string | null;
  href?: string | null;
  isPlaceholder?: boolean | null;
  image?: SanityServiceImage;
};

export type SanityServicePage = {
  _id?: string | null;
  internalTitle?: string | null;
  displayTitle?: string | null;
  slug?: string | null;
  heroLabel?: string | null;
  heroHeadline?: string | null;
  heroHeadlineAccent?: string | null;
  heroSubheadline?: string | null;
  heroIntroText?: string | null;
  heroCtaLabel?: string | null;
  heroCtaHref?: string | null;
  heroImage?: SanityServiceImage;
  solutionsLabel?: string | null;
  solutionsHeadline?: string | null;
  solutions?: SanityServiceSolutionItem[] | null;
  showreelLabel?: string | null;
  showreelHeadline?: string | null;
  showreelBody?: string | null;
  showreelCtaLabel?: string | null;
  showreelCtaHref?: string | null;
  showreelImage?: SanityServiceImage;
  showreelVideoId?: string | null;
  projectsLabel?: string | null;
  projectsHeadline?: string | null;
  projectsViewAllLabel?: string | null;
  projectsViewAllHref?: string | null;
  projects?: SanityServiceProjectItem[] | null;
  aboutLabel?: string | null;
  aboutHeadline?: string | null;
  aboutHeadlineAccent?: string | null;
  aboutSubheadline?: string | null;
  aboutText?: string | null;
  aboutCtaLabel?: string | null;
  aboutCtaHref?: string | null;
  aboutImage?: SanityServiceImage;
  clientsLabel?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function serviceImageSource(
  image: SanityServiceImage,
): SanityImageSource | null {
  return image?.asset?._ref ? (image as SanityImageSource) : null;
}

/**
 * Fetch one published service page at build time.
 * Returns null on any failure so callers can fall back to local content.
 */
export async function fetchSanityServicePage(
  slug: ServicePageSlug,
): Promise<SanityServicePage | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityServicePage | null>(
      serviceBySlugQuery,
      { slug },
    );
    return doc ?? null;
  } catch (error) {
    console.warn(
      `[sanity] Service "${slug}" fetch failed — falling back to local content.`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
