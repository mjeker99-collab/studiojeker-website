import Image from "next/image";
import type { Locale } from "@/types/i18n";
import type { WorkPageContent } from "@/types/work";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { HeroMediaFrame } from "@/components/home/HeroMediaFrame";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProjectMediaCard } from "@/components/work/ProjectMediaCard";
import { WorkAnchorScroll } from "@/components/work/WorkAnchorScroll";
import { mediaPath } from "@/lib/media/paths";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./WorkPage.module.css";

export type { WorkPageContent, WorkCategory, WorkProjectItem } from "@/types/work";

type WorkPageProps = {
  content: WorkPageContent;
  locale: Locale;
};

/**
 * Work overview — split hero (shared HeroMediaFrame) + portfolio grid.
 * Category labels structure projects only (no service navigation).
 * Tiles use ProjectMediaCard (image | video | slideshow) in place.
 * Tile `id` comes from Sanity `itemId` for Service deep links (`/work#…`).
 * Hero image is Sanity-only; without an upload the media column is omitted.
 */
export function WorkPage({ content, locale }: WorkPageProps) {
  const heroMedia = content.hero.media;
  const hasHeroMedia = Boolean(heroMedia?.src);

  return (
    <>
      <WorkAnchorScroll />
      <section
        className={[heroStyles.section, styles.hero].join(" ")}
        data-header-theme="light"
        aria-labelledby="work-hero-title"
      >
        <div
          className={[
            heroStyles.grid,
            styles.heroGrid,
            hasHeroMedia ? "" : styles.heroGridCopyOnly,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Reveal className={[heroStyles.copy, styles.heroCopy].join(" ")}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1
              id="work-hero-title"
              className={[heroStyles.headline, styles.heroHeadline].join(" ")}
            >
              {content.hero.headline}
            </h1>
            <p className={styles.heroText}>{content.hero.text}</p>
          </Reveal>

          {hasHeroMedia && heroMedia ? (
            <Reveal
              className={[heroStyles.mediaWrap, styles.heroMediaWrap].join(" ")}
              immediate
            >
              <HeroMediaFrame>
                <Image
                  key={heroMedia.src}
                  src={mediaPath(heroMedia.src)}
                  alt={heroMedia.alt || content.hero.headline}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 64vw"
                  className={heroStyles.image}
                />
              </HeroMediaFrame>
            </Reveal>
          ) : null}
        </div>
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
                // Index is required: Studio has historically duplicated
                // categoryId values (e.g. two "business" rows), which made
                // React reuse the wrong category subtree after live refresh.
                key={`${category.id}-${categoryIndex}`}
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
                    <li
                      key={item.id}
                      id={item.id}
                      className={styles.tileItem}
                    >
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
