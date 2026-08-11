import Link from "next/link";
import type { ServicePageContent } from "@/types/service-page";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SolutionIcon } from "@/components/services/SolutionIcon";
import styles from "@/components/home/ServicesSection.module.css";

type ServiceOverviewProps = {
  content: ServicePageContent["solutions"];
  titleId: string;
};

/** Same visual system as homepage services grid — content-driven solutions. */
export function ServiceOverview({ content, titleId }: ServiceOverviewProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby={titleId}
    >
      <Container>
        <Reveal className={styles.header}>
          <SectionLabel>{content.label}</SectionLabel>
          <h2 id={titleId} className="visually-hidden">
            {content.headline}
          </h2>
        </Reveal>

        <div className={styles.grid}>
          {content.items.map((item, index) => (
            <Reveal key={item.id} as="article" className={styles.card} delayMs={index * 70}>
              <SolutionIcon id={item.icon} />
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.description}>{item.description}</p>
              <Link href={item.href} className={styles.link} aria-label={item.title}>
                <Arrow className={styles.arrow} />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
