"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { buildVimeoEmbedSrc } from "@/lib/sanity/vimeo";
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
  /** Fill the parent container instead of using a fixed aspect ratio. */
  fill?: boolean;
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
  fill = false,
}: VimeoShowreelProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  const embedUrl = useMemo(() => buildVimeoEmbedSrc(videoId), [videoId]);

  const playLabel = `Play: ${title}`;

  return (
    <div
      className={[styles.shell, fill ? styles.fill : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {!shouldLoad ? (
        <button
          type="button"
          className={styles.button}
          onClick={() => setShouldLoad(true)}
          aria-label={playLabel}
        >
          {poster ? (
            <Image
              key={poster.src}
              src={poster.src}
              alt={poster.alt}
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
          allowFullScreen
        />
      )}
    </div>
  );
}
