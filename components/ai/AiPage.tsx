import Image from "next/image";
import type {
  AiPageContent,
  AiTextBlock,
} from "@/lib/content/ai-page";
import type { HomepageMedia } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { ClientsSection } from "@/components/home/ClientsSection";
import { HeroVimeoLoop } from "@/components/home/HeroVimeoLoop";
import { VimeoShowreel } from "@/components/media/VimeoShowreel";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./AiPage.module.css";

type AiPageProps = {
  content: AiPageContent;
};

/**
 * Showreel still — preserves native aspect ratio (no aggressive cover crop).
 * Only renders when Sanity has published a src.
 */
function StillFigure({
  media,
  sizes,
  className,
}: {
  media: HomepageMedia;
  sizes: string;
  className?: string;
}) {
  if (!media.src) return null;

  return (
    <figure className={[styles.still, className].filter(Boolean).join(" ")}>
      <Image
        src={mediaPath(media.src)}
        alt={media.alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        className={styles.stillImage}
      />
    </figure>
  );
}

function SectionMedia({
  media,
  videoId,
  sizes,
}: {
  media: NonNullable<AiTextBlock["media"]>;
  videoId?: string;
  sizes: string;
}) {
  return (
    <div className={styles.sectionMediaFrame}>
      {videoId ? (
        <HeroVimeoLoop
          videoId={videoId}
          title={media.alt}
          poster={{
            src: mediaPath(media.src),
            alt: media.alt,
            width: media.width,
            height: media.height,
          }}
        />
      ) : media.src ? (
        <Image
          src={mediaPath(media.src)}
          alt={media.alt}
          fill
          sizes={sizes}
          className={styles.sectionImage}
        />
      ) : null}
    </div>
  );
}

function TextSection({
  id,
  content,
  inverted = false,
}: {
  id: string;
  content: AiTextBlock;
  inverted?: boolean;
}) {
  const hasMedia = Boolean(content.media?.src || content.videoId);

  return (
    <section
      className={[styles.textSection, inverted ? styles.textSectionAlt : ""]
        .filter(Boolean)
        .join(" ")}
      data-header-theme="light"
      aria-labelledby={id}
    >
      <Container>
        <div
          className={[
            styles.textSectionGrid,
            hasMedia ? styles.textSectionWithMedia : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Reveal className={styles.textSectionCopy}>
            <h2 id={id} className={styles.sectionHeadline}>
              {content.headline}
            </h2>
            <div className={styles.sectionBody}>
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
          {hasMedia && content.media ? (
            <Reveal className={styles.textSectionMedia} delayMs={80}>
              <SectionMedia
                media={content.media}
                videoId={content.videoId}
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * KI / AI page — About / homepage / Content-Abo visual system.
 * Showreel + stills only; copy unchanged. Layout in AiPage.module.css.
 */
export function AiPage({ content }: AiPageProps) {
  const { visuals } = content;
  const hasVillaPair = Boolean(
    visuals.clayVilla?.src || visuals.photoVilla?.src,
  );
  const showreelPoster = content.showreel.media
    ? {
        src: mediaPath(content.showreel.media.src),
        alt: content.showreel.media.alt,
        width: content.showreel.media.width,
        height: content.showreel.media.height,
      }
    : undefined;

  return (
    <>
      <section
        className={[heroStyles.section, styles.hero].join(" ")}
        data-header-theme="light"
        aria-labelledby="ai-hero-title"
      >
        <div className={heroStyles.grid}>
          <Reveal className={[heroStyles.copy, styles.heroCopy].join(" ")}>
            <SectionLabel>{content.hero.label}</SectionLabel>
            <h1 id="ai-hero-title" className={heroStyles.headline}>
              {content.hero.headline}
            </h1>
            <p className={heroStyles.subheadline}>{content.hero.body}</p>
          </Reveal>

          <Reveal className={heroStyles.mediaWrap} delayMs={120}>
            <div className={heroStyles.media}>
              <div className={heroStyles.cyanBar} aria-hidden="true" />
              <div className={heroStyles.photo}>
                {content.hero.videoId ? (
                  <HeroVimeoLoop
                    videoId={content.hero.videoId}
                    title={content.hero.media.alt}
                    poster={{
                      src: mediaPath(content.hero.media.src),
                      alt: content.hero.media.alt,
                      width: content.hero.media.width,
                      height: content.hero.media.height,
                    }}
                  />
                ) : (
                  <Image
                    src={mediaPath(content.hero.media.src)}
                    alt={content.hero.media.alt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 64vw"
                    className={heroStyles.image}
                  />
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <TextSection id="ai-intro-title" content={content.intro} />

      {visuals.keyVisual?.src ? (
        <section
          className={styles.stillSection}
          data-header-theme="light"
          aria-label={visuals.keyVisual.alt}
        >
          <Container>
            <Reveal>
              <StillFigure
                media={visuals.keyVisual}
                sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
                className={styles.stillKey}
              />
            </Reveal>
          </Container>
        </section>
      ) : null}

      <section
        className={styles.showreel}
        data-header-theme="dark"
        aria-labelledby="ai-showreel-title"
      >
        <Container>
          <Reveal className={styles.showreelCopy}>
            <SectionLabel inverse>{content.showreel.label}</SectionLabel>
            <h2 id="ai-showreel-title" className={styles.showreelHeadline}>
              {content.showreel.headline}
              <span className={styles.showreelAccent}>.</span>
            </h2>
            <p className={styles.showreelBody}>{content.showreel.body}</p>
            <div>
              <Button href={content.showreel.cta.href} variant="cyan">
                {content.showreel.cta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal className={styles.showreelMedia} delayMs={80}>
            {content.showreel.videoId ? (
              <div className={styles.showreelFrame}>
                <VimeoShowreel
                  key={`ai-showreel-${content.showreel.videoId}-${content.showreel.media.src}`}
                  videoId={content.showreel.videoId}
                  title={`${content.showreel.media.alt} – Showreel`}
                  poster={showreelPoster}
                  fill
                />
              </div>
            ) : content.showreel.media.src ? (
              <div className={styles.showreelFrame}>
                <Image
                  src={mediaPath(content.showreel.media.src)}
                  alt={content.showreel.media.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
                  className={styles.showreelPosterImage}
                />
              </div>
            ) : null}
          </Reveal>
        </Container>
      </section>

      <section
        className={styles.process}
        data-header-theme="light"
        aria-labelledby="ai-process-title"
      >
        <Container>
          <Reveal className={styles.processHeader}>
            <SectionLabel>{content.process.label}</SectionLabel>
            <h2 id="ai-process-title" className={styles.sectionHeadline}>
              {content.process.headline}
            </h2>
            <p className={styles.processIntro}>{content.process.introduction}</p>
          </Reveal>

          <ol className={styles.processFlow}>
            {content.process.steps.map((step, index) => (
              <li key={step.id} className={styles.processItem}>
                <Reveal
                  as="article"
                  className={styles.processStep}
                  delayMs={index * 40}
                >
                  <h3 className={styles.processTitle}>{step.title}</h3>
                  <p className={styles.processText}>{step.description}</p>
                </Reveal>
                {index < content.process.steps.length - 1 ? (
                  <span className={styles.processArrow} aria-hidden="true">
                    ↓
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section
        className={styles.applications}
        data-header-theme="light"
        aria-labelledby="ai-applications-title"
      >
        <Container>
          <Reveal className={styles.applicationsHeader}>
            <h2 id="ai-applications-title" className={styles.sectionHeadline}>
              {content.applications.headline}
            </h2>
          </Reveal>
          <div className={styles.applicationsGrid}>
            {content.applications.items.map((item, index) => (
              <Reveal
                key={item.id}
                as="article"
                className={styles.application}
                delayMs={index * 40}
              >
                <p className={styles.applicationNumber}>{item.number}</p>
                <h3 className={styles.applicationTitle}>{item.title}</h3>
                <p className={styles.applicationText}>{item.description}</p>
              </Reveal>
            ))}
          </div>
          {content.applications.media?.src || content.applications.videoId ? (
            <Reveal className={styles.applicationsMedia} delayMs={80}>
              <SectionMedia
                media={
                  content.applications.media ?? {
                    src: "",
                    alt: "",
                    width: 1600,
                    height: 900,
                  }
                }
                videoId={content.applications.videoId}
                sizes="100vw"
              />
            </Reveal>
          ) : null}
        </Container>
      </section>

      {hasVillaPair ? (
        <section
          className={styles.stillSection}
          data-header-theme="light"
          aria-label="3D visualisation and production"
        >
          <Container>
            <div className={styles.villaPair}>
              {visuals.clayVilla?.src ? (
                <Reveal>
                  <StillFigure
                    media={visuals.clayVilla}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </Reveal>
              ) : null}
              {visuals.photoVilla?.src ? (
                <Reveal delayMs={80}>
                  <StillFigure
                    media={visuals.photoVilla}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </Reveal>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      <TextSection id="ai-models-title" content={content.models} inverted />
      <TextSection id="ai-experience-title" content={content.experience} />
      <TextSection id="ai-approach-title" content={content.approach} inverted />

      {visuals.contentFormats?.src ? (
        <section
          className={styles.stillSection}
          data-header-theme="light"
          aria-label={visuals.contentFormats.alt}
        >
          <Container>
            <Reveal>
              <StillFigure
                media={visuals.contentFormats}
                sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
              />
            </Reveal>
          </Container>
        </section>
      ) : null}

      {visuals.distributionChannels?.src ? (
        <section
          className={styles.stillSection}
          data-header-theme="light"
          aria-label={visuals.distributionChannels.alt}
        >
          <Container>
            <Reveal>
              <StillFigure
                media={visuals.distributionChannels}
                sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
              />
            </Reveal>
          </Container>
        </section>
      ) : null}

      <ClientsSection content={content.clients} />

      <section
        className={styles.closing}
        data-header-theme="dark"
        aria-labelledby="ai-closing-title"
      >
        <Reveal className={styles.closingInner}>
          <div className={styles.closingContent}>
            <div className={styles.closingCopy}>
              <h2 id="ai-closing-title" className={styles.closingHeadline}>
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
