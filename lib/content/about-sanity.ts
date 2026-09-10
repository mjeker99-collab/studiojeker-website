import { cache } from "react";
import type { Locale } from "@/types/i18n";
import { getAboutPageContent } from "@/lib/content/about-page";
import {
  getLocalResolvedAboutPageContent,
  mergeAboutClientLogos,
  mergeSanityAbout,
  type ResolvedAboutPageContent,
} from "@/lib/content/merge-sanity-about";
import { fetchSanityAbout } from "@/lib/sanity/about";

export type { ResolvedAboutPageContent } from "@/lib/content/merge-sanity-about";
export { mergeSanityAbout } from "@/lib/content/merge-sanity-about";

/**
 * Build-time About resolution (static export).
 * Runtime freshness on Metanet uses `/api/about-page.php` + `AboutPageLive`.
 *
 * Team portraits come from the About singleton (`teamMembers[].portrait`),
 * not from standalone `teamMember` documents. Grid is capped at 6 (2×3).
 * A leftover `isPlaceholder` flag must not hide a published portrait.
 */
export const getResolvedAboutPageContent = cache(
  async (locale: Locale): Promise<ResolvedAboutPageContent> => {
    const base = getAboutPageContent(locale);
    const local = getLocalResolvedAboutPageContent(locale);
    const doc = await fetchSanityAbout();

    const merged = doc ? mergeSanityAbout(base, doc, locale) : local;
    return mergeAboutClientLogos(merged);
  },
);
