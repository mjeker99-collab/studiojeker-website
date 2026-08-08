import type { Locale } from "@/types/i18n";
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
};

export function HomePage({ locale }: HomePageProps) {
  const content = getHomepageContent(locale);

  return (
    <>
      <HeroSection content={content.hero} />
      <ServicesSection content={content.services} />
      <ShowreelSection content={content.showreel} />
      <ProjectsSection content={content.projects} locale={locale} />
      <AboSection content={content.abo} />
      <AboutSection content={content.about} />
      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
