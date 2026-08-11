import Image from "next/image";
import type { AboutPageContent } from "@/lib/content/about-page";
import { mediaPath } from "@/lib/media/paths";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./AboutPage.module.css";

type AboutPageProps = {
  content: AboutPageContent;
};

/**
 * About page — homepage visual system.
 * Team media: editorial composition (large studio image + portrait grid).
 */
export function AboutPage({ content }: AboutPageProps) {
  const headlineLines = content.hero.headline.split("\n").filter(Boolean);

  return (
    <>
      <section
        className={[heroStyles.section, styles.hero].join(" ")}
        data-header-theme="light"
        aria-labelledby="about-hero-title"
      >
        <div className={heroStyles.grid}>
          <Reveal className={[heroStyles.copy, styles.heroCopy].join(" ")}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="about-hero-title" className={heroStyles.headline}>
              {headlineLines.map((line, index) => {
                const isLast = index === headlineLines.length - 1;
                return (
                  <span key={`${line}-${index}`}>
                    {line}
                    {isLast && content.hero.headlineAccent ? (
                      <span className={heroStyles.accent}>
                        {content.hero.headlineAccent}
                      </span>
                    ) : null}
                    {!isLast ? <br /> : null}
                  </span>
                );
              })}
            </h1>
            <p className={heroStyles.subheadline}>{content.hero.subheadline}</p>
            <div className={heroStyles.body}>
              {content.hero.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className={heroStyles.actions}>
              <Button
                href={content.hero.primaryCta.href}
                variant="outline"
                fullWidthMobile
              >
                {content.hero.primaryCta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal className={heroStyles.mediaWrap} delayMs={120}>
            {/*
              Match the fixed homepage hero media pattern:
              cyan bar + photo as grid siblings inside one media wrapper.
              Heights couple via grid stretch — no absolute offsets.
            */}
            <div className={heroStyles.media}>
              <div className={heroStyles.cyanBar} aria-hidden="true" />
              <div className={heroStyles.photo}>
                <Image
                  src={mediaPath(content.hero.media.src)}
                  alt={content.hero.media.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 64vw"
                  className={heroStyles.image}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className={styles.middleStack}>
        <section
          className={styles.values}
          data-header-theme="light"
          aria-labelledby="about-values-title"
        >
          <Container>
            <Reveal className={styles.sectionHeader}>
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
          id="team"
          className={styles.team}
          data-header-theme="light"
          aria-labelledby="about-team-title"
        >
          <Container>
            <Reveal className={styles.teamIntroBlock}>
              <SectionLabel>{content.team.label}</SectionLabel>
              <h2 id="about-team-title" className={styles.teamHeadline}>
                {content.team.headline}
              </h2>
              <p className={styles.teamIntro}>{content.team.introduction}</p>
            </Reveal>

            {/*
              Editorial media composition:
              Desktop — large studio image (left) + portrait grid (right).
              Mobile — studio image first, then portraits.
            */}
            <div className={styles.mediaComposition}>
              <Reveal className={styles.studioMedia}>
                <div className={styles.studioFrame}>
                  {content.team.featureMedia.src ? (
                    <Image
                      src={mediaPath(content.team.featureMedia.src)}
                      alt={content.team.featureMedia.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 50vw"
                      className={styles.studioImage}
                    />
                  ) : (
                    <div className={styles.studioPlaceholder} aria-hidden="true" />
                  )}
                </div>
              </Reveal>

              <ul className={styles.portraitGrid}>
                {content.team.members.map((member, index) => {
                  const isSlot = Boolean(member.isPlaceholder || !member.image);
                  const hasMeta = Boolean(member.name || member.role);

                  return (
                    <Reveal
                      key={member.id}
                      as="li"
                      className={styles.member}
                      delayMs={40 + index * 40}
                    >
                      {isSlot ? (
                        <div
                          className={styles.portraitPlaceholder}
                          aria-hidden="true"
                        />
                      ) : (
                        <div className={styles.portrait}>
                          <Image
                            src={mediaPath(member.image!.src)}
                            alt={member.image!.alt}
                            fill
                            sizes="(max-width: 480px) 45vw, (max-width: 1024px) 22vw, 14vw"
                            className={styles.portraitImage}
                          />
                        </div>
                      )}
                      {hasMeta ? (
                        <div className={styles.memberMeta}>
                          {member.name ? (
                            <p className={styles.memberName}>{member.name}</p>
                          ) : null}
                          {member.role ? (
                            <p className={styles.memberRole}>{member.role}</p>
                          ) : null}
                        </div>
                      ) : (
                        <div className={styles.memberMetaSpacer} aria-hidden="true" />
                      )}
                    </Reveal>
                  );
                })}
              </ul>
            </div>
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
                <Reveal
                  key={item.id}
                  className={styles.fact}
                  delayMs={index * 40}
                >
                  <p className={styles.factValue}>{item.value}</p>
                  <p className={styles.factLabel}>{item.label}</p>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      </div>

      <AboutSection content={content.approach} compact />

      <ServicesSection content={content.services} />

      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
