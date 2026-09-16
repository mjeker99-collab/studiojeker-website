"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityAi } from "@/lib/sanity/ai";
import { getAiPageContent } from "@/lib/content/ai-page";
import {
  mergeSanityAi,
  type ResolvedAiPageContent,
} from "@/lib/content/merge-sanity-ai";
import { AiPage } from "@/components/ai/AiPage";

type AiPageLiveProps = {
  locale: Locale;
  /** Build-time content used until the live Sanity proxy responds. */
  content: ResolvedAiPageContent;
};

type AiProxyResponse = {
  ok?: boolean;
  document?: SanityAi | null;
};

/**
 * Client refresh for Metanet static export (same pattern as AboutPageLive).
 * Fetches `/api/ai-page.php` (live Sanity API, no CDN) so published
 * KI/AI changes appear without waiting for a redeploy.
 */
export function AiPageLive({ locale, content }: AiPageLiveProps) {
  const [live, setLive] = useState<ResolvedAiPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/ai-page.php", {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as AiProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        setLive(
          mergeSanityAi(getAiPageContent(locale), payload.document, locale),
        );
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
  }, [locale]);

  const contentKey = [
    resolved.hero.headline,
    resolved.hero.media.src,
    resolved.hero.videoId ?? "",
    resolved.intro.media?.src ?? "",
    resolved.applications.items.map((item) => item.title).join(","),
  ].join("|");

  return <AiPage key={contentKey} content={resolved} />;
}
