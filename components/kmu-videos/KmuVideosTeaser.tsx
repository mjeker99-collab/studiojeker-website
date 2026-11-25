import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import styles from "./KmuVideos.module.css";

export function KmuVideosTeaser() {
  return (
    <section
      className={`${styles.section} ${styles.teaser}`}
      data-header-theme="light"
      aria-labelledby="kmu-videos-teaser"
    >
      <Container>
        <h2 id="kmu-videos-teaser" className={styles.heading}>Videos für Gewerbe und KMU</h2>
        <p>
          Zeigen Sie, wie Ihr Betrieb arbeitet. Wir drehen einen Unternehmerfilm
          für Ihre Website und liefern eine Kurzfassung für Social Media.
        </p>
        <Button href="/kmu-videos/" variant="outline">KMU-Videos entdecken</Button>
      </Container>
    </section>
  );
}
