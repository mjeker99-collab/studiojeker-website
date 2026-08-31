"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityWork } from "@/lib/sanity/work";
import { getWorkPageContent } from "@/lib/content/work-page";
import { mergeSanityWork } from "@/lib/content/merge-sanity-work";
import type { WorkPageContent } from "@/types/work";
import { WorkPage } from "@/components/work/WorkPage";

type WorkPageLiveProps = {
  locale: Locale;
  /** Build-time content used until the live Sanity proxy responds. */
  content: WorkPageContent;
};

type WorkProxyResponse = {
  ok?: boolean;
  document?: SanityWork | null;
};

/**
 * Client refresh for Metanet static export (same pattern as HomePageLive).
 * Fetches `/api/work-page.php` (live Sanity API, no CDN) so published
 * Work changes appear within seconds without a redeploy.
 */
export function WorkPageLive({ locale, content }: WorkPageLiveProps) {
  const [live, setLive] = useState<WorkPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/work-page.php", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as WorkProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityWork(
          getWorkPageContent(locale),
          payload.document,
          locale,
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
  }, [locale]);

  return <WorkPage content={resolved} locale={locale} />;
}
