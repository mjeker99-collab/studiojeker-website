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

/**
 * Approved optical weights for the original padded-square logo pack
 * (≈600×600 SVG canvases with large transparent margins).
 */
const logoWeightByKey: Record<string, string> = {
  hirslanden: styles.weightLight,
  certina: styles.weightLight,
  bossard: styles.weightLight,
  endress: styles.weightLight,
  "endress-hauser": styles.weightLight,
  ubs: styles.weightStrong,
  raiffeisen: styles.weightStrong,
};

/**
 * Original approved logos sit on near-square padded canvases.
 * Tight wide CMS uploads (e.g. SABAG, PB Swiss tools) fill most of their
 * frame — the same CSS `height` then makes their artwork look 3–4× larger.
 */
function isTightCropLogo(logo: Logo): boolean {
  const width = logo.width ?? 0;
  const height = logo.height ?? 0;
  if (width <= 0 || height <= 0) return false;
  const aspectRatio = width / height;
  return aspectRatio < 0.85 || aspectRatio > 1.15;
}

function resolveLogoWeightClass(logo: Logo): string {
  const raw = logo.id.trim().toLowerCase();
  const withoutPrefix = raw.replace(/^client-/, "");

  if (logoWeightByKey[raw]) return logoWeightByKey[raw];
  if (logoWeightByKey[withoutPrefix]) return logoWeightByKey[withoutPrefix];
  if (withoutPrefix.startsWith("endress")) return styles.weightLight;

  const name = logo.name.trim().toLowerCase();
  if (name === "ubs" || name.startsWith("ubs ")) return styles.weightStrong;
  if (name.includes("raiffeisen")) return styles.weightStrong;

  return styles.weightLight;
}

/** One size class per logo — padded-square pack vs tight CMS crops. */
function resolveLogoSizeClass(logo: Logo): string {
  if (isTightCropLogo(logo)) return styles.logoTight;
  return resolveLogoWeightClass(logo);
}

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
            className={[styles.logo, resolveLogoSizeClass(logo)]
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
