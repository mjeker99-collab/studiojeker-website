"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import type { SanityHomepage } from "@/lib/sanity/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { mergeSanityHomepage } from "@/lib/content/merge-sanity-homepage";
import { AboutSection } from "@/components/home/AboutSection";
import { AboSection } from "@/components/home/AboSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { ShowreelSection } from "@/components/home/ShowreelSection";

type HomePageLiveProps = {
  locale: Locale;
  /** Build-time / SSR content used until the live Sanity proxy responds. */
  content: HomepageContent;
};

type HomepageProxyResponse = {
  ok?: boolean;
  document?: SanityHomepage | null;
};

/**
 * Client refresh for Metanet static export.
 * Build-time HTML may be minutes/hours old until the next webhook deploy.
 * This fetches `/api/homepage.php` (live Sanity API, no CDN) so published
 * Homepage changes appear within seconds without a redeploy.
 */
export function HomePageLive({ locale, content }: HomePageLiveProps) {
  const [resolved, setResolved] = useState(content);

  useEffect(() => {
    setResolved(content);
  }, [content]);

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSanity() {
      try {
        const response = await fetch("/api/homepage.php", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as HomepageProxyResponse;
        if (cancelled || !payload.ok || !payload.document) return;

        const next = mergeSanityHomepage(
          getHomepageContent(locale),
          payload.document,
          locale,
        );
        setResolved(next);
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

  return (
    <>
      <HeroSection
        key={`hero-${resolved.hero.media.src}-${resolved.hero.videoId ?? "image"}`}
        content={resolved.hero}
      />
      <ServicesSection content={resolved.services} />
      <ShowreelSection content={resolved.showreel} />
      <ProjectsSection content={resolved.projects} />
      <AboSection content={resolved.abo} />
      <AboutSection content={resolved.about} />
      <ClientsSection content={resolved.clients} />
      <FinalCtaSection content={resolved.finalCta} />
    </>
  );
}
