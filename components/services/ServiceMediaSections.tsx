import type { Locale } from "@/types/i18n";
import type { ServiceMediaSection } from "@/types/service-page";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProjectMediaCard } from "@/components/work/ProjectMediaCard";
import { visibleMediaSections } from "@/lib/content/services/media-sections";
import workStyles from "@/components/work/WorkPage.module.css";
import styles from "./ServiceMediaSections.module.css";

type ServiceMediaSectionsProps = {
  label: string;
  headline: string;
  sections: ServiceMediaSection[];
  locale: Locale;
  titleId: string;
};

/**
 * Service landing media galleries — Work portfolio grid + ProjectMediaCard.
 * Empty sections are omitted (no empty rasters or placeholders).
 */
export function ServiceMediaSections({
  label,
  headline,
  sections,
  locale,
  titleId,
}: ServiceMediaSectionsProps) {
  const visible = visibleMediaSections(sections);
  if (visible.length === 0) {
    return null;
  }

  return (
    <section
      className={[workStyles.projects, styles.section].join(" ")}
      data-header-theme="light"
      aria-labelledby={titleId}
    >
      <Container>
        <Reveal className={styles.header}>
          <SectionLabel flush>{label}</SectionLabel>
          <h2 id={titleId} className="visually-hidden">
            {headline}
          </h2>
        </Reveal>

        <div className={workStyles.categoryStack}>
          {visible.map((section, sectionIndex) => (
            <Reveal
              key={`${section.id}-${sectionIndex}`}
              as="article"
              className={workStyles.category}
              delayMs={sectionIndex * 40}
            >
              <div className={workStyles.categoryHeader}>
                <h3 className={workStyles.categoryTitle}>{section.title}</h3>
                <span className={workStyles.categoryAccent} aria-hidden="true">
                  <Arrow className={workStyles.categoryArrow} />
                </span>
              </div>

              {section.description ? (
                <p className={styles.description}>{section.description}</p>
              ) : null}

              <ul className={workStyles.categoryGrid}>
                {section.items.map((item) => (
                  <li key={item.id} id={item.id} className={workStyles.tileItem}>
                    <ProjectMediaCard item={item} locale={locale} />
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
