import { cache } from "react";
import type { Locale } from "@/types/i18n";
import { getContactPageContent } from "@/lib/content/contact";
import {
  getLocalResolvedContactContent,
  mergeSanityContact,
  type ResolvedContactPageContent,
} from "@/lib/content/merge-sanity-contact";
import { fetchSanityContact } from "@/lib/sanity/contact";

export type { ResolvedContactPageContent } from "@/lib/content/merge-sanity-contact";
export { mergeSanityContact } from "@/lib/content/merge-sanity-contact";

/**
 * Build-time Contact resolution (static export).
 * Runtime freshness on Metanet uses `/api/contact-page.php` + `ContactPageLive`.
 */
export const getResolvedContactContent = cache(
  async (
    locale: Locale,
    clientsLabel: string,
  ): Promise<ResolvedContactPageContent> => {
    const base = getContactPageContent(locale);
    const local = getLocalResolvedContactContent(locale, clientsLabel);
    const doc = await fetchSanityContact();

    if (!doc) {
      return local;
    }

    return mergeSanityContact(base, doc, locale, clientsLabel);
  },
);
