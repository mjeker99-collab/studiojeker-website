import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroSection.module.css";

type HeroMediaFrameProps = {
  children: ReactNode;
  /** Optional extra class on the cyan+photo grid (rarely needed). */
  className?: string;
  /**
   * Cover crop position for images / posters inside this frame.
   * Example: "center top" or "40% 30%". Defaults to the shared token.
   */
  objectPosition?: string;
};

/**
 * Shared hero media chrome: cyan signature bar + cover-filled photo slot.
 *
 * Aspect ratio comes from `--hero-media-aspect` (KI template). Images,
 * posters and Vimeo iframes must fill `.photo` with object-fit: cover —
 * never stretch the frame.
 */
export function HeroMediaFrame({
  children,
  className,
  objectPosition,
}: HeroMediaFrameProps) {
  const photoStyle = objectPosition
    ? ({
        ["--hero-media-object-position" as string]: objectPosition,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={[styles.media, className].filter(Boolean).join(" ")}
      data-hero-media="frame"
    >
      <div className={styles.cyanBar} aria-hidden="true" />
      <div className={styles.photo} style={photoStyle} data-hero-media="photo">
        {children}
      </div>
    </div>
  );
}
