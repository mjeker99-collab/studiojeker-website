import type { HomepageContent } from "@/types/homepage";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./WorkPage.module.css";

export type WorkPageContent = {
  seo: { title: string; description: string };
  hero: {
    label: string;
    headline: string;
    text: string;
  };
  projects: HomepageContent["projects"];
  finalCta: HomepageContent["finalCta"];
};

type WorkPageProps = {
  content: WorkPageContent;
};

export function WorkPage({ content }: WorkPageProps) {
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
      <ProjectsSection content={content.projects} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
