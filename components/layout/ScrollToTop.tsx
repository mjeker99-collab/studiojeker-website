"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Ensures client-side navigations land at the top of the page.
 * Global `scroll-behavior: smooth` on `html` can leave the viewport
 * at the previous scroll offset (often the footer) after route changes.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Keep in-page hash targets (e.g. /#services).
    if (window.location.hash) {
      return;
    }

    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previousBehavior;
  }, [pathname]);

  return null;
}
