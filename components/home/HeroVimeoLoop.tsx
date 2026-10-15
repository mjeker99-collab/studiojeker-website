"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getVimeoFirstFramePoster } from "@/lib/media/vimeo-first-frames";
import styles from "./HeroVimeoLoop.module.css";

type PosterImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type HeroVimeoLoopProps = {
  videoId: string;
  title: string;
  poster?: PosterImage;
  /** Optional Sanity mobilePoster — falls back to poster when omitted. */
  mobilePoster?: PosterImage;
  /**
   * Intrinsic width/height of the Vimeo clip (not the photo slot).
   * object-fit cannot crop iframe internals — the shared frame must match
   * this ratio so square clips do not pillarbox inside a 16:9 player.
   * Defaults to 16:9 for landscape service / teaser loops.
   */
  videoAspect?: number;
};

/** Default landscape hero / teaser loops. Square clips pass videoAspect={1}. */
const DEFAULT_VIDEO_ASPECT = 16 / 9;
const VIMEO_ORIGIN = "https://player.vimeo.com";
/**
 * Cover overscale for the shared iframe/poster frame.
 * object-fit cannot crop Vimeo player internals — a small overscale clips
 * embed letterboxing / player chrome while keeping the motif centered.
 * Kept modest so square 1:1 heroes are not heavily cropped.
 */
const COVER_SCALE = 1.06;
/** Prefer reveal after playback has advanced past this (not metadata alone). */
const FIRST_FRAME_SECONDS = 0.02;
/** Settle after first paintable signal so the decoded frame is on screen. */
const REVEAL_SETTLE_MS = 80;
/**
 * If Vimeo reports play/playing but never sends a usable timeupdate (some
 * background embeds), still reveal after this settle — never leave a stuck poster.
 */
const PLAY_FALLBACK_MS = 420;

type VimeoMessage = {
  event?: string;
  method?: string;
  data?: { seconds?: number; percent?: number };
};

function buildEmbedUrl(videoId: string): string {
  return (
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
    "&transparent=0" +
    "&api=1"
  );
}

/**
 * Hero Vimeo background loop — poster-first handoff without layout jump.
 *
 * Poster and iframe share one cover-sized frame matched to the clip’s
 * intrinsic aspect (identical footprint, object-fit: cover on the poster).
 * The poster stays fully visible until a displayable first frame is confirmed
 * (timeupdate, with play-armed fallback) — never on loadedmetadata / iframe
 * load alone.
 */
