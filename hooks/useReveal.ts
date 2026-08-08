"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal visibility helper.
 * Content must never remain permanently hidden if observation fails.
 * Threshold stays at 0 so tall sections still reveal when any part enters view.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // threshold: 0 — tall homepage sections can never reach 18% visibility
      // inside the viewport, which previously left them stuck at opacity: 0.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);

    // Fail-open so a missed intersection can never blank the homepage.
    const failOpen = window.setTimeout(() => {
      setVisible(true);
      observer.disconnect();
    }, 800);

    return () => {
      observer.disconnect();
      window.clearTimeout(failOpen);
    };
  }, []);

  return { ref, visible };
}
