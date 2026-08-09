import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./ClientsSection.module.css";

type ClientsSectionProps = {
  content: HomepageContent["clients"];
};

/** Visual-weight classes: light wordmarks need more scale than dense marks. */
const logoWeightClass: Record<string, string> = {
  hirslanden: styles.weightLight,
  certina: styles.weightLight,
  bossard: styles.weightLight,
  endress: styles.weightLight,
  ubs: styles.weightStrong,
  raiffeisen: styles.weightStrong,
};

export function ClientsSection({ content }: ClientsSectionProps) {
  const logos = content.logos;

  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="home-clients-title"
    >
      <Container>
        <Reveal className={styles.header}>
          <p className={styles.label}>{content.label}</p>
          <h2 id="home-clients-title" className="visually-hidden">
            {content.label}
          </h2>
        </Reveal>
      </Container>

      <Reveal>
        <div className={styles.marquee} aria-label={content.label}>
          <div className={styles.track}>
            <ul className={styles.group}>
              {logos.map((logo) => (
                <li key={logo.id} className={styles.item}>
                  <Image
                    src={mediaPath(logo.src)}
                    alt={logo.name}
                    width={logo.width}
                    height={logo.height}
                    className={[
                      styles.logo,
                      logoWeightClass[logo.id] ?? styles.weightLight,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </li>
              ))}
            </ul>
            {/* Duplicate sequence for seamless infinite loop */}
            <ul className={styles.group} aria-hidden="true">
              {logos.map((logo) => (
                <li key={`${logo.id}-dup`} className={styles.item}>
                  <Image
                    src={mediaPath(logo.src)}
                    alt=""
                    width={logo.width}
                    height={logo.height}
                    className={[
                      styles.logo,
                      logoWeightClass[logo.id] ?? styles.weightLight,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
