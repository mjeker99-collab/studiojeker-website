"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { SanityAbout } from "@/lib/sanity/about";
import { getAboutPageContent } from "@/lib/content/about-page";
import {
  mergeSanityAbout,
  type ResolvedAboutPageContent,
} from "@/lib/content/merge-sanity-about";
import { AboutPage } from "@/components/about/AboutPage";

type AboutPageLiveProps = {
  locale: Locale;
  /** Build-time content used until the live Sanity proxy responds. */
  content: ResolvedAboutPageContent;
};

type AboutProxyResponse = {
  ok?: boolean;
  document?: SanityAbout | null;
};

/**
 * Client refresh for Metanet static export (same pattern as ContactPageLive).
 * Fetches `/api/about-page.php` (live Sanity API, no CDN) so published
 * About / team portrait changes appear without waiting for a redeploy.
 */
export function AboutPageLive({ locale, content }: AboutPageLiveProps) {
  const [live, setLive] = useState<ResolvedAboutPageContent | null>(null);
  const resolved = live ?? content;

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/about-page.php", {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as AboutProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        setLive(
          mergeSanityAbout(
            getAboutPageContent(locale),
            payload.document,
            locale,
          ),
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

  // Remount when published portraits / feature media change so next/image
  // picks up new Sanity CDN URLs immediately after publish.
  const contentKey = [
    resolved.team.featureMedia.src,
    ...resolved.team.members.map(
      (member) =>
        `${member.id}:${member.isPlaceholder ? "slot" : member.image?.src ?? ""}`,
    ),
    resolved.hero.media.src,
  ].join("|");

  return <AboutPage key={contentKey} content={resolved} />;
}
