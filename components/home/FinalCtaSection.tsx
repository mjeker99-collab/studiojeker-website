import type { HomepageContent } from "@/types/homepage";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./FinalCtaSection.module.css";

type FinalCtaSectionProps = {
  content: HomepageContent["finalCta"];
};

export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="dark"
      aria-labelledby="home-final-cta-title"
    >
      <Reveal className={styles.inner}>
        <CyanBar />
        <div className={styles.content}>
          <div className={styles.copy}>
            <h2 id="home-final-cta-title" className={styles.headline}>
              {content.headlineBefore}
              <span className={styles.accent}>{content.headlineAccent}</span>
              {content.headlineAfter}
            </h2>
            <p className={styles.text}>{content.text}</p>
          </div>
          <Button href={content.cta.href} variant="secondary">
            {content.cta.label}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
