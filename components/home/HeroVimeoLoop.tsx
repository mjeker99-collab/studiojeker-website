import Image from "next/image";
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

/**
 * Homepage-hero-only Vimeo background loop.
 * Fills the existing hero photo slot with object-fit: cover behavior.
 * Still-image fallback stays in HeroSection when no videoId is set.
 */
export function HeroVimeoLoop({ videoId, title, poster }: HeroVimeoLoopProps) {
  const embedUrl =
    `https://player.vimeo.com/video/${videoId}` +
    "?background=1" +
    "&autoplay=1" +
    "&muted=1" +
    "&loop=1" +
    "&autopause=0" +
    "&controls=0" +
    "&title=0" +
    "&byline=0" +
    "&portrait=0" +
    "&badge=0" +
    "&dnt=1" +
    "&playsinline=1";

  return (
    <div className={styles.root}>
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
        className={styles.iframe}
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
