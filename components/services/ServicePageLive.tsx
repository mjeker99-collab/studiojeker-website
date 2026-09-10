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
 * Client refresh for Metanet static export (same pattern as HomePageLive).
 * Fetches `/api/service-page.php?slug=…` (live Sanity API, no CDN) so published
 * Service text/media changes appear within seconds without a redeploy.
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
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as ServiceProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityService(
          getServicePageContent(slug, locale),
          payload.document,
          locale,
        );
        setLive(next);
      } catch {
        // Keep build-time content when the proxy is unavailable.
      }
    }

    void refreshFromSanity();

    const pollId = window.setInterval(() => {
      void refreshFromSanity();
    }, 20000);

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
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [locale, slug]);

  // Remount when live Sanity payload changes so next/image and showreel
  // pick up new assets immediately after publish (same as HomePageLive / Abo).
  const contentKey = [
    slug,
    resolved.hero.headline,
    resolved.hero.media.src,
    resolved.showreel.videoId ?? "",
    resolved.showreel.media.src,
    resolved.about.media.src,
    resolved.projects.items.map((item) => item.image.src).join(","),
    resolved.clients.logos.map((logo) => logo.src).join(","),
  ].join("|");

  return <ServicePage key={contentKey} content={resolved} />;
}
