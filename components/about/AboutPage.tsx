import Image from "next/image";
import Link from "next/link";
import type { AboutPageContent } from "@/lib/content/about-page";
import { mediaPath } from "@/lib/media/paths";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { Container } from "@/components/layout/Container";
import { Arrow } from "@/components/ui/Arrow";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./AboutPage.module.css";

type AboutPageProps = {
  content: AboutPageContent;
};

export function AboutPage({ content }: AboutPageProps) {
  return (
    <>
      <section
        className={styles.hero}
        data-header-theme="light"
        aria-labelledby="about-hero-title"
      >
        <div className={styles.heroGrid}>
          <Reveal className={styles.heroCopy}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="about-hero-title" className={styles.headline}>
              {content.hero.headline}
            </h1>
            <p className={styles.subheadline}>{content.hero.subheadline}</p>
            <div className={styles.body}>
              {content.hero.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Button href={content.hero.cta.href} variant="outline">
              {content.hero.cta.label}
            </Button>
          </Reveal>
          <Reveal className={styles.mediaWrap} delayMs={80}>
            <CyanBar />
            <div className={styles.media}>
              <Image
                src={mediaPath(content.hero.media.src)}
                alt={content.hero.media.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 64vw"
                className={styles.image}
                priority
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className={styles.story}
        data-header-theme="light"
        aria-labelledby="about-story-title"
      >
        <Container>
          <Reveal>
            <SectionLabel>{content.story.label}</SectionLabel>
            <h2 id="about-story-title" className={styles.sectionHeadline}>
              {content.story.headline}
            </h2>
            <div className={styles.body}>
              {content.story.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.services}
        data-header-theme="light"
        aria-labelledby="about-services-title"
      >
        <Container>
          <Reveal className={styles.servicesHeader}>
            <SectionLabel>{content.services.label}</SectionLabel>
            <h2 id="about-services-title" className={styles.sectionHeadline}>
              {content.services.headline}
            </h2>
            <p className={styles.servicesText}>{content.services.text}</p>
          </Reveal>
          <ul className={styles.serviceList}>
            {content.services.items.map((item, index) => (
              <Reveal key={item.id} as="li" delayMs={index * 50}>
                <Link href={item.href} className={styles.serviceLink}>
                  <span>{item.title}</span>
                  <Arrow className={styles.serviceArrow} />
                </Link>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section
        className={styles.work}
        data-header-theme="light"
        aria-labelledby="about-work-title"
      >
        <Container>
          <Reveal>
            <SectionLabel>{content.workStat.label}</SectionLabel>
            <h2 id="about-work-title" className="visually-hidden">
              {content.workStat.label}
            </h2>
            <Link href={content.workStat.href} className={styles.workLink}>
              <span>{content.workStat.note}</span>
              <Arrow className={styles.serviceArrow} />
            </Link>
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.network}
        data-header-theme="light"
        aria-labelledby="about-network-title"
      >
        <Container>
          <Reveal>
            <SectionLabel>{content.network.label}</SectionLabel>
            <h2 id="about-network-title" className={styles.sectionHeadline}>
              {content.network.headline}
            </h2>
            <p className={styles.networkBody}>{content.network.body}</p>
          </Reveal>
        </Container>
      </section>

      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
