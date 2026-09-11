import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { LegalContentBlock } from "@/lib/content/legal-datenschutz-de";
import styles from "./SimpleContentPage.module.css";

export type SimpleContentPageProps = {
  label: string;
  title: string;
  /** Plain paragraphs (e.g. Impressum). */
  body?: string[];
  /** Structured legal copy with section headings. */
  blocks?: LegalContentBlock[];
};

export function SimpleContentPage({
  label,
  title,
  body = [],
  blocks,
}: SimpleContentPageProps) {
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
            {blocks
              ? blocks.map((block, index) =>
                  block.type === "heading" ? (
                    <h2 key={`h-${index}-${block.text}`}>{block.text}</h2>
                  ) : (
                    <p key={`p-${index}-${block.text}`}>{block.text}</p>
                  ),
                )
              : body.map((paragraph, index) => (
                  <p key={`p-${index}-${paragraph}`}>{paragraph}</p>
                ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
