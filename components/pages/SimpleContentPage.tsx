import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./SimpleContentPage.module.css";

export type SimpleContentPageProps = {
  label: string;
  title: string;
  body: string[];
};

export function SimpleContentPage({ label, title, body }: SimpleContentPageProps) {
  return (
    <section
      className={styles.section}
      data-header-theme="light"
      aria-labelledby="simple-page-title"
    >
      <Container>
        <Reveal className={styles.copy}>
          <SectionLabel>{label}</SectionLabel>
          <h1 id="simple-page-title" className={styles.title}>
            {title}
          </h1>
          <div className={styles.body}>
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
