import { cache } from "react";
import type { Locale } from "@/types/i18n";
import { getAboPageContent } from "@/lib/content/abo-page";
import {
  getLocalResolvedAboContent,
  mergeSanityAbo,
  type ResolvedAboPageContent,
} from "@/lib/content/merge-sanity-abo";
import { fetchSanityAbo } from "@/lib/sanity/abo";

export type { ResolvedAboPageContent } from "@/lib/content/merge-sanity-abo";
export { mergeSanityAbo } from "@/lib/content/merge-sanity-abo";

/**
 * Build-time Content-Abo resolution (static export).
 * Runtime freshness on Metanet uses `/api/abo-page.php` + `AboLandingPageLive`.
 */
export const getResolvedAboContent = cache(
  async (locale: Locale): Promise<ResolvedAboPageContent> => {
    const local = getLocalResolvedAboContent(locale);
    const doc = await fetchSanityAbo();

    if (!doc) {
      return local;
    }

    return mergeSanityAbo(getAboPageContent(locale), doc, locale);
  },
);
