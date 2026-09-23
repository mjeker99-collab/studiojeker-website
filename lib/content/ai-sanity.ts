import { cache } from "react";
import type { Locale } from "@/types/i18n";
import { getEmptyAiPageContent } from "@/lib/content/ai-page";
import {
  getLocalResolvedAiContent,
  mergeAiClientLogos,
  mergeSanityAi,
  type ResolvedAiPageContent,
} from "@/lib/content/merge-sanity-ai";
import { fetchSanityAi } from "@/lib/sanity/ai";

export type { ResolvedAiPageContent } from "@/lib/content/merge-sanity-ai";
export { mergeSanityAi } from "@/lib/content/merge-sanity-ai";

/**
 * Build-time KI/AI resolution (static export).
 * Content comes from Sanity only — empty shell when the document is missing.
 * Runtime freshness on Metanet uses `/api/ai-page.php` + `AiPageLive`.
 */
export const getResolvedAiPageContent = cache(
  async (locale: Locale): Promise<ResolvedAiPageContent> => {
    const local = getLocalResolvedAiContent(locale);
    const doc = await fetchSanityAi();

    const merged = doc
      ? mergeSanityAi(getEmptyAiPageContent(locale), doc, locale)
      : local;

    return mergeAiClientLogos(merged);
  },
);
