import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./ClientsSection.module.css";

type ClientsSectionProps = {
  content: HomepageContent["clients"];
};

type Logo = HomepageContent["clients"]["logos"][number];

/** Visual-weight classes: light wordmarks need more scale than dense marks. */
const logoWeightClass: Record<string, string> = {
  hirslanden: styles.weightLight,
  certina: styles.weightLight,
  bossard: styles.weightLight,
  endress: styles.weightLight,
  ubs: styles.weightStrong,
  raiffeisen: styles.weightStrong,
};

/**
 * Renders one full pass of the source logo list.
 * The marquee duplicates this track for a seamless loop; the source list itself is never capped.
 */
function LogoTrack({
  logos,
  duplicate = false,
}: {
  logos: Logo[];
  duplicate?: boolean;
}) {
  return (
    <ul className={styles.track} aria-hidden={duplicate || undefined}>
      {logos.map((logo) => (
        <li key={`${duplicate ? "dup-" : ""}${logo.id}`} className={styles.item}>
          <Image
            src={mediaPath(logo.src)}
            alt={duplicate ? "" : logo.name}
            width={logo.width}
            height={logo.height}
            className={[styles.logo, logoWeightClass[logo.id] ?? styles.weightLight]
              .filter(Boolean)
              .join(" ")}
          />
        </li>
      ))}
    </ul>
  );
}

export function ClientsSection({ content }: ClientsSectionProps) {
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
        <div className={styles.marquee}>
          <div className={styles.viewport}>
            <div className={styles.rail}>
              <LogoTrack logos={content.logos} />
              <LogoTrack logos={content.logos} duplicate />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
