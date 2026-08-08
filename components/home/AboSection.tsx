import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
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
      <Container>
        <Reveal>
          <div className={styles.grid}>
            <div className={styles.intro}>
              <h2 id="home-abo-title" className={styles.headline}>
                {content.headline}
              </h2>
              <p className={styles.introduction}>{content.introduction}</p>
              <div>
                <Button href={content.cta.href} variant="primary">
                  {content.cta.label}
                </Button>
              </div>
            </div>

            <div className={styles.benefits}>
              {content.benefits.map((benefit) => (
                <article key={benefit.id} className={styles.benefit}>
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
      </Container>
    </section>
  );
}
