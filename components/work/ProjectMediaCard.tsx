"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
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
  /* User gesture starts playback; start muted to avoid surprise audio. */
  const params =
    "autoplay=1&muted=1&dnt=1&playsinline=1&title=0&byline=0&portrait=0&badge=0";
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

function ImageLightbox({
  src,
  alt,
  title,
  closeLabel,
  onClose,
}: {
  src: string;
  alt: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <p id={titleId} className="visually-hidden">
        {title}
      </p>
      <button
        ref={closeRef}
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label={closeLabel}
      >
        ×
      </button>
      <div
        className={styles.lightboxFigure}
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={mediaPath(src)}
          alt={alt}
          fill
          sizes="100vw"
          className={styles.lightboxImage}
          priority
        />
      </div>
    </div>,
    document.body,
  );
}

function ImageMedia({
  media,
  openLabel,
  closeLabel,
}: {
  media: Extract<ProjectMedia, { type: "image" }>;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.imageButton}
        onClick={() => setOpen(true)}
        aria-label={openLabel}
      >
        <Image
          src={mediaPath(media.src)}
          alt={media.alt}
          fill
          sizes={MEDIA_SIZES}
          className={styles.mediaLayer}
        />
      </button>
      {open ? (
        <ImageLightbox
          src={media.src}
          alt={media.alt}
          title={openLabel}
          closeLabel={closeLabel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
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
    el.muted = true;
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
        muted
        preload="metadata"
      />
    );
  }

  return (
    <>
      <Image
        src={mediaPath(media.poster)}
        alt={media.alt ?? ""}
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

  const activeAlt = images[index]?.alt || media.alt || "Slideshow";

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
      aria-label={activeAlt}
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

/**
 * Interactive portfolio tile — never navigates off /work.
 */
export function ProjectMediaCard({ item, locale }: ProjectMediaCardProps) {
  const media = item.media;
  const playLabel =
    locale === "de" ? `Video abspielen: ${item.title}` : `Play video: ${item.title}`;
  const openLabel =
    locale === "de" ? `Bild ansehen: ${item.title}` : `View image: ${item.title}`;
  const closeLabel = locale === "de" ? "Schliessen" : "Close";

  const inner =
    media.type === "image" ? (
      <ImageMedia media={media} openLabel={openLabel} closeLabel={closeLabel} />
    ) : media.type === "video" ? (
      <VideoMedia media={media} label={playLabel} />
    ) : (
      <SlideshowMedia media={media} />
    );

  return (
    <article className={styles.card} aria-label={item.title}>
      <div className={styles.media}>{inner}</div>
    </article>
  );
}
