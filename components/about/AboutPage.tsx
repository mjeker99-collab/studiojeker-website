import Image from "next/image";
import type { AboutPageContent } from "@/lib/content/about-page";
import { mediaPath } from "@/lib/media/paths";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./AboutPage.module.css";

type AboutPageProps = {
  content: AboutPageContent;
};

/**
 * About page — homepage visual system.
 * Middle: Anspruch → Team+Image (40/60) → Facts → So arbeiten wir.
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
            <CyanBar />
            <div className={heroStyles.media}>
              <Image
                src={mediaPath(content.hero.media.src)}
                alt={content.hero.media.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 64vw"
                className={[heroStyles.image, styles.heroImage].join(" ")}
              />
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

        {/* Homepage AboutSection proportions: ~40% copy / ~60% media + CyanBar */}
        <section
          id="team"
          className={styles.team}
          data-header-theme="light"
          aria-labelledby="about-team-title"
        >
          <div className={styles.teamSplit}>
            <Reveal className={styles.teamCopy}>
              <SectionLabel>{content.team.label}</SectionLabel>
              <h2 id="about-team-title" className={styles.teamHeadline}>
                {content.team.headline}
              </h2>
              <p className={styles.teamIntro}>{content.team.introduction}</p>

              <ul className={styles.teamGrid}>
                {content.team.members.map((member, index) => (
                  <li key={member.id} className={styles.member}>
                    {member.isPlaceholder || !member.image ? (
                      <div
                        className={styles.portraitPlaceholder}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className={styles.portrait}>
                        <Image
                          src={mediaPath(member.image.src)}
                          alt={member.image.alt}
                          fill
                          sizes="96px"
                          className={styles.portraitImage}
                        />
                      </div>
                    )}
                    <div className={styles.memberMeta}>
                      <p className={styles.memberName}>{member.name}</p>
                      <p className={styles.memberRole}>{member.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className={styles.mediaWrap} delayMs={100}>
              <CyanBar />
              <div
                className={styles.mediaPlaceholder}
                role="img"
                aria-label={content.team.featureMedia.ariaLabel}
              >
                <span className={styles.mediaPlaceholderLabel}>
                  <span className={styles.mediaPlaceholderTitle}>
                    {content.team.featureMedia.title}
                  </span>
                  <span className={styles.mediaPlaceholderCaption}>
                    {content.team.featureMedia.caption}
                  </span>
                </span>
              </div>
            </Reveal>
          </div>
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

      {/* Service destinations retained; outside the compact middle stack */}
      <ServicesSection content={content.services} />

      <ClientsSection content={content.clients} />
      <FinalCtaSection content={content.finalCta} />
    </>
  );
}
