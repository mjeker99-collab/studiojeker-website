"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./VimeoShowreel.module.css";

type VimeoShowreelProps = {
  videoId: string;
  title: string;
  poster?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  className?: string;
};

/**
 * Reusable Vimeo showreel with poster-first lazy loading.
 * Loads the Vimeo iframe only after user interaction.
 */
export function VimeoShowreel({
  videoId,
  title,
  poster,
  className,
}: VimeoShowreelProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  const embedUrl = useMemo(() => {
    // No unnecessary Vimeo UI; start muted and only after user gesture.
    return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&dnt=1&playsinline=1&title=0&byline=0&portrait=0&badge=0`;
  }, [videoId]);

  const playLabel = `Play: ${title}`;

  return (
    <div className={[styles.shell, className].filter(Boolean).join(" ")}>
      {!shouldLoad ? (
        <button
          type="button"
          className={styles.button}
          onClick={() => setShouldLoad(true)}
          aria-label={playLabel}
        >
          {poster ? (
            <Image
              src={poster.src}
              alt={poster.alt}
              width={poster.width}
              height={poster.height}
              fill
              sizes="(max-width: 1024px) 100vw, 64vw"
              loading="lazy"
              className={styles.posterImage}
            />
          ) : null}
          <span className={styles.play} aria-hidden="true">
            <span className={styles.playTriangle} />
          </span>
        </button>
      ) : (
        <iframe
          className={styles.iframe}
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </div>
  );
}

