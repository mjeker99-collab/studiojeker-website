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
 */
export function AboLandingPageLive({
  locale,
  content,
}: AboLandingPageLiveProps) {
  const [live, setLive] = useState<ResolvedAboPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/abo-page.php", {
          cache: "no-store",
          headers: { Accept: "application/json" },
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

  return <AboLandingPage content={resolved} />;
}
