import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  sanityImageProjection,
  type SanityImageProjection,
} from "@/lib/sanity/media";

/**
 * Published Client / Logo document shape used by the shared ClientsSection.
 * Matches the Contact page logo-slider projection.
 */
export type SanityClientLogo = {
  _id?: string;
  name?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  logo?: SanityImageProjection;
} | null;

/**
 * All published Client / Logo documents that are enabled and have a logo asset.
 *
 * Intentionally uncapped: no [0...N], slice, or limit. Order is sortOrder only.
 * Used by Homepage, Contact, Services and About so newly published logos appear
 * without editing a curated reference array — same source as Contact.
 */
export const allEnabledClientLogosProjection = `*[_type == "client" && active != false && defined(logo.asset)] | order(coalesce(sortOrder, 999999) asc) {
  _id,
  name,
  websiteUrl,
  sortOrder,
  active,
  logo${sanityImageProjection}
}`;

const enabledClientLogosQuery = groq`${allEnabledClientLogosProjection}`;

/**
 * Fetch every enabled Client logo (Contact logo-slider source).
 * Returns [] on failure so callers keep local fallbacks.
 */
export async function fetchEnabledClientLogos(): Promise<SanityClientLogo[]> {
  try {
    const client = getSanityClient();
    const logos = await client.fetch<SanityClientLogo[] | null>(
      enabledClientLogosQuery,
    );
    return logos ?? [];
  } catch (error) {
    console.warn(
      "[sanity] Client logos fetch failed — falling back to local logos.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
