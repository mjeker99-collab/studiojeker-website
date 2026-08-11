import type { ServicePageContent } from "@/types/service-page";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceOverview } from "@/components/services/ServiceOverview";

type ServicePageProps = {
  content: ServicePageContent;
};

/**
 * Shared service-page composer.
 * Visual language matches the approved homepage; structure follows the
 * Business Communication service template.
 */
export function ServicePage({ content }: ServicePageProps) {
  const titleBase = `service-${content.slug}`;

  return (
    <>
      <ServiceHero content={content.hero} titleId={`${titleBase}-hero`} />
      <ServiceOverview
        content={content.solutions}
        titleId={`${titleBase}-solutions`}
      />
      <ShowreelSection content={content.showreel} />
      <ProjectsSection content={content.projects} />
      <AboutSection content={content.about} />
      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
