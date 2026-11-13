import type { Locale } from "@/types/i18n";
import type { ServicePageContent } from "@/types/service-page";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceMediaSections } from "@/components/services/ServiceMediaSections";
import { ServiceMissingContent } from "@/components/services/ServiceMissingContent";
import { ServiceOverview } from "@/components/services/ServiceOverview";
import { visibleMediaSections } from "@/lib/content/services/media-sections";
import styles from "./ServicePage.module.css";

type ServicePageProps = {
  content: ServicePageContent;
  locale: Locale;
};

/**
 * Shared service-page composer.
 * Visual language matches the approved homepage; structure follows the
 * Business Communication service template.
 *
 * Landing order for the three area pages:
 * Hero → solutions → showreel → media galleries → about → clients → CTA.
 * Legacy project teasers remain only when no media gallery items exist
 * (e.g. Digital Marketing until galleries are filled).
 */
export function ServicePage({ content, locale }: ServicePageProps) {
  const titleBase = `service-${content.slug}`;
  const mediaSections = visibleMediaSections(content.media.sections);
  const showLegacyProjects =
    mediaSections.length === 0 && content.projects.items.length > 0;

  return (
    <>
      <ServiceHero content={content.hero} titleId={`${titleBase}-hero`} />
      <ServiceOverview
        content={content.solutions}
        titleId={`${titleBase}-solutions`}
      />
      <ShowreelSection content={content.showreel} />
      <ServiceMediaSections
        label={content.media.label}
        headline={content.media.headline}
        sections={content.media.sections}
        locale={locale}
        titleId={`${titleBase}-media`}
      />
      {showLegacyProjects ? (
        <div className={styles.projectsScope}>
          <ProjectsSection content={content.projects} />
        </div>
      ) : null}
      <ServiceMissingContent
        items={content.missingContent ?? []}
        locale={locale}
      />
      <AboutSection content={content.about} />
      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
