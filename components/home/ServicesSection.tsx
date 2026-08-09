import Link from "next/link";
import type { HomepageContent } from "@/types/homepage";
import { Container } from "@/components/layout/Container";
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
              <ServiceIcon id={item.id} />
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.description}>{item.description}</p>
              <Link href={item.href} className={styles.link} aria-label={item.title}>
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
