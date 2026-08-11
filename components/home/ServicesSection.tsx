import Link from "next/link";
import type { HomepageContent } from "@/types/homepage";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import styles from "./ServicesSection.module.css";

type ServicesSectionProps = {
  content: HomepageContent["services"];
};

export function ServicesSection({ content }: ServicesSectionProps) {
  return (
    <section
      id="services"
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="home-services-title"
    >
      <Container>
        <Reveal className={styles.header}>
          <SectionLabel>{content.label}</SectionLabel>
          <h2 id="home-services-title" className="visually-hidden">
            {content.headline}
          </h2>
        </Reveal>

        <div className={styles.grid}>
          {content.items.map((item, index) => (
            <Reveal key={item.id} as="article" className={styles.card} delayMs={index * 70}>
              <Link href={item.href} className={styles.cardLink} aria-label={item.title}>
                <ServiceIcon id={item.id} />
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.description}>{item.description}</p>
                <span className={styles.link} aria-hidden="true">
                  <Arrow className={styles.arrow} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
