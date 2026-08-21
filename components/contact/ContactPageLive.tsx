"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityContact } from "@/lib/sanity/contact";
import { getContactPageContent } from "@/lib/content/contact";
import {
  mergeSanityContact,
  type ResolvedContactPageContent,
} from "@/lib/content/merge-sanity-contact";
import { ContactPage } from "@/components/contact/ContactPage";

type ContactPageLiveProps = {
  locale: Locale;
  /** Build-time content used until the live Sanity proxy responds. */
  content: ResolvedContactPageContent;
  clientsLabel: string;
};

type ContactProxyResponse = {
  ok?: boolean;
  document?: SanityContact | null;
};

/**
 * Client refresh for Metanet static export (same pattern as HomePageLive).
 * Fetches `/api/contact-page.php` (live Sanity API, no CDN) so published
 * Contact changes appear within seconds without a redeploy.
 */
export function ContactPageLive({
  locale,
  content,
  clientsLabel,
}: ContactPageLiveProps) {
  const [live, setLive] = useState<ResolvedContactPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/contact-page.php", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as ContactProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityContact(
          getContactPageContent(locale),
          payload.document,
          locale,
          clientsLabel,
        );
        setLive(next);
      } catch {
        // Keep build-time content when the proxy is unavailable.
      }
    }

    void refreshFromSanity();

    const onFocus = () => {
      void refreshFromSanity();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFromSanity();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [locale, clientsLabel]);

  return <ContactPage content={resolved} locale={locale} />;
}
