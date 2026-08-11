import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { VimeoShowreel } from "@/components/media/VimeoShowreel";
import styles from "./ShowreelSection.module.css";

type ShowreelSectionProps = {
  content: HomepageContent["showreel"];
};

export function ShowreelSection({ content }: ShowreelSectionProps) {
  const poster = content.media
    ? {
        src: mediaPath(content.media.src),
        alt: content.media.alt,
        width: content.media.width,
        height: content.media.height,
      }
    : undefined;

  return (
    <section
      className={styles.section}
      data-header-theme="dark"
      aria-labelledby="home-showreel-title"
    >
      <div className={styles.grid}>
        <Reveal className={styles.copy}>
          <SectionLabel inverse>{content.label}</SectionLabel>
          <h2 id="home-showreel-title" className={styles.headline}>
            {content.headline}
            <span className={styles.accent}>.</span>
          </h2>
          <p className={styles.body}>{content.body}</p>
          <div>
            <Button href={content.cta.href} variant="cyan">
              {content.cta.label}
            </Button>
          </div>
        </Reveal>

        <Reveal className={styles.mediaWrap} delayMs={100}>
          <CyanBar />
          <VimeoShowreel
            className={styles.mediaButton}
            videoId={content.videoId}
            title={`${content.media.alt} – Showreel`}
            poster={poster}
          />
        </Reveal>
      </div>
    </section>
  );
}
