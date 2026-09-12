"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./HeroVimeoLoop.module.css";

type HeroVimeoLoopProps = {
  videoId: string;
  title: string;
  poster: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

const VIDEO_ASPECT = 16 / 9;

/**
 * Homepage-hero-only Vimeo background loop.
 * Muted autoplay, no chrome, object-fit: cover inside the existing photo slot.
 * Still-image fallback stays in HeroSection when no videoId is set.
 */
export function HeroVimeoLoop({ videoId, title, poster }: HeroVimeoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedUrl =
    `https://player.vimeo.com/video/${videoId}` +
    "?background=1" +
    "&autoplay=1" +
    "&muted=1" +
    "&loop=1" +
    "&autopause=0" +
    "&controls=0" +
    "&playsinline=1" +
    "&title=0" +
    "&byline=0" +
    "&portrait=0" +
    "&badge=0" +
    "&dnt=1" +
    "&transparent=0";

  useEffect(() => {
    const root = rootRef.current;
    const iframe = iframeRef.current;
    if (!root || !iframe) return;

    const fitCover = () => {
      const { width, height } = root.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      const containerRatio = width / height;
      let frameWidth: number;
      let frameHeight: number;

      if (containerRatio > VIDEO_ASPECT) {
        // Wider than 16:9 — match width, crop top/bottom.
        frameWidth = width;
        frameHeight = width / VIDEO_ASPECT;
      } else {
        // Taller than 16:9 — match height, crop sides.
        frameHeight = height;
        frameWidth = height * VIDEO_ASPECT;
      }

      // Slight overscale crops residual player chrome at the edges.
      const scale = 1.02;
      iframe.style.width = `${frameWidth * scale}px`;
      iframe.style.height = `${frameHeight * scale}px`;
    };

    fitCover();
    const observer = new ResizeObserver(fitCover);
    observer.observe(root);
    return () => observer.disconnect();
  }, [videoId]);

  return (
    <div ref={rootRef} className={styles.root}>
      <Image
        key={poster.src}
        src={poster.src}
        alt={poster.alt}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 64vw"
        className={styles.poster}
      />
      <iframe
        ref={iframeRef}
        className={styles.iframe}
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen={false}
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
