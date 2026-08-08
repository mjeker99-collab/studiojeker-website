import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./ShowreelSection.module.css";

type ShowreelSectionProps = {
  content: HomepageContent["showreel"];
};

export function ShowreelSection({ content }: ShowreelSectionProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="dark"
      aria-labelledby="home-showreel-title"
    >
      <Container>
        <div className={styles.grid}>
          <Reveal className={styles.copy}>
            <SectionLabel inverse>{content.label}</SectionLabel>
            <h2 id="home-showreel-title" className={styles.headline}>
              {content.headline}
              <span className={styles.accent}>.</span>
            </h2>
            <p className={styles.body}>{content.body}</p>
            <div>
              <Button href={content.cta.href} variant="cyan">
                {content.cta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal className={styles.mediaWrap} delayMs={100}>
            <CyanBar />
            <a
              className={styles.mediaButton}
              href={content.cta.href}
              aria-label={content.cta.label}
            >
              <Image
                src={mediaPath(content.media.src)}
                alt={content.media.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className={styles.image}
              />
              <span className={styles.play} aria-hidden="true">
                ▶
              </span>
            </a>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
