"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrolls to a Work tile/category hash on load and client navigations.
 * Offset comes from scroll-margin-top on the target — no spacer elements.
 */
export function WorkAnchorScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const scrollToHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw) return;

      const id = decodeURIComponent(raw);
      const el = document.getElementById(id);
      if (!el) return;

      el.scrollIntoView();
    };

    const frame = window.requestAnimationFrame(() => {
      scrollToHash();
    });

    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
