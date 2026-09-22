import Image from "next/image";
import Link from "next/link";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HeroVimeoLoop } from "@/components/home/HeroVimeoLoop";
import styles from "./AiTeaserSection.module.css";

type AiTeaserSectionProps = {
  content: HomepageContent["aiTeaser"];
};

/**
 * Homepage KI / AI teaser — Showreel pattern, media left / copy right on desktop.
 * Video (muted autoplay loop) wins over image; no media → copy only, no empty frame.
 * Mobile keeps copy → media stacking.
 */
export function AiTeaserSection({ content }: AiTeaserSectionProps) {
  if (!content.enabled) {
    return null;
  }

  const hasVideo = Boolean(content.videoId);
  const hasImage = Boolean(content.media?.src);
  const hasMedia = hasVideo || hasImage;
  const mediaAlt = content.media?.alt || content.headline;

  return (
    <section
      className={styles.section}
      data-header-theme="dark"
      aria-labelledby="home-ai-teaser-title"
    >
      <div
        className={[styles.grid, hasMedia ? styles.gridWithMedia : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <Reveal className={styles.copy}>
          <SectionLabel inverse>{content.label}</SectionLabel>
          <h2 id="home-ai-teaser-title" className={styles.headline}>
            {content.headline}
          </h2>
          <p className={styles.body}>{content.body}</p>
          <div>
            <Button href={content.cta.href} variant="cyan">
              {content.cta.label}
            </Button>
          </div>
        </Reveal>

        {hasMedia ? (
          <Reveal className={styles.mediaWrap} delayMs={100}>
            <CyanBar />
            {hasVideo && content.videoId ? (
              <div className={styles.mediaFrame}>
                <HeroVimeoLoop
                  videoId={content.videoId}
                  title={mediaAlt}
                  poster={
                    content.media?.src
                      ? {
                          src: mediaPath(content.media.src),
                          alt: mediaAlt,
                          width: content.media.width,
                          height: content.media.height,
                        }
                      : undefined
                  }
                />
              </div>
            ) : content.media?.src ? (
              <Link
                href={content.cta.href}
                className={styles.mediaLink}
                aria-label={content.cta.label}
              >
                <Image
                  key={content.media.src}
                  src={mediaPath(content.media.src)}
                  alt={mediaAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className={styles.image}
                />
              </Link>
            ) : null}
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
