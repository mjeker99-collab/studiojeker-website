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
 * Approved optical weights from the pre–PR #55 Clients marquee.
 * Keys are local fallback ids; Sanity document ids are normalized in
 * `resolveLogoWeightClass` (e.g. `client-ubs` → `ubs`).
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
 * Map any logo id (local slug or Sanity `_id`) onto the approved weight class.
 * Unknown / newly published Client documents inherit `weightLight` — the same
 * default the marquee used before CMS ids existed. No larger separate rule.
 */
function resolveLogoWeightClass(logo: Logo): string {
  const raw = logo.id.trim().toLowerCase();
  const withoutPrefix = raw.replace(/^client-/, "");

  if (logoWeightByKey[raw]) return logoWeightByKey[raw];
  if (logoWeightByKey[withoutPrefix]) return logoWeightByKey[withoutPrefix];

  // Sanity slug variants (e.g. client-endress-hauser)
  if (withoutPrefix.startsWith("endress")) return styles.weightLight;

  // UUID documents for known dense marks — match by name only for the
  // two brands that historically used weightStrong.
  const name = logo.name.trim().toLowerCase();
  if (name === "ubs" || name.startsWith("ubs ")) return styles.weightStrong;
  if (name.includes("raiffeisen")) return styles.weightStrong;

  return styles.weightLight;
}

/**
 * Renders one full pass of the source logo list.
 * The marquee duplicates this track for a seamless loop; the source list itself is never capped.
 * Sizing uses the pre–PR #55 approved weight classes for every logo (Sanity or local).
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
            className={[styles.logo, resolveLogoWeightClass(logo)]
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
