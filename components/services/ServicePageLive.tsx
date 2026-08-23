"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { ServicePageContent, ServicePageSlug } from "@/types/service-page";
import type { SanityService } from "@/lib/sanity/service";
import { getServicePageContent } from "@/lib/content/services";
import { mergeSanityService } from "@/lib/content/merge-sanity-service";
import { ServicePage } from "@/components/services/ServicePage";

type ServicePageLiveProps = {
  locale: Locale;
  slug: ServicePageSlug;
  /** Build-time content used until the live Sanity proxy responds. */
  content: ServicePageContent;
};

type ServiceProxyResponse = {
  ok?: boolean;
  document?: SanityService | null;
};

/**
 * Client refresh for Metanet static export (same pattern as ContactPageLive).
 * Fetches `/api/service-page.php?slug=…` so published Hero Image changes
 * appear within seconds without a redeploy.
 */
export function ServicePageLive({
  locale,
  slug,
  content,
}: ServicePageLiveProps) {
  const [live, setLive] = useState<ServicePageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch(
          `/api/service-page.php?slug=${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as ServiceProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityService(
          getServicePageContent(slug, locale),
          payload.document,
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
  }, [locale, slug]);

  return <ServicePage content={resolved} />;
}
