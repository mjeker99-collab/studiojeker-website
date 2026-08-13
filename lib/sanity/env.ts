/**
 * Sanity env helpers for the Next.js marketing site.
 *
 * Project / dataset are public identifiers (safe as NEXT_PUBLIC_*).
 * Tokens must never use NEXT_PUBLIC_*.
 */

export const sanityProjectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "tgx6e6jg";

export const sanityDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";

export const sanityApiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-01-01";

/** Optional read token — server-only (drafts / private datasets). */
export function getSanityReadToken(): string | undefined {
  const token = process.env.SANITY_API_READ_TOKEN?.trim();
  return token || undefined;
}

export function isSanityConfigured(): boolean {
  return Boolean(sanityProjectId && sanityDataset);
}
