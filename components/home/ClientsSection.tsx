import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./ClientsSection.module.css";

type ClientsSectionProps = {
  content: HomepageContent["clients"];
};

export function ClientsSection({ content }: ClientsSectionProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="home-clients-title"
    >
      <Container>
        <Reveal className={styles.header}>
          <SectionLabel>{content.label}</SectionLabel>
          <h2 id="home-clients-title" className="visually-hidden">
            {content.label}
          </h2>
        </Reveal>

        <Reveal>
          <ul className={styles.list}>
            {content.logos.map((logo) => (
              <li key={logo.id} className={styles.item}>
                <Image
                  src={mediaPath(logo.src)}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  className={styles.logo}
                />
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