export function HeroVimeoLoop({
  videoId,
  title,
  poster,
  mobilePoster,
  videoAspect = DEFAULT_VIDEO_ASPECT,
}: HeroVimeoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const playing = playingVideoId === videoId;
  const [activePoster, setActivePoster] = useState<PosterImage | undefined>(
    poster,
  );
  // Attach message listeners before loading the iframe so `ready` is never missed.
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const resolvedAspect =
    Number.isFinite(videoAspect) && videoAspect > 0
      ? videoAspect
      : DEFAULT_VIDEO_ASPECT;

  const firstFrame = getVimeoFirstFramePoster(videoId);
  const handoffPoster: PosterImage | undefined = firstFrame
    ? {
        src: firstFrame.src,
        alt: activePoster?.alt || poster?.alt || title,
        width: firstFrame.width,
        height: firstFrame.height,
      }
    : activePoster;

  // Pick mobile vs desktop CMS poster without layout shift.
  // Known first-frame stills (above) still win for the handoff plane.
  useEffect(() => {
    const pick = () => {
      const preferMobile =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 63.9375rem)").matches;
      setActivePoster(
        preferMobile && mobilePoster?.src ? mobilePoster : poster,
      );
    };
    pick();
    const media = window.matchMedia("(max-width: 63.9375rem)");
    media.addEventListener("change", pick);
    return () => media.removeEventListener("change", pick);
  }, [poster, mobilePoster]);

  // Size one shared frame to the clip aspect, then cover the photo slot.
  // Always overscale slightly so Vimeo embed letterboxing is clipped by
  // overflow:hidden. Position with top/left only — transform centering
  // offsets iframe paint in WebKit (iPad), which reads as a black gap +
  // right-shifted motif.
  useEffect(() => {
    const root = rootRef.current;
    const frame = frameRef.current;
    if (!root || !frame) return;

    const fitCover = () => {
      const { width, height } = root.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      const containerRatio = width / height;

      let frameWidth: number;
      let frameHeight: number;

      if (containerRatio > resolvedAspect) {
        frameWidth = width;
        frameHeight = width / resolvedAspect;
      } else {
        frameHeight = height;
        frameWidth = height * resolvedAspect;
      }

      const scaledWidth = frameWidth * COVER_SCALE;
      const scaledHeight = frameHeight * COVER_SCALE;
      frame.style.width = `${scaledWidth}px`;
      frame.style.height = `${scaledHeight}px`;
      frame.style.left = `${(width - scaledWidth) / 2}px`;
      frame.style.top = `${(height - scaledHeight) / 2}px`;
      frame.style.transform = "none";
    };

    fitCover();
    const observer = new ResizeObserver(fitCover);
    observer.observe(root);
    return () => observer.disconnect();
  }, [videoId, resolvedAspect]);

  // Poster-first reveal: arm on play/playing, confirm with timeupdate (first
  // frame). Never reveal on loadedmetadata / iframe.onload alone.
  useEffect(() => {
    let cancelled = false;
    let revealScheduled = false;
    let playbackArmed = false;

    const clearTimers = () => {
      if (revealTimerRef.current != null) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (playFallbackRef.current != null) {
        clearTimeout(playFallbackRef.current);
        playFallbackRef.current = null;
      }
    };

    const post = (payload: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify(payload),
        VIMEO_ORIGIN,
      );
    };

    const scheduleReveal = () => {
      if (cancelled || revealScheduled) return;
      revealScheduled = true;
      if (playFallbackRef.current != null) {
        clearTimeout(playFallbackRef.current);
        playFallbackRef.current = null;
      }

      // Double rAF: ensure the browser has composited the decoded frame.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          if (revealTimerRef.current != null) {
            clearTimeout(revealTimerRef.current);
          }
          revealTimerRef.current = setTimeout(() => {
            if (!cancelled) {
              setPlayingVideoId(videoId);
            }
          }, REVEAL_SETTLE_MS);
        });
      });
    };

    const armPlayback = () => {
      if (cancelled || playbackArmed) return;
      playbackArmed = true;
      // Fallback if timeupdate never arrives on certain background embeds.
      playFallbackRef.current = setTimeout(() => {
        scheduleReveal();
      }, PLAY_FALLBACK_MS);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;

      let data: VimeoMessage | null = null;
      if (typeof event.data === "string") {
        try {
          data = JSON.parse(event.data) as VimeoMessage;
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === "object") {
        data = event.data as VimeoMessage;
      }
      if (!data) return;

      if (data.event === "ready") {
        post({ method: "addEventListener", value: "play" });
        post({ method: "addEventListener", value: "playing" });
        post({ method: "addEventListener", value: "timeupdate" });
        post({ method: "addEventListener", value: "bufferend" });
        post({ method: "setVolume", value: 0 });
        post({ method: "play" });
        return;
      }

      if (data.event === "play" || data.event === "playing") {
        armPlayback();
        return;
      }

      // First displayable frame: playback clock has advanced.
      if (
        data.event === "timeupdate" &&
        typeof data.data?.seconds === "number" &&
        data.data.seconds >= FIRST_FRAME_SECONDS
      ) {
        armPlayback();
        scheduleReveal();
      }
    };

    // Load iframe only after the listener is attached (avoids missing `ready`).
    window.addEventListener("message", onMessage);
    const loadTimer = window.setTimeout(() => {
      if (!cancelled) setIframeSrc(buildEmbedUrl(videoId));
    }, 0);

    return () => {
      cancelled = true;
      clearTimers();
      window.clearTimeout(loadTimer);
      window.removeEventListener("message", onMessage);
      // Drop src on teardown so the next videoId remounts cleanly.
      setIframeSrc(null);
    };
  }, [videoId]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-playing={playing ? "true" : "false"}
    >
      <div ref={frameRef} className={styles.frame}>
        {handoffPoster?.src ? (
          <Image
            key={handoffPoster.src}
            src={handoffPoster.src}
            alt={handoffPoster.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 64vw"
            className={[styles.poster, playing ? styles.posterFaded : ""]
              .filter(Boolean)
              .join(" ")}
          />
        ) : null}
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            className={[styles.iframe, playing ? styles.iframePlaying : ""]
              .filter(Boolean)
              .join(" ")}
            src={iframeSrc}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen={false}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            tabIndex={-1}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
