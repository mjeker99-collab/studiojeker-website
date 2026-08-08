"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal helper with progressive enhancement.
 * Content stays visible unless JS successfully arms a pending animation.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    let armed = false;
    const armFrame = window.requestAnimationFrame(() => {
      armed = true;
      setPending(true);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          setPending(false);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);

    const failOpen = window.setTimeout(() => {
      setVisible(true);
      setPending(false);
      observer.disconnect();
    }, 600);

    return () => {
      window.cancelAnimationFrame(armFrame);
      window.clearTimeout(failOpen);
      observer.disconnect();
      if (!armed) {
        return;
      }
    };
  }, []);

  return { ref, pending, visible };
}
