import { cache } from "react";
import type { Locale } from "@/types/i18n";
import {
  getAboutPageContent,
  type AboutPageContent,
} from "@/lib/content/about-page";
import { mergeClientLogos } from "@/lib/content/merge-client-logos";
import { fetchEnabledClientLogos } from "@/lib/sanity/clients";

/**
 * About page with Contact-identical Client logo list.
 * About has no live PHP proxy yet — logos refresh on the next static rebuild.
 */
export const getResolvedAboutPageContent = cache(
  async (locale: Locale): Promise<AboutPageContent> => {
    const base = getAboutPageContent(locale);
    const logos = await fetchEnabledClientLogos();
    const mergedLogos = mergeClientLogos(base.clients.logos, logos);

    if (mergedLogos === base.clients.logos) {
      return base;
    }

    return {
      ...base,
      clients: {
        ...base.clients,
        logos: mergedLogos,
      },
    };
  },
);
