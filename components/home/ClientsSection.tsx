import Image from "next/image";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./ClientsSection.module.css";

type ClientsSectionProps = {
  content: HomepageContent["clients"];
};

type ClientLogo = HomepageContent["clients"]["logos"][number];

/** Visual-weight classes: light wordmarks need more scale than dense marks. */
const logoWeightClass: Record<string, string> = {
  hirslanden: styles.weightLight,
  certina: styles.weightLight,
  bossard: styles.weightLight,
  endress: styles.weightLight,
  ubs: styles.weightStrong,
  raiffeisen: styles.weightStrong,
};

function LogoItem({
  logo,
  decorative = false,
  filler = false,
}: {
  logo: ClientLogo;
  decorative?: boolean;
  filler?: boolean;
}) {
  return (
    <li className={[styles.item, filler ? styles.filler : ""].filter(Boolean).join(" ")}>
      <Image
        src={mediaPath(logo.src)}
        alt={decorative ? "" : logo.name}
        width={logo.width}
        height={logo.height}
        className={[styles.logo, logoWeightClass[logo.id] ?? styles.weightLight]
          .filter(Boolean)
          .join(" ")}
      />
    </li>
  );
}

function renderSequence(
  logos: ClientLogo[],
  keyPrefix: string,
  options: { decorative?: boolean; filler?: boolean } = {},
) {
  return logos.map((logo, index) => (
    <LogoItem
      key={`${keyPrefix}-${logo.id}-${index}`}
      logo={logo}
      decorative={options.decorative}
      filler={options.filler}
    />
  ));
}

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
            {/*
              Each half repeats the set so group width exceeds desktop viewport.
              Required for a gap-free translateX(-50%) seamless loop at ~1440px.
            */}
            <ul className={styles.group}>
              {renderSequence(logos, "a")}
              {renderSequence(logos, "a-fill", { decorative: true, filler: true })}
            </ul>
            <ul className={styles.group} aria-hidden="true">
              {renderSequence(logos, "b", { decorative: true })}
              {renderSequence(logos, "b-fill", { decorative: true, filler: true })}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
