import type { Locale } from "@/types/i18n";
import type { WorkPageContent } from "@/types/work";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProjectMediaCard } from "@/components/work/ProjectMediaCard";
import styles from "./WorkPage.module.css";

export type { WorkPageContent, WorkCategory, WorkProjectItem } from "@/types/work";

type WorkPageProps = {
  content: WorkPageContent;
  locale: Locale;
};

/**
 * Work overview — standalone portfolio grid.
 * Category labels structure projects only (no service navigation).
 * Tiles use ProjectMediaCard (image | video | slideshow) in place.
 */
export function WorkPage({ content, locale }: WorkPageProps) {
  return (
    <>
      <section
        className={styles.hero}
        data-header-theme="light"
        aria-labelledby="work-hero-title"
      >
        <Container>
          <Reveal className={styles.copy}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="work-hero-title" className={styles.headline}>
              {content.hero.headline}
            </h1>
            <p className={styles.text}>{content.hero.text}</p>
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.projects}
        data-header-theme="light"
        aria-labelledby="work-projects-title"
      >
        <Container>
          <h2 id="work-projects-title" className="visually-hidden">
            {content.hero.headline}
          </h2>

          <div className={styles.categoryStack}>
            {content.categories.map((category, categoryIndex) => (
              <Reveal
                key={category.id}
                as="article"
                className={styles.category}
                delayMs={categoryIndex * 40}
              >
                <div className={styles.categoryHeader}>
                  <h3 className={styles.categoryTitle}>{category.title}</h3>
                  {/* Decorative only — Work is a portfolio, not service IA. */}
                  <span className={styles.categoryAccent} aria-hidden="true">
                    <Arrow className={styles.categoryArrow} />
                  </span>
                </div>

                <ul className={styles.categoryGrid}>
                  {category.items.map((item) => (
                    <li key={item.id} className={styles.tileItem}>
                      <ProjectMediaCard item={item} locale={locale} />
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
