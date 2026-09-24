"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

const VIDEO_ASPECT = 16 / 9;
const VIMEO_ORIGIN = "https://player.vimeo.com";

type VimeoMessage = {
  event?: string;
  method?: string;
  data?: { seconds?: number };
};

/**
 * Hero Vimeo background loop — poster-first handoff.
 * Poster stays visible until Vimeo reports play/playing (not merely iframe load).
 * Muted autoplay, no chrome, object-fit: cover inside the existing photo slot.
 */
export function HeroVimeoLoop({
  videoId,
  title,
  poster,
  mobilePoster,
}: HeroVimeoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const playing = playingVideoId === videoId;
  const [activePoster, setActivePoster] = useState<PosterImage | undefined>(
    poster,
  );

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

  // Pick mobile vs desktop poster without layout shift.
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

  // Cover-fit iframe inside the photo slot.
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
        frameWidth = width;
        frameHeight = width / VIDEO_ASPECT;
      } else {
        frameHeight = height;
        frameWidth = height * VIDEO_ASPECT;
      }

      const scale = 1.02;
      iframe.style.width = `${frameWidth * scale}px`;
      iframe.style.height = `${frameHeight * scale}px`;
    };

    fitCover();
    const observer = new ResizeObserver(fitCover);
    observer.observe(root);
    return () => observer.disconnect();
  }, [videoId]);

  // Poster-first: reveal iframe only after real playback, not iframe.onload.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const post = (payload: Record<string, unknown>) => {
      iframe.contentWindow?.postMessage(JSON.stringify(payload), VIMEO_ORIGIN);
    };

    const markPlaying = () => {
      setPlayingVideoId(videoId);
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
        post({ method: "setVolume", value: 0 });
        post({ method: "play" });
        return;
      }

      if (data.event === "play" || data.event === "playing") {
        markPlaying();
        return;
      }

      if (
        data.event === "timeupdate" &&
        typeof data.data?.seconds === "number" &&
        data.data.seconds > 0.05
      ) {
        markPlaying();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [videoId]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-playing={playing ? "true" : "false"}
    >
      {activePoster?.src ? (
        <Image
          key={activePoster.src}
          src={activePoster.src}
          alt={activePoster.alt}
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
  );
}
