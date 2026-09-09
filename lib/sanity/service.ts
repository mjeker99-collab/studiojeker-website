import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  sanityImageProjection,
  type SanityImageProjection,
} from "@/lib/sanity/media";
import type { ServicePageSlug } from "@/types/service-page";

/** Deterministic Service document IDs (matches migration / Studio). */
export const SERVICE_DOCUMENT_IDS = {
  "digital-marketing": "service-digital-marketing",
  "business-communication": "service-business-communication",
  "product-communication": "service-product-communication",
  architecture: "service-architecture",
} as const satisfies Record<ServicePageSlug, string>;

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
  description?: string | null;
  href?: string | null;
  isPlaceholder?: boolean | null;
  image?: SanityImageProjection;
  videoUrl?: string | null;
};

/**
 * Published Service document — full page fields (not hero-only).
 * Keep in sync with `public/api/service-page.php`.
 */
export type SanityService = {
  _id?: string | null;
  internalTitle?: string | null;
  displayTitle?: string | null;
  slug?: { current?: string | null } | null;
  homepageTitle?: { de?: string | null; en?: string | null } | null;
  homepageDescription?: { de?: string | null; en?: string | null } | null;
  heroLabel?: string | null;
  heroHeadline?: string | null;
  heroHeadlineAccent?: string | null;
  heroSubheadline?: string | null;
  heroIntroText?: string | null;
  heroCtaLabel?: string | null;
  heroCtaHref?: string | null;
  heroImage?: SanityImageProjection;
  heroVideoUrl?: string | null;
  solutionsLabel?: string | null;
  solutionsHeadline?: string | null;
  solutions?: SanityServiceSolutionItem[] | null;
  showreelLabel?: string | null;
  showreelHeadline?: string | null;
  showreelBody?: string | null;
  showreelCtaLabel?: string | null;
  showreelCtaHref?: string | null;
  showreelImage?: SanityImageProjection;
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
  aboutImage?: SanityImageProjection;
  clientsLabel?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/**
 * Full Service projection by public slug.
 * Previously only selected heroImage/heroVideoUrl — that left all other
 * published Studio fields unused, so text/media edits never reached staging.
 */
export const serviceBySlugQuery = groq`*[_type == "service" && slug.current == $slug][0]{
  _id,
  internalTitle,
  displayTitle,
  slug,
  homepageTitle,
  homepageDescription,
  heroLabel,
  heroHeadline,
  heroHeadlineAccent,
  heroSubheadline,
  heroIntroText,
  heroCtaLabel,
  heroCtaHref,
  heroImage${sanityImageProjection},
  heroVideoUrl,
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
  showreelImage${sanityImageProjection},
  showreelVideoId,
  projectsLabel,
  projectsHeadline,
  projectsViewAllLabel,
  projectsViewAllHref,
  projects[]{
    itemId,
    title,
    category,
    description,
    href,
    isPlaceholder,
    image${sanityImageProjection},
    videoUrl
  },
  aboutLabel,
  aboutHeadline,
  aboutHeadlineAccent,
  aboutSubheadline,
  aboutText,
  aboutCtaLabel,
  aboutCtaHref,
  aboutImage${sanityImageProjection},
  clientsLabel,
  ctaHeadline,
  ctaText,
  ctaLabel,
  ctaHref,
  seoTitle,
  seoDescription
}`;

/**
 * Fetch one published Service by public slug at build time.
 * Returns null on failure so callers fall back to local content.
 */
export async function fetchSanityService(
  slug: ServicePageSlug,
): Promise<SanityService | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityService | null>(serviceBySlugQuery, {
      slug,
    });
    return doc ?? null;
  } catch (error) {
    console.warn(
      `[sanity] Service fetch failed for "${slug}" — falling back to local content.`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
