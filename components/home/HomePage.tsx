import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { AboutSection } from "@/components/home/AboutSection";
import { AboSection } from "@/components/home/AboSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { ShowreelSection } from "@/components/home/ShowreelSection";

type HomePageProps = {
  locale: Locale;
  /**
   * Pre-resolved content (e.g. from Sanity at build time). Falls back to the
   * local content source when omitted, so locales not yet wired to the CMS
   * render exactly as before.
   */
  content?: HomepageContent;
};

export function HomePage({ locale, content }: HomePageProps) {
  const resolvedContent = content ?? getHomepageContent(locale);

  return (
    <>
      <HeroSection content={resolvedContent.hero} />
      <ServicesSection content={resolvedContent.services} />
      <ShowreelSection content={resolvedContent.showreel} />
      <ProjectsSection content={resolvedContent.projects} />
      <AboSection content={resolvedContent.abo} />
      <AboutSection content={resolvedContent.about} />
      <ClientsSection content={resolvedContent.clients} />
      <FinalCtaSection content={resolvedContent.finalCta} />
    </>
  );
}
