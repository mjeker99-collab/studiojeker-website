import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { VimeoShowreel } from "@/components/media/VimeoShowreel";
import styles from "./HeroSection.module.css";

type HeroSectionProps = {
  content: HomepageContent["hero"];
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className={styles.section} data-header-theme="light" aria-labelledby="home-hero-title">
      <div className={styles.grid}>
        <Reveal className={styles.copy}>
          <h1 id="home-hero-title" className={styles.headline}>
            {content.headline}
            {content.headlineAccent ? (
              <span className={styles.accent}>{content.headlineAccent}</span>
            ) : null}
          </h1>
          <p className={styles.subheadline}>{content.subheadline}</p>
          <div className={styles.body}>
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className={styles.actions}>
            <Button href={content.primaryCta.href} variant="outline" fullWidthMobile>
              {content.primaryCta.label}
            </Button>
          </div>
        </Reveal>

        <Reveal className={styles.mediaWrap} delayMs={120}>
          {/*
            Cyan + photo are GRID SIBLINGS of the same media wrapper.
            No absolute top/bottom — height comes only from this grid.
          */}
          <div className={styles.media}>
            <div className={styles.cyanBar} aria-hidden="true" />
            <div className={styles.photo}>
              {content.videoId ? (
                <VimeoShowreel
                  fill
                  className={styles.image}
                  videoId={content.videoId}
                  title={content.media.alt}
                  poster={{
                    src: mediaPath(content.media.src),
                    alt: content.media.alt,
                    width: content.media.width,
                    height: content.media.height,
                  }}
                />
              ) : (
                <Image
                  src={mediaPath(content.media.src)}
                  alt={content.media.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 64vw"
                  className={styles.image}
                />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
