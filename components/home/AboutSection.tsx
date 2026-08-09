import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./AboutSection.module.css";

type AboutSectionProps = {
  content: HomepageContent["about"];
  /** Tighter vertical rhythm for pages that reuse this block (e.g. About). */
  compact?: boolean;
};

export function AboutSection({ content, compact = false }: AboutSectionProps) {
  return (
    <section
      className={[styles.section, compact ? styles.compact : ""]
        .filter(Boolean)
        .join(" ")}
      data-header-theme="light"
      aria-labelledby="home-about-title"
    >
      <div className={styles.grid}>
        <Reveal className={styles.copy}>
          <SectionLabel>{content.label}</SectionLabel>
          <h2 id="home-about-title" className={styles.headline}>
            {content.headline
              .split(/(?<=\.)\s+/)
              .filter(Boolean)
              .map((line, index, lines) => {
                const isLast = index === lines.length - 1;
                return (
                  <span key={line} className={styles.headlineLine}>
                    {line}
                    {isLast && content.headlineAccent ? (
                      <span className={styles.accent}>{content.headlineAccent}</span>
                    ) : null}
                    {!isLast ? <br /> : null}
                  </span>
                );
              })}
          </h2>
          {content.subheadline ? (
            <p className={styles.subheadline}>{content.subheadline}</p>
          ) : null}
          <div className={styles.body}>
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div>
            <Button href={content.cta.href} variant="outline">
              {content.cta.label}
            </Button>
          </div>
        </Reveal>

        <Reveal className={styles.mediaWrap} delayMs={100}>
          <CyanBar boundToMedia />
          <div className={styles.media}>
            <Image
              src={mediaPath(content.media.src)}
              alt={content.media.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 64vw"
              className={styles.image}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
