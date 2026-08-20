import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { mergeSanityHomepage } from "@/lib/content/merge-sanity-homepage";
import { fetchSanityHomepage } from "@/lib/sanity/homepage";

export { mergeSanityHomepage } from "@/lib/content/merge-sanity-homepage";

/**
 * Build-time Homepage resolution (static export).
 * Bakes Sanity content into HTML. Runtime freshness on Metanet uses
 * `/api/homepage.php` + `HomePageLive` instead of ISR.
 */
export const getResolvedHomepageContent = cache(
  async (locale: Locale): Promise<HomepageContent> => {
    const base = getHomepageContent(locale);
    const doc = await fetchSanityHomepage();

    if (!doc) {
      return base;
    }

    return mergeSanityHomepage(base, doc, locale);
  },
);
