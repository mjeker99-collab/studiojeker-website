"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityAbo } from "@/lib/sanity/abo";
import { getAboPageContent } from "@/lib/content/abo-page";
import {
  mergeSanityAbo,
  type ResolvedAboPageContent,
} from "@/lib/content/merge-sanity-abo";
import { AboLandingPage } from "@/components/abo/AboLandingPage";
import { createAboRefresh } from "@/lib/content/abo-refresh";

type AboLandingPageLiveProps = {
  locale: Locale;
  content: ResolvedAboPageContent;
};

type AboProxyResponse = {
  ok?: boolean;
  document?: SanityAbo | null;
};

/**
 * Client refresh for Metanet static export (same pattern as ContactPageLive).
 * Fetches `/api/abo-page.php` (Sanity live API, no CDN) so published Content-Abo
 * changes appear without waiting for a staging redeploy.
 */
export function AboLandingPageLive({
  locale,
  content,
}: AboLandingPageLiveProps) {
  const [live, setLive] = useState<ResolvedAboPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;
    // Keep the English route's existing refresh behavior outside this fix.
    const germanRefresh = locale === "de"
      ? createAboRefresh((document) => {
          setLive(mergeSanityAbo(getAboPageContent("de"), document, "de"));
        })
      : undefined;

    async function refreshFromSanity() {
      if (germanRefresh) return germanRefresh.refresh();
      try {
        const response = await fetch("/api/abo-page.php", {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as AboProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityAbo(
          getAboPageContent(locale),
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
      germanRefresh?.stop();
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [locale]);

  // Remount when live Sanity payload changes so next/image and the showreel
  // player pick up new assets immediately after publish.
  const contentKey = [
    resolved.hero.headline,
    resolved.hero.media.src,
    resolved.showreel.videoId ?? "",
    resolved.showreel.media.src,
  ].join("|");

  return <AboLandingPage key={contentKey} content={resolved} />;
}
