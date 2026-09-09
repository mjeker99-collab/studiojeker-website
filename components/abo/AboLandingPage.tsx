import Image from "next/image";
import type { AboPageContent } from "@/lib/content/abo-page";
import { mediaPath } from "@/lib/media/paths";
import { aboBenefitIcons } from "@/components/home/aboBenefitIcons";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./AboLandingPage.module.css";

type AboLandingPageProps = {
  content: AboPageContent;
};

/**
 * Content-Abo landing page.
 * Visual language matches the homepage — SiteChrome provides header/footer.
 */
export function AboLandingPage({ content }: AboLandingPageProps) {
  return (
    <>
      <section
        className={[heroStyles.section, styles.hero].join(" ")}
        data-header-theme="light"
        aria-labelledby="abo-hero-title"
      >
        <div className={heroStyles.grid}>
          <Reveal className={[heroStyles.copy, styles.heroCopy].join(" ")}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="abo-hero-title" className={heroStyles.headline}>
              {content.hero.headline}
            </h1>
            <p className={styles.heroBody}>{content.hero.body}</p>
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
            <div className={heroStyles.media}>
              <div className={heroStyles.cyanBar} aria-hidden="true" />
              <div className={heroStyles.photo}>
                <Image
                  key={content.hero.media.src}
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

      <section
        className={styles.problem}
        data-header-theme="light"
        aria-labelledby="abo-problem-title"
      >
        <Container>
          <Reveal className={styles.problemCopy}>
            <SectionLabel>{content.problem.label}</SectionLabel>
            <h2 id="abo-problem-title" className={styles.sectionHeadline}>
              {content.problem.headline}
            </h2>
            <div className={styles.problemBody}>
              {content.problem.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <p className={styles.highlight}>{content.problem.highlight}</p>
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.benefits}
        data-header-theme="dark"
        aria-label={content.benefits.items.map((item) => item.title).join(", ")}
      >
        <Container>
          <div className={styles.benefitsGrid} role="list">
            {content.benefits.items.map((benefit, index) => (
              <Reveal
                key={benefit.id}
                as="article"
                className={styles.benefit}
                delayMs={index * 60}
              >
                <span className={styles.icon}>{aboBenefitIcons[benefit.id]}</span>
                <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                <p className={styles.benefitText}>{benefit.description}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section
        className={styles.process}
        data-header-theme="light"
        aria-labelledby="abo-process-title"
      >
        <Container>
          <Reveal className={styles.processHeader}>
            <h2 id="abo-process-title" className={styles.sectionHeadline}>
              {content.process.headline}
            </h2>
          </Reveal>
          <div className={styles.processGrid}>
            {content.process.steps.map((step, index) => (
              <Reveal
                key={step.id}
                as="article"
                className={styles.step}
                delayMs={index * 60}
              >
                <p className={styles.stepNumber}>{step.number}</p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.description}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section
        className={styles.scope}
        data-header-theme="light"
        aria-labelledby="abo-scope-title"
      >
        <Container>
          <Reveal className={styles.scopeCopy}>
            <h2 id="abo-scope-title" className={styles.sectionHeadline}>
              {content.scope.headline}
            </h2>
            <p className={styles.scopeIntro}>{content.scope.introduction}</p>
            <p className={styles.scopeItems}>{content.scope.items.join(" · ")}</p>
            <p className={styles.scopeClosing}>{content.scope.closing}</p>
            <p className={styles.highlight}>{content.scope.highlight}</p>
          </Reveal>
        </Container>
      </section>

      <ShowreelSection
        key={`${content.showreel.videoId ?? "image"}:${content.showreel.media.src}`}
        content={content.showreel}
      />

      <section
        className={styles.closing}
        data-header-theme="dark"
        aria-labelledby="abo-closing-title"
      >
        <Reveal className={styles.closingInner}>
          <div className={styles.closingContent}>
            <div className={styles.closingCopy}>
              <SectionLabel inverse>{content.closing.label}</SectionLabel>
              <h2 id="abo-closing-title" className={styles.closingHeadline}>
                {content.closing.headline}
              </h2>
              <p className={styles.closingText}>{content.closing.text}</p>
            </div>
            <Button href={content.closing.cta.href} variant="secondary">
              {content.closing.cta.label}
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
