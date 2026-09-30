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
};

/** Match Vimeo background embeds (16:9). Shared by poster + iframe cover frame. */
const VIDEO_ASPECT = 16 / 9;
const VIMEO_ORIGIN = "https://player.vimeo.com";
/** Shared cover overscale — applied to the frame so poster and video stay locked. */
const COVER_SCALE = 1.02;
/** Crossfade only after playback has advanced past this (not metadata / play alone). */
const FIRST_FRAME_SECONDS = 0.04;
/** Settle after first timeupdate so the decoded frame is painted before fade. */
const REVEAL_SETTLE_MS = 90;

type VimeoMessage = {
  event?: string;
  method?: string;
  data?: { seconds?: number; percent?: number };
};

/**
 * Hero Vimeo background loop — poster-first handoff without layout jump.
 *
 * Poster and iframe share one cover-sized 16:9 frame (identical footprint,
 * object-fit: cover, object-position: center). The poster stays fully visible
 * until Vimeo reports a real timeupdate (first displayable frame), then the
 * iframe crossfades in. Never reveals on loadedmetadata / iframe load alone.
 */
export function HeroVimeoLoop({
  videoId,
  title,
  poster,
  mobilePoster,
}: HeroVimeoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const playing = playingVideoId === videoId;
  const [activePoster, setActivePoster] = useState<PosterImage | undefined>(
    poster,
  );

  const firstFrame = getVimeoFirstFramePoster(videoId);
  const handoffPoster: PosterImage | undefined = firstFrame
    ? {
        src: firstFrame.src,
        alt: activePoster?.alt || poster?.alt || title,
        width: firstFrame.width,
        height: firstFrame.height,
      }
    : activePoster;

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
    "&transparent=0" +
    "&api=1";

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

  // Size one shared 16:9 frame with object-fit: cover into the photo slot.
  // Poster and iframe both fill this frame — same crop, position, scale.
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

      if (containerRatio > VIDEO_ASPECT) {
        frameWidth = width;
        frameHeight = width / VIDEO_ASPECT;
      } else {
        frameHeight = height;
        frameWidth = height * VIDEO_ASPECT;
      }

      frame.style.width = `${frameWidth * COVER_SCALE}px`;
      frame.style.height = `${frameHeight * COVER_SCALE}px`;
    };

    fitCover();
    const observer = new ResizeObserver(fitCover);
    observer.observe(root);
    return () => observer.disconnect();
  }, [videoId]);

  // Poster-first: reveal only after a real playback timeupdate (first frame),
  // then wait for paint. Never on loadedmetadata / iframe.onload / play alone.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let revealScheduled = false;

    const clearRevealTimer = () => {
      if (revealTimerRef.current != null) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };

    const post = (payload: Record<string, unknown>) => {
      iframe.contentWindow?.postMessage(JSON.stringify(payload), VIMEO_ORIGIN);
    };

    const scheduleReveal = () => {
      if (cancelled || revealScheduled) return;
      revealScheduled = true;

      // Double rAF: ensure the browser has composited the decoded frame.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          clearRevealTimer();
          revealTimerRef.current = setTimeout(() => {
            if (!cancelled) {
              setPlayingVideoId(videoId);
            }
          }, REVEAL_SETTLE_MS);
        });
      });
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
        post({ method: "addEventListener", value: "timeupdate" });
        post({ method: "addEventListener", value: "bufferend" });
        post({ method: "setVolume", value: 0 });
        // Lock to the true start so motion begins where the still left off.
        post({ method: "setCurrentTime", value: 0 });
        post({ method: "play" });
        return;
      }

      // Ignore play / playing / loaded — those fire before a paintable frame.
      if (
        data.event === "timeupdate" &&
        typeof data.data?.seconds === "number" &&
        data.data.seconds >= FIRST_FRAME_SECONDS
      ) {
        scheduleReveal();
      }
    };

    // New video id → keep poster until this clip paints.
    setPlayingVideoId((current) => (current === videoId ? current : null));

    window.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      clearRevealTimer();
      window.removeEventListener("message", onMessage);
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
        <iframe
          ref={iframeRef}
          className={[styles.iframe, playing ? styles.iframePlaying : ""]
            .filter(Boolean)
            .join(" ")}
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
    </div>
  );
}
