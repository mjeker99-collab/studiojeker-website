import { cache } from "react";
import type { Locale } from "@/types/i18n";
import type { ServicePageContent, ServicePageSlug } from "@/types/service-page";
import { getServicePageContent } from "@/lib/content/services";
import { mergeSanityService } from "@/lib/content/merge-sanity-service";
import { fetchSanityService } from "@/lib/sanity/service";

export { mergeSanityService } from "@/lib/content/merge-sanity-service";

/**
 * Build-time Service resolution (static export).
 * Runtime freshness on Metanet uses `/api/service-page.php` + `ServicePageLive`.
 */
export const getResolvedServiceContent = cache(
  async (
    slug: ServicePageSlug,
    locale: Locale,
  ): Promise<ServicePageContent> => {
    const base = getServicePageContent(slug, locale);
    const doc = await fetchSanityService(slug);

    if (!doc) {
      return base;
    }

    return mergeSanityService(base, doc);
  },
);
