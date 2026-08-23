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

export type SanityService = {
  _id?: string | null;
  slug?: { current?: string | null } | null;
  heroImage?: SanityImageProjection;
  heroVideoUrl?: string | null;
};

/**
 * Published Service document projection (hero media only for this iteration).
 * Keep in sync with `public/api/service-page.php`.
 */
export const serviceBySlugQuery = groq`*[_type == "service" && slug.current == $slug][0]{
  _id,
  slug,
  heroImage${sanityImageProjection},
  heroVideoUrl
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
