"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AboPromoContent } from "@/lib/content/abo-page";
import { isAboPromoActive } from "@/lib/content/abo-promo";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./AboLandingPage.module.css";

type AboPromoBannerProps = {
  promo: AboPromoContent;
};

function subscribeToClock(onStoreChange: () => void): () => void {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}

/**
 * Renders the limited promotion only while the Sanity date window is active
 * (Europe/Zurich, inclusive). Evaluated on the client so a static export can
 * pick up the window without a redeploy on the start day.
 */
function subscribeToPreviewHash(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);
  const unsubscribeClock = subscribeToClock(onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    unsubscribeClock();
  };
}

export function AboPromoBanner({ promo }: AboPromoBannerProps) {
  const getSnapshot = useCallback(() => {
    // `#promo-preview` lets editors verify the block outside the date window.
    if (window.location.hash === "#promo-preview") return true;
    return isAboPromoActive(promo);
  }, [promo]);
  const active = useSyncExternalStore(
    subscribeToPreviewHash,
    getSnapshot,
    () => false,
  );

  if (!active) {
    return null;
  }

  return (
    <Reveal className={styles.promo}>
      <div className={styles.promoInner}>
        <div className={styles.promoCopy}>
          <SectionLabel>{promo.label}</SectionLabel>
          <h3 className={styles.promoHeadline}>{promo.headline}</h3>
          <p className={styles.promoText}>{promo.text}</p>
          <ul className={styles.promoTerms}>
            {promo.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>
        <Button href={promo.cta.href} variant="cyan" fullWidthMobile>
          {promo.cta.label}
        </Button>
      </div>
    </Reveal>
  );
}
