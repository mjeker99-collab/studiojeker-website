import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type { WorkPageContent } from "@/types/work";
import { getWorkPageContent } from "@/lib/content/work-page";
import { mergeSanityWork } from "@/lib/content/merge-sanity-work";
import { fetchSanityWork } from "@/lib/sanity/work";

export { mergeSanityWork } from "@/lib/content/merge-sanity-work";

/**
 * Build-time Work page resolution (static export).
 * Bakes Sanity content into HTML with local fallback when CMS data is missing.
 */
export const getResolvedWorkPageContent = cache(
  async (locale: Locale): Promise<WorkPageContent> => {
    const base = getWorkPageContent(locale);
    const doc = await fetchSanityWork();

    if (!doc) {
      return base;
    }

    return mergeSanityWork(base, doc, locale);
  },
);
