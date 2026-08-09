import Image from "next/image";
import Link from "next/link";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./ProjectsSection.module.css";

type ProjectsSectionProps = {
  content: HomepageContent["projects"];
};

export function ProjectsSection({ content }: ProjectsSectionProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="home-projects-title"
    >
      <Container>
        <Reveal className={styles.header}>
          <div>
            <SectionLabel flush>{content.label}</SectionLabel>
            <h2 id="home-projects-title" className="visually-hidden">
              {content.headline}
            </h2>
          </div>
          <Link href={content.viewAll.href} className={styles.viewAll}>
            {content.viewAll.label}
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>

        <div className={styles.grid}>
          {content.items.map((item, index) => {
            const displayTitle = item.isPlaceholder ? item.category : item.title;

            return (
              <Reveal key={item.id} delayMs={index * 60}>
                <Link
                  href={item.href}
                  className={styles.card}
                  aria-label={displayTitle}
                >
                  <div className={styles.media}>
                    <Image
                      src={mediaPath(item.image.src)}
                      alt={item.image.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className={styles.image}
                    />
                  </div>
                  <div className={styles.meta}>
                    <div>
                      <h3
                        className={
                          item.isPlaceholder ? styles.categoryAsTitle : styles.title
                        }
                      >
                        {displayTitle}
                      </h3>
                      {!item.isPlaceholder ? (
                        <p className={styles.category}>{item.category}</p>
                      ) : null}
                    </div>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
