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
  type ReactNode,
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

type VideoProvider = "local" | "vimeo" | "youtube";

function vimeoEmbedUrl(
  src: string,
  options: { autoplay?: boolean; muted?: boolean; loop?: boolean },
): string {
  const id = src.trim();
  const base = /^\d+$/.test(id)
    ? `https://player.vimeo.com/video/${id}`
    : src.includes("player.vimeo.com")
      ? src.split("?")[0]
      : src;
  const params = new URLSearchParams({
    autoplay: options.autoplay === false ? "0" : "1",
    muted: options.muted === false ? "0" : "1",
    loop: options.loop ? "1" : "0",
    dnt: "1",
    playsinline: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    badge: "0",
  });
  return `${base}?${params.toString()}`;
}

function youtubeEmbedUrl(
  src: string,
  options: { autoplay?: boolean; muted?: boolean; loop?: boolean },
): string {
  const id = src.trim();
  const videoId = /^[\w-]{11}$/.test(id) ? id : id;
  const params = new URLSearchParams({
    autoplay: options.autoplay === false ? "0" : "1",
    mute: options.muted === false ? "0" : "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (options.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function resolveProvider(
  media: Extract<ProjectMedia, { type: "video" }>,
): VideoProvider {
  if (media.provider) return media.provider;
  if (media.src.includes("youtu") || /^[\w-]{11}$/.test(media.src.trim())) {
    return "youtube";
  }
  if (media.src.includes("vimeo") || /^\d+$/.test(media.src.trim())) {
    return "vimeo";
  }
  return "local";
}

function MediaLightbox({
  title,
  closeLabel,
  onClose,
  children,
  contentClassName,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    scrollYRef.current = window.scrollY;
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
      window.scrollTo(0, scrollYRef.current);
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
        className={contentClassName ?? styles.lightboxContent}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
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
  return (
    <MediaLightbox title={title} closeLabel={closeLabel} onClose={onClose}>
      <div className={styles.lightboxFigure}>
        <Image
          src={mediaPath(src)}
          alt={alt}
          fill
          sizes="100vw"
          className={styles.lightboxImage}
          priority
        />
      </div>
    </MediaLightbox>
  );
}

function SlideshowLightbox({
  images,
  initialIndex,
  title,
  closeLabel,
  prevLabel,
  nextLabel,
  onClose,
}: {
  images: Extract<ProjectMedia, { type: "slideshow" }>["images"];
  initialIndex: number;
  title: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const active = images[index];

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setIndex((current) => (current - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setIndex((current) => (current + 1) % count);
  }, [count]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || count < 2) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (!active) return null;

  return (
    <MediaLightbox
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      contentClassName={styles.galleryLightboxContent}
    >
      <div
        className={styles.galleryLightbox}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {count > 1 ? (
          <button
            type="button"
            className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
            onClick={goPrev}
            aria-label={prevLabel}
          >
            <span className={styles.galleryNavIcon} aria-hidden="true" />
          </button>
        ) : null}

        <figure className={styles.galleryFigure}>
          <Image
            src={mediaPath(active.src)}
            alt={active.alt}
            fill
            sizes="100vw"
            className={styles.galleryImage}
            priority
          />
          {active.caption ? (
            <figcaption className={styles.galleryCaption}>{active.caption}</figcaption>
          ) : null}
        </figure>

        {count > 1 ? (
          <button
            type="button"
            className={`${styles.galleryNav} ${styles.galleryNavNext}`}
            onClick={goNext}
            aria-label={nextLabel}
          >
            <span className={styles.galleryNavIcon} aria-hidden="true" />
          </button>
        ) : null}

        {count > 1 ? (
          <p className={styles.galleryCounter} aria-live="polite">
            {index + 1} / {count}
          </p>
        ) : null}
      </div>
    </MediaLightbox>
  );
}

function VideoLightbox({
  media,
  title,
  closeLabel,
  onClose,
}: {
  media: Extract<ProjectMedia, { type: "video" }>;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const provider = resolveProvider(media);
  const playback = {
    autoplay: media.autoplay ?? true,
    muted: media.muted ?? true,
    loop: media.loop ?? false,
  };

  useEffect(() => {
    if (provider !== "local") return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = playback.muted;
    if (playback.autoplay) {
      void el.play().catch(() => {
        /* controls remain available */
      });
    }
  }, [provider, playback.autoplay, playback.muted]);

  return (
    <MediaLightbox title={title} closeLabel={closeLabel} onClose={onClose}>
      <div className={styles.videoLightboxFigure}>
        {provider === "local" ? (
          <video
            ref={videoRef}
            className={styles.videoLightboxEl}
            src={mediaPath(media.src)}
            poster={mediaPath(media.poster)}
            controls
            playsInline
            muted={playback.muted}
            loop={playback.loop}
            autoPlay={playback.autoplay}
            preload="metadata"
          />
        ) : (
          <iframe
            className={styles.videoLightboxIframe}
            src={
              provider === "youtube"
                ? youtubeEmbedUrl(media.src, playback)
                : vimeoEmbedUrl(media.src, playback)
            }
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>
    </MediaLightbox>
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
  closeLabel,
}: {
  media: Extract<ProjectMedia, { type: "video" }>;
  label: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const start = useCallback(() => setOpen(true), []);

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
      {open ? (
        <VideoLightbox
          media={media}
          title={label}
          closeLabel={closeLabel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SlideshowMedia({
  media,
  openLabel,
  closeLabel,
  prevLabel,
  nextLabel,
}: {
  media: Extract<ProjectMedia, { type: "slideshow" }>;
  openLabel: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const images = media.images;
  const intervalMs = media.interval ?? 4500;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
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

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const isSwipe = images.length >= 2 && Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(dy);

    if (isSwipe) {
      setIndex((current) =>
        dx < 0
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length,
      );
      return;
    }

    setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const activeAlt = images[index]?.alt || media.alt || "Slideshow";

  return (
    <>
      <button
        type="button"
        className={styles.slideshowButton}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        aria-label={openLabel}
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
      </button>
      <span className="visually-hidden" aria-live="polite">
        {activeAlt}
      </span>
      {open ? (
        <SlideshowLightbox
          images={images}
          initialIndex={index}
          title={openLabel}
          closeLabel={closeLabel}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
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
  const prevLabel = locale === "de" ? "Vorheriges Bild" : "Previous image";
  const nextLabel = locale === "de" ? "Nächstes Bild" : "Next image";
  const galleryLabel =
    locale === "de" ? `Galerie öffnen: ${item.title}` : `Open gallery: ${item.title}`;

  const inner =
    media.type === "image" ? (
      <ImageMedia media={media} openLabel={openLabel} closeLabel={closeLabel} />
    ) : media.type === "video" ? (
      <VideoMedia media={media} label={playLabel} closeLabel={closeLabel} />
    ) : (
      <SlideshowMedia
        media={media}
        openLabel={galleryLabel}
        closeLabel={closeLabel}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
      />
    );

  return (
    <article className={styles.card} aria-label={item.title}>
      <div className={styles.mediaFrame}>
        <div className={styles.media}>{inner}</div>
      </div>
      <p className={styles.label}>{item.title}</p>
    </article>
  );
}
