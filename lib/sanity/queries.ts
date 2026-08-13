import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";

/** Temporary integration-test query — not used by production pages. */
export const homepageTestQuery = groq`*[_type == "homepage"][0]{
  heroHeadline,
  introText,
  heroImage
}`;

export type SanityHomepageTestDoc = {
  heroHeadline?: string | null;
  introText?: string | null;
  heroImage?: {
    asset?: {
      _ref?: string;
      _type?: string;
    };
    hotspot?: unknown;
    crop?: unknown;
  } | null;
};

/**
 * Fetch the published Homepage document for /sanity-test only.
 * Uses the public CDN client (no token required for published content).
 */
export async function fetchHomepageForTest(): Promise<SanityHomepageTestDoc | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityHomepageTestDoc | null>(
      homepageTestQuery,
    );
    return doc ?? null;
  } catch {
    return null;
  }
}
