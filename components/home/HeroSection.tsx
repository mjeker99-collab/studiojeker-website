import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./HeroSection.module.css";

type HeroSectionProps = {
  content: HomepageContent["hero"];
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className={styles.section} data-header-theme="light" aria-labelledby="home-hero-title">
      <Container>
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
              <Button href={content.primaryCta.href} variant="primary">
                {content.primaryCta.label}
              </Button>
              <Button href={content.secondaryCta.href} variant="outline">
                {content.secondaryCta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal className={styles.mediaWrap} delayMs={120}>
            <CyanBar />
            <div className={styles.media}>
              <Image
                src={mediaPath(content.media.src)}
                alt={content.media.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className={styles.image}
              />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
