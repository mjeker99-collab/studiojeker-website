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
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import heroStyles from "@/components/home/HeroSection.module.css";
import styles from "./AiPage.module.css";

type AiPageProps = {
  content: AiPageContent;
};

type EditorialTheme = "light" | "dark";

/**
 * Media frame with cyan bar — image / video / neutral placeholder.
 * Aspect follows the asset (no forced landscape crop).
 */
function MediaWithCyanBar({
  media,
  videoId,
  caption,
  sizes,
  fillFrame = false,
}: {
  media?: HomepageMedia;
  videoId?: string;
  caption?: string;
  sizes: string;
  /** Stretch media to fill editorial column height (cover). */
  fillFrame?: boolean;
}) {
  const hasImage = Boolean(media?.src);
  const hasVideo = Boolean(videoId);

  return (
    <figure className={styles.mediaFigure}>
      <div
        className={[
          styles.mediaFrame,
          fillFrame ? styles.mediaFrameFill : "",
          !hasImage && !hasVideo ? styles.mediaFramePlaceholder : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CyanBar boundToMedia />
        {hasVideo && videoId ? (
          <div className={styles.mediaVideo}>
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
          fillFrame ? (
            <Image
              src={mediaPath(media.src)}
              alt={media.alt}
              fill
              sizes={sizes}
              className={styles.mediaCover}
            />
          ) : (
            <Image
              src={mediaPath(media.src)}
              alt={media.alt}
              width={media.width || 1600}
              height={media.height || 1200}
              sizes={sizes}
              className={styles.mediaIntrinsic}
            />
          )
        ) : (
          <div className={styles.mediaPlaceholder} aria-hidden="true" />
        )}
      </div>
      {caption ? (
        <figcaption className={styles.mediaCaption}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Large text + media block matching About / Showreel / AI-teaser rhythm.
 * Light: text left, media right. Dark: media left, white text right.
 * Missing Sanity media → neutral placeholder (never a repo image).
 */
function EditorialBlock({
  id,
  content,
  fallbackStill,
  theme = "light",
  label,
  cta,
  singleBody,
  accentPeriod = false,
}: {
  id: string;
  content: AiTextBlock;
  fallbackStill?: HomepageMedia;
  theme?: EditorialTheme;
  label?: string;
  cta?: { label: string; href: string };
  /** Use first body paragraph only (showreel-style). */
  singleBody?: boolean;
  /** Cyan period after headline (showreel only). */
  accentPeriod?: boolean;
}) {
  const media = content.media?.src ? content.media : fallbackStill;
  const videoId = content.videoId;
  const isDark = theme === "dark";
  const paragraphs = singleBody
    ? content.body.slice(0, 1)
    : content.body;

  return (
    <section
      className={[
        styles.editorial,
        isDark ? styles.editorialDark : styles.editorialLight,
      ].join(" ")}
      data-header-theme={isDark ? "dark" : "light"}
      aria-labelledby={id}
    >
      <div
        className={[
          styles.editorialGrid,
          isDark ? styles.editorialGridMediaFirst : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Reveal className={styles.editorialCopy}>
          {label ? (
            <SectionLabel inverse={isDark}>{label}</SectionLabel>
          ) : null}
          <h2 id={id} className={styles.editorialHeadline}>
            {content.headline}
            {accentPeriod ? (
              <span className={styles.headlineAccent}>.</span>
            ) : null}
          </h2>
          <div className={styles.editorialBody}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {cta ? (
            <div>
              <Button
                href={cta.href}
                variant={isDark ? "cyan" : "outline"}
              >
                {cta.label}
              </Button>
            </div>
          ) : null}
        </Reveal>

        <Reveal className={styles.editorialMedia} delayMs={80}>
          <MediaWithCyanBar
            media={media}
            videoId={videoId}
            caption={content.caption}
            sizes="(max-width: 1024px) 100vw, 58vw"
            fillFrame
          />
        </Reveal>
      </div>
    </section>
  );
}

/** Optional still — native aspect, cyan bar, placeholder when empty. */
function StillBreak({
  media,
  sizes = "(max-width: 1024px) 100vw, min(100vw, 72rem)",
  label,
}: {
  media?: HomepageMedia;
  sizes?: string;
  label?: string;
}) {
  if (!media?.src) return null;

  return (
    <section
      className={styles.stillBreak}
      data-header-theme="light"
      aria-label={label || media.alt || "Image"}
    >
      <Container>
        <Reveal>
          <MediaWithCyanBar media={media} sizes={sizes} />
        </Reveal>
      </Container>
    </section>
  );
}

function processBreakAfterStep(
  stepId: string,
  breaks: AiPageContent["landscapeBreaks"],
): HomepageMedia | undefined {
  switch (stepId) {
    case "ai":
      return breaks.afterAi;
    case "distribution":
      return breaks.afterDistribution;
    case "visibility":
      return breaks.afterVisibility;
    default:
      return undefined;
  }
}

/**
 * KI / AI page — About / homepage visual system.
 * Alternating light (text left / media right) and dark (media left / text right)
 * editorial blocks with cyan bars. All media from Sanity only.
 */
export function AiPage({ content }: AiPageProps) {
  const { visuals, landscapeBreaks } = content;
  const heroHasMedia = Boolean(
    content.hero.media.src || content.hero.videoId,
  );

  const showreelAsBlock: AiTextBlock = {
    headline: content.showreel.headline.replace(/\.$/, ""),
    body: [content.showreel.body],
    media: content.showreel.media,
    videoId: content.showreel.videoId,
  };

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
                    title={content.hero.media.alt || content.hero.headline}
                    poster={
                      content.hero.media.src
                        ? {
                            src: mediaPath(content.hero.media.src),
                            alt: content.hero.media.alt,
                            width: content.hero.media.width,
                            height: content.hero.media.height,
                          }
                        : undefined
                    }
                  />
                ) : heroHasMedia && content.hero.media.src ? (
                  <Image
                    src={mediaPath(content.hero.media.src)}
                    alt={content.hero.media.alt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 64vw"
                    className={heroStyles.image}
                  />
                ) : (
                  <div className={styles.heroPlaceholder} aria-hidden="true" />
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Intro — white, text left / media right */}
      <EditorialBlock
        id="ai-intro-title"
        content={content.intro}
        fallbackStill={visuals.keyVisual}
        theme="light"
      />

      {/* Showreel — black, media left / text right (homepage showreel rhythm) */}
      <EditorialBlock
        id="ai-showreel-title"
        content={showreelAsBlock}
        theme="dark"
        label={content.showreel.label}
        cta={content.showreel.cta}
        singleBody
        accentPeriod
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
            {content.process.steps.map((step, index) => {
              const breakMedia = processBreakAfterStep(
                step.id,
                landscapeBreaks,
              );
              const isLast = index >= content.process.steps.length - 1;
              const hasBreak = Boolean(breakMedia?.src);
              const showArrow = !isLast || hasBreak;
              return (
                <li key={step.id} className={styles.processItem}>
                  <Reveal
                    as="article"
                    className={styles.processStep}
                    delayMs={index * 40}
                  >
                    <h3 className={styles.processTitle}>{step.title}</h3>
                    <p className={styles.processText}>{step.description}</p>
                  </Reveal>
                  {showArrow ? (
                    <span className={styles.processArrow} aria-hidden="true">
                      ↓
                    </span>
                  ) : null}
                  {hasBreak ? (
                    <Reveal className={styles.processLandscape} delayMs={60}>
                      <MediaWithCyanBar
                        media={breakMedia}
                        sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
                      />
                    </Reveal>
                  ) : null}
                </li>
              );
            })}
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
          {(() => {
            const items = content.applications.items;
            const firstBand = items.slice(0, 3);
            const secondBand = items.slice(3);
            return (
              <>
                <div className={styles.applicationsGrid}>
                  {firstBand.map((item, index) => (
                    <Reveal
                      key={item.id}
                      as="article"
                      className={styles.application}
                      delayMs={index * 40}
                    >
                      <p className={styles.applicationNumber}>{item.number}</p>
                      <h3 className={styles.applicationTitle}>{item.title}</h3>
                      <p className={styles.applicationText}>
                        {item.description}
                      </p>
                    </Reveal>
                  ))}
                </div>
                {landscapeBreaks.midApplications?.src ? (
                  <Reveal className={styles.applicationsLandscape} delayMs={60}>
                    <span className={styles.processArrow} aria-hidden="true">
                      ↓
                    </span>
                    <MediaWithCyanBar
                      media={landscapeBreaks.midApplications}
                      sizes="(max-width: 1024px) 100vw, min(100vw, 72rem)"
                    />
                  </Reveal>
                ) : null}
                {secondBand.length > 0 ? (
                  <div className={styles.applicationsGrid}>
                    {secondBand.map((item, index) => (
                      <Reveal
                        key={item.id}
                        as="article"
                        className={styles.application}
                        delayMs={index * 40}
                      >
                        <p className={styles.applicationNumber}>
                          {item.number}
                        </p>
                        <h3 className={styles.applicationTitle}>
                          {item.title}
                        </h3>
                        <p className={styles.applicationText}>
                          {item.description}
                        </p>
                      </Reveal>
                    ))}
                  </div>
                ) : null}
              </>
            );
          })()}
          <Reveal className={styles.applicationsMedia} delayMs={80}>
            <MediaWithCyanBar
              media={content.applications.media}
              videoId={content.applications.videoId}
              caption={content.applications.caption}
              sizes="100vw"
              fillFrame
            />
          </Reveal>
        </Container>
      </section>

      <StillBreak
        media={landscapeBreaks.afterApplications}
        label={landscapeBreaks.afterApplications?.alt}
      />

      {/* Optional photo villa when published (clay pairs with Models) */}
      <StillBreak
        media={visuals.photoVilla}
        label={visuals.photoVilla?.alt || "Photoreal production"}
      />

      {/* Models — black, media left / text right; clay villa fallback */}
      <EditorialBlock
        id="ai-models-title"
        content={content.models}
        fallbackStill={visuals.clayVilla}
        theme="dark"
      />

      <StillBreak
        media={landscapeBreaks.afterModels}
        label={landscapeBreaks.afterModels?.alt}
      />

      {/* Experience — white, text left / media right; content formats fallback */}
      <EditorialBlock
        id="ai-experience-title"
        content={content.experience}
        fallbackStill={visuals.contentFormats}
        theme="light"
      />

      <StillBreak
        media={landscapeBreaks.afterExperience}
        label={landscapeBreaks.afterExperience?.alt}
      />

      {/* Approach — black, media left / text right; distribution channels fallback */}
      <EditorialBlock
        id="ai-approach-title"
        content={content.approach}
        fallbackStill={visuals.distributionChannels}
        theme="dark"
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
