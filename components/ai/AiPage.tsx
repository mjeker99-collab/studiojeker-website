import Image from "next/image";
import type {
  AiPageContent,
  AiTextBlock,
} from "@/lib/content/ai-page";
import type { HomepageMedia } from "@/types/homepage";
import { mediaPath } from "@/lib/media/paths";
import { AboutSection } from "@/components/home/AboutSection";
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
 * Optional section media — image (native aspect) or Vimeo.
 * Renders nothing when no src / videoId (no grey placeholders).
 */
function SectionMediaSlot({
  media,
  videoId,
  caption,
  sizes,
}: {
  media?: HomepageMedia;
  videoId?: string;
  caption?: string;
  sizes: string;
}) {
  const hasImage = Boolean(media?.src);
  const hasVideo = Boolean(videoId);

  if (!hasImage && !hasVideo) return null;

  return (
    <figure className={styles.mediaSlot}>
      {hasVideo && videoId ? (
        <div className={styles.mediaVideoFrame}>
          <VimeoShowreel
            fill
            videoId={videoId}
            title={media?.alt || caption || "Video"}
            poster={
              hasImage && media
                ? {
                    src: mediaPath(media.src),
                    alt: media.alt,
                    width: media.width,
                    height: media.height,
                  }
                : undefined
            }
          />
        </div>
      ) : hasImage && media ? (
        <Image
          src={mediaPath(media.src)}
          alt={media.alt}
          width={media.width}
          height={media.height}
          sizes={sizes}
          className={styles.stillImage}
        />
      ) : null}
      {caption ? <figcaption className={styles.mediaCaption}>{caption}</figcaption> : null}
    </figure>
  );
}

/**
 * Text + optional Sanity media (image or video) in the Studiojeker two-column rhythm.
 * When media is missing, layout collapses to text-only.
 */
function TextWithMedia({
  id,
  content,
  fallbackStill,
  inverted = false,
  mediaFirst = false,
}: {
  id: string;
  content: AiTextBlock;
  /** Optional still from visualMedia when section media is empty. */
  fallbackStill?: HomepageMedia;
  inverted?: boolean;
  mediaFirst?: boolean;
}) {
  const media = content.media?.src ? content.media : fallbackStill;
  const videoId = content.videoId;
  const hasMedia = Boolean(media?.src || videoId);

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
            hasMedia && mediaFirst ? styles.textSectionStillFirst : "",
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
          {hasMedia ? (
            <Reveal className={styles.textSectionMedia} delayMs={80}>
              <SectionMediaSlot
                media={media}
                videoId={videoId}
                caption={content.caption}
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

function StillFigure({
  media,
  sizes,
}: {
  media: HomepageMedia;
  sizes: string;
}) {
  if (!media.src) return null;

  return (
    <figure className={styles.still}>
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

/**
 * KI / AI page — About / homepage visual system.
 * Hero matches About/Services grid rules; showreel reuses AboutSection.
 */
export function AiPage({ content }: AiPageProps) {
  const { visuals } = content;
  const hasVillaPair = Boolean(
    visuals.clayVilla?.src || visuals.photoVilla?.src,
  );

  const showreelHeadline = content.showreel.headline.replace(/\.$/, "");

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
            <h1
              id="ai-hero-title"
              className={[heroStyles.headline, styles.heroHeadline].join(" ")}
            >
              {content.hero.headline
                .split("\n")
                .filter(Boolean)
                .map((line, index, lines) => {
                  const isLast = index === lines.length - 1;
                  return (
                    <span key={`${line}-${index}`}>
                      {line}
                      {!isLast ? <br /> : null}
                    </span>
                  );
                })}
            </h1>
            <p className={heroStyles.subheadline}>{content.hero.body}</p>
          </Reveal>

          <Reveal
            className={[heroStyles.mediaWrap, styles.heroMediaWrap].join(" ")}
            delayMs={120}
          >
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

      <TextWithMedia
        id="ai-intro-title"
        content={content.intro}
        fallbackStill={visuals.keyVisual}
      />

      <AboutSection
        key={`ai-showreel-${content.showreel.videoId ?? "image"}:${content.showreel.media.src}`}
        compact
        content={{
          label: content.showreel.label,
          headline: showreelHeadline,
          headlineAccent: ".",
          subheadline: "",
          body: [content.showreel.body],
          cta: content.showreel.cta,
          media: content.showreel.media,
          videoId: content.showreel.videoId,
        }}
      />

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
              <SectionMediaSlot
                media={content.applications.media}
                videoId={content.applications.videoId}
                caption={content.applications.caption}
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

      <TextWithMedia
        id="ai-models-title"
        content={content.models}
        inverted
      />

      {/* Bild 4 — Content Formats / DISTRIBUTION (full-width when uploaded) */}
      {visuals.contentFormats?.src ? (
        <section
          className={styles.stillSection}
          data-header-theme="light"
          aria-label={visuals.contentFormats.alt || "Content formats"}
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

      <TextWithMedia
        id="ai-experience-title"
        content={content.experience}
      />

      {/* Bild 5 — Social distribution with Approach text */}
      <TextWithMedia
        id="ai-approach-title"
        content={content.approach}
        fallbackStill={visuals.distributionChannels}
        inverted
      />

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
