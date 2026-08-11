import Image from "next/image";
import Link from "next/link";
import type { HomepageContent } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./WorkPage.module.css";

export type WorkCategoryItem = {
  id: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export type WorkCategory = {
  id: string;
  title: string;
  href: string;
  items: WorkCategoryItem[];
};

export type WorkPageContent = {
  seo: { title: string; description: string };
  hero: {
    label: string;
    headline: string;
    text: string;
  };
  categories: WorkCategory[];
  finalCta: HomepageContent["finalCta"];
};

type WorkPageProps = {
  content: WorkPageContent;
};

/**
 * Work overview — editorial category grid with neutral visuals.
 * No invented project or client names.
 */
export function WorkPage({ content }: WorkPageProps) {
  return (
    <>
      <section
        className={styles.hero}
        data-header-theme="light"
        aria-labelledby="work-hero-title"
      >
        <Container>
          <Reveal className={styles.copy}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="work-hero-title" className={styles.headline}>
              {content.hero.headline}
            </h1>
            <p className={styles.text}>{content.hero.text}</p>
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.projects}
        data-header-theme="light"
        aria-labelledby="work-projects-title"
      >
        <Container>
          <h2 id="work-projects-title" className="visually-hidden">
            {content.hero.headline}
          </h2>

          <div className={styles.categoryStack}>
            {content.categories.map((category, categoryIndex) => (
              <Reveal
                key={category.id}
                as="article"
                className={styles.category}
                delayMs={categoryIndex * 40}
              >
                <div className={styles.categoryHeader}>
                  <h3 className={styles.categoryTitle}>{category.title}</h3>
                  <Link href={category.href} className={styles.categoryLink}>
                    <span className="visually-hidden">{category.title}</span>
                    <Arrow className={styles.categoryArrow} />
                  </Link>
                </div>

                <div className={styles.categoryGrid}>
                  {category.items.map((item, itemIndex) => (
                    <Link
                      key={item.id}
                      href={category.href}
                      className={[
                        styles.tile,
                        itemIndex === 0 ? styles.tileLead : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={category.title}
                    >
                      <div className={styles.tileMedia}>
                        <Image
                          src={mediaPath(item.image.src)}
                          alt={item.image.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                          className={styles.tileImage}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
