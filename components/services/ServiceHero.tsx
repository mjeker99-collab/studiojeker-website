import Image from "next/image";
import type { ServicePageContent } from "@/types/service-page";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./ServiceHero.module.css";

type ServiceHeroProps = {
  content: ServicePageContent["hero"];
  titleId: string;
};

/**
 * Service hero — same cyan+photo grid coupling as the homepage HeroSection
 * (approved media chrome). Typography/copy structure stays service-specific.
 */
export function ServiceHero({ content, titleId }: ServiceHeroProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby={titleId}
    >
      <div className={styles.grid}>
        <Reveal className={styles.copy}>
          <SectionLabel>{content.label}</SectionLabel>
          <h1 id={titleId} className={styles.headline}>
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
            Matches homepage HeroSection — bar height equals image height.
          */}
          <div className={styles.media}>
            <div className={styles.cyanBar} aria-hidden="true" />
            <div className={styles.photo}>
              <Image
                src={mediaPath(content.media.src)}
                alt={content.media.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 64vw"
                className={styles.image}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
