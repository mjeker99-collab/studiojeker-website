"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityAi } from "@/lib/sanity/ai";
import { getEmptyAiPageContent } from "@/lib/content/ai-page";
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

        // Preserve build-time client logos (fetched server-side). The PHP proxy
        // returns only the AI singleton — same limitation as About Live.
        const merged = mergeSanityAi(
          getEmptyAiPageContent(locale),
          payload.document,
          locale,
        );
        setLive({
          ...merged,
          clients: {
            ...merged.clients,
            logos: content.clients.logos,
          },
        });
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
  }, [locale, content.clients.logos]);

  // Remount when published media changes so next/image and HeroVimeoLoop
  // pick up new Sanity CDN URLs / Vimeo IDs immediately after publish.
  const contentKey = [
    resolved.hero.headline,
    resolved.hero.media.src,
    resolved.hero.videoId ?? "",
    resolved.intro.media?.src ?? "",
    resolved.intro.videoId ?? "",
    resolved.visuals.keyVisual?.src ?? "",
    resolved.visuals.clayVilla?.src ?? "",
    resolved.visuals.photoVilla?.src ?? "",
    resolved.visuals.contentFormats?.src ?? "",
    resolved.visuals.distributionChannels?.src ?? "",
    resolved.landscapeBreaks.afterAi?.media?.src ?? "",
    resolved.landscapeBreaks.afterAi?.videoId ?? "",
    resolved.landscapeBreaks.afterDistribution?.media?.src ?? "",
    resolved.landscapeBreaks.afterVisibility?.media?.src ?? "",
    resolved.landscapeBreaks.midApplications?.media?.src ?? "",
    resolved.landscapeBreaks.afterApplications?.media?.src ?? "",
    resolved.landscapeBreaks.afterModels?.media?.src ?? "",
    resolved.landscapeBreaks.afterExperience?.media?.src ?? "",
    resolved.process.steps.map((step) => step.title).join(","),
    resolved.showreel.videoId ?? "",
    resolved.showreel.media.src,
    resolved.applications.media?.src ?? "",
    resolved.applications.videoId ?? "",
    resolved.models.media?.src ?? "",
    resolved.models.videoId ?? "",
    resolved.experience.media?.src ?? "",
    resolved.experience.videoId ?? "",
    resolved.approach.media?.src ?? "",
    resolved.approach.videoId ?? "",
    resolved.applications.items.map((item) => item.title).join(","),
    resolved.closing.headline,
  ].join("|");

  return <AiPage key={contentKey} content={resolved} />;
}
