import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { VimeoShowreel } from "@/components/media/VimeoShowreel";
import { aboBenefitIcons } from "@/components/home/aboBenefitIcons";
import styles from "./AboSection.module.css";

type AboSectionProps = {
  content: HomepageContent["abo"];
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
            <div className={styles.label}>
              <CyanBar orientation="horizontal" animated={false} className={styles.labelBar} />
              <span>{content.headline}</span>
            </div>
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
                <span className={styles.icon}>{aboBenefitIcons[benefit.id]}</span>
                <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                <p className={styles.benefitText}>{benefit.description}</p>
              </article>
            ))}
          </div>

          <div className={styles.media}>
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
                sizes="(max-width: 1280px) 100vw, 30vw"
                className={styles.image}
              />
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
