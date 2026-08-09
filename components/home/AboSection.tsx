import Image from "next/image";
import type { ReactNode } from "react";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./AboSection.module.css";

type AboSectionProps = {
  content: HomepageContent["abo"];
};

const benefitIcons: Record<string, ReactNode> = {
  continuous: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <rect x="12" y="10" width="24" height="28" stroke="currentColor" strokeWidth="1.75" />
      <path d="M18 8v4M30 8v4M16 20h16M16 26h10" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <path d="M12 30l12-6 12 6-12 6-12-6Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 22l12-6 12 6" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 16l12-6 12 6" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  visibility: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <path d="M12 30l7-9 6 5 6-10 5 6" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 12h28v24H10V12Z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  planning: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <rect x="10" y="16" width="28" height="18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 22h28M16 28h8" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
};

export function AboSection({ content }: AboSectionProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="home-abo-title"
    >
      <Reveal>
        <div className={styles.grid}>
          <div className={styles.intro}>
            <p className={styles.label}>
              <CyanBar orientation="horizontal" animated={false} className={styles.labelBar} />
              <span>{content.headline}</span>
            </p>
            <h2 id="home-abo-title" className={styles.headline}>
              {content.headline}
              <span className={styles.accent}>.</span>
            </h2>
            <p className={styles.introduction}>{content.introduction}</p>
            <div>
              <Button href={content.cta.href} variant="secondary" className={styles.cta}>
                {content.cta.label}
              </Button>
            </div>
          </div>

          <div className={styles.benefits} role="list">
            {content.benefits.map((benefit) => (
              <article key={benefit.id} className={styles.benefit} role="listitem">
                <span className={styles.icon}>{benefitIcons[benefit.id]}</span>
                <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                <p className={styles.benefitText}>{benefit.description}</p>
              </article>
            ))}
          </div>

          <div className={styles.media}>
            <Image
              src={mediaPath(content.media.src)}
              alt={content.media.alt}
              fill
              sizes="(max-width: 1280px) 100vw, 30vw"
              className={styles.image}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
