import Image from "next/image";
import Link from "next/link";
import type { AboutPageContent } from "@/lib/content/about-page";
import { mediaPath } from "@/lib/media/paths";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ServiceIcon } from "@/components/home/ServiceIcon";
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

/**
 * About page — approved mockup composition.
 * White-dominant, homepage density, cyan only as media accent / arrows / dots.
 */
export function AboutPage({ content }: AboutPageProps) {
  const headlineLines = content.hero.headline.split("\n").filter(Boolean);

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
            <h1 id="about-hero-title" className={styles.heroHeadline}>
              {headlineLines.map((line, index) => {
                const isLast = index === headlineLines.length - 1;
                return (
                  <span key={`${line}-${index}`}>
                    {line}
                    {isLast && content.hero.headlineAccent ? (
                      <span className={styles.accent}>
                        {content.hero.headlineAccent}
                      </span>
                    ) : null}
                    {!isLast ? <br /> : null}
                  </span>
                );
              })}
            </h1>
            <p className={styles.heroSubheadline}>{content.hero.subheadline}</p>
            <div className={styles.heroBody}>
              {content.hero.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div>
              <Button
                href={content.hero.primaryCta.href}
                variant="outline"
                fullWidthMobile
              >
                {content.hero.primaryCta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal className={styles.heroMediaWrap} delayMs={100}>
            <CyanBar />
            <div className={styles.heroMedia}>
              <Image
                src={mediaPath(content.hero.media.src)}
                alt={content.hero.media.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className={styles.heroImage}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className={styles.values}
        data-header-theme="light"
        aria-labelledby="about-values-title"
      >
        <Container>
          <Reveal className={styles.valuesHeader}>
            <SectionLabel>{content.values.label}</SectionLabel>
            <h2 id="about-values-title" className="visually-hidden">
              {content.values.label}
            </h2>
          </Reveal>
          <div className={styles.valuesGrid}>
            {content.values.items.map((item, index) => (
              <Reveal
                key={item.id}
                as="article"
                className={styles.valueCard}
                delayMs={index * 50}
              >
                <h3 className={styles.valueTitle}>{item.title}</h3>
                <p className={styles.valueText}>{item.description}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="services"
        className={styles.services}
        data-header-theme="light"
        aria-labelledby="about-services-title"
      >
        <Container>
          <Reveal className={styles.servicesHeader}>
            <SectionLabel>{content.services.label}</SectionLabel>
            <h2 id="about-services-title" className="visually-hidden">
              {content.services.headline}
            </h2>
          </Reveal>
          <div className={styles.servicesGrid}>
            {content.services.items.map((item, index) => (
              <Reveal key={item.id} as="article" delayMs={index * 40}>
                <Link
                  href={item.href}
                  className={styles.serviceLink}
                  aria-label={item.title}
                >
                  <ServiceIcon id={item.id} />
                  <h3 className={styles.serviceTitle}>{item.title}</h3>
                  <p className={styles.serviceText}>{item.description}</p>
                  <span className={styles.serviceArrow} aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="team"
        className={styles.team}
        data-header-theme="light"
        aria-labelledby="about-team-title"
      >
        <Container>
          <Reveal className={styles.teamHeader}>
            <SectionLabel>{content.team.label}</SectionLabel>
            <h2 id="about-team-title" className={styles.teamHeadline}>
              {content.team.headline}
            </h2>
            <p className={styles.teamIntro}>{content.team.introduction}</p>
          </Reveal>

          <ul className={styles.teamGrid}>
            {content.team.members.map((member, index) => (
              <Reveal
                key={member.id}
                as="li"
                className={styles.member}
                delayMs={index * 40}
              >
                <div className={styles.portrait}>
                  <Image
                    src={mediaPath(member.image.src)}
                    alt={member.image.alt}
                    fill
                    sizes="140px"
                    className={styles.portraitImage}
                  />
                </div>
                <div className={styles.memberMeta}>
                  <p className={styles.memberName}>{member.name}</p>
                  <p className={styles.memberRole}>{member.role}</p>
                </div>
              </Reveal>
            ))}
            <Reveal as="li" className={styles.network} delayMs={80}>
              <p className={styles.networkTitle}>{content.team.network.title}</p>
              <p className={styles.networkBody}>{content.team.network.body}</p>
            </Reveal>
          </ul>
        </Container>
      </section>

      <section
        className={styles.facts}
        data-header-theme="light"
        aria-labelledby="about-facts-title"
      >
        <Container>
          <h2 id="about-facts-title" className="visually-hidden">
            Studiojeker
          </h2>
          <div className={styles.factsGrid}>
            {content.facts.items.map((item, index) => (
              <Reveal key={item.id} className={styles.fact} delayMs={index * 40}>
                <p className={styles.factValue}>{item.value}</p>
                <p className={styles.factLabel}>{item.label}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <AboutSection content={content.approach} compact />
      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
