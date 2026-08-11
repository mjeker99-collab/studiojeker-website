"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { mediaPath } from "@/lib/media/paths";
import type { Locale } from "@/types/i18n";
import type { ProjectMedia, WorkProjectItem } from "@/types/work";
import styles from "./ProjectMediaCard.module.css";

type ProjectMediaCardProps = {
  item: WorkProjectItem;
  locale: Locale;
};

const MEDIA_SIZES =
  "(max-width: 47.9375rem) 100vw, (max-width: 63.9375rem) 50vw, 25vw";

function vimeoEmbedUrl(src: string): string {
  const id = src.trim();
  const base = /^\d+$/.test(id)
    ? `https://player.vimeo.com/video/${id}`
    : src.includes("player.vimeo.com")
      ? src.split("?")[0]
      : src;
  const params =
    "autoplay=1&muted=0&dnt=1&playsinline=1&title=0&byline=0&portrait=0&badge=0";
  return `${base}?${params}`;
}

function resolveProvider(
  media: Extract<ProjectMedia, { type: "video" }>,
): "local" | "vimeo" {
  if (media.provider) return media.provider;
  if (media.src.includes("vimeo") || /^\d+$/.test(media.src.trim())) {
    return "vimeo";
  }
  return "local";
}

function ImageMedia({
  media,
}: {
  media: Extract<ProjectMedia, { type: "image" }>;
}) {
  return (
    <Image
      src={mediaPath(media.src)}
      alt={media.alt}
      fill
      sizes={MEDIA_SIZES}
      className={styles.mediaLayer}
    />
  );
}

function VideoMedia({
  media,
  label,
}: {
  media: Extract<ProjectMedia, { type: "video" }>;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const provider = resolveProvider(media);

  const start = useCallback(() => {
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing || provider !== "local") return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      /* native controls remain available */
    });
  }, [playing, provider]);

  if (playing) {
    if (provider === "vimeo") {
      return (
        <div className={styles.iframeWrap}>
          <iframe
            className={styles.iframe}
            src={vimeoEmbedUrl(media.src)}
            title={label}
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        className={styles.videoEl}
        src={mediaPath(media.src)}
        poster={mediaPath(media.poster)}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <>
      <Image
        src={mediaPath(media.poster)}
        alt={media.posterAlt ?? ""}
        fill
        sizes={MEDIA_SIZES}
        className={styles.mediaLayer}
      />
      <button type="button" className={styles.playButton} onClick={start} aria-label={label}>
        <span className={styles.playIcon} aria-hidden="true">
          <span className={styles.playTriangle} />
        </span>
      </button>
      {media.duration ? <p className={styles.duration}>{media.duration}</p> : null}
    </>
  );
}

function SlideshowMedia({
  media,
}: {
  media: Extract<ProjectMedia, { type: "slideshow" }>;
}) {
  const images = media.images;
  const intervalMs = media.interval ?? 4500;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (images.length < 2 || paused || reduceMotion.current) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [images.length, intervalMs, paused]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || images.length < 2) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    setIndex((current) =>
      dx < 0 ? (current + 1) % images.length : (current - 1 + images.length) % images.length,
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (images.length < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setIndex((current) => (current + 1) % images.length);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndex((current) => (current - 1 + images.length) % images.length);
    }
  };

  return (
    <div
      className={styles.slideshow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="carousel"
      aria-label={images[index]?.alt ?? "Slideshow"}
      tabIndex={0}
    >
      {images.map((image, i) => (
        <Image
          key={`${image.src}-${i}`}
          src={mediaPath(image.src)}
          alt={i === index ? image.alt : ""}
          fill
          sizes={MEDIA_SIZES}
          className={`${styles.slide} ${i === index ? styles.slideActive : ""}`}
          aria-hidden={i !== index}
        />
      ))}
      {images.length > 1 ? (
        <div className={styles.dots} aria-hidden="true">
          {images.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectMediaCard({ item, locale }: ProjectMediaCardProps) {
  const media = item.media;
  const playLabel =
    locale === "de" ? `Video abspielen: ${item.title}` : `Play video: ${item.title}`;

  const inner =
    media.type === "image" ? (
      <ImageMedia media={media} />
    ) : media.type === "video" ? (
      <VideoMedia media={media} label={playLabel} />
    ) : (
      <SlideshowMedia media={media} />
    );

  const content = <div className={styles.media}>{inner}</div>;

  if (media.type === "image" && item.href) {
    return (
      <Link href={item.href} className={styles.card} aria-label={item.title}>
        {content}
      </Link>
    );
  }

  return (
    <article className={styles.card} aria-label={item.title}>
      {content}
    </article>
  );
}
