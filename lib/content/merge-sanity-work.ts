import type { Locale } from "@/types/i18n";
import type {
  ProjectMedia,
  WorkCategory,
  WorkPageContent,
  WorkProjectItem,
} from "@/types/work";
import {
  type SanityLocalizedString,
  type SanityLocalizedText,
} from "@/lib/sanity/homepage";
import {
  resolveSanityImage,
  type SanityImageProjection,
} from "@/lib/sanity/media";
import {
  type SanityWork,
  type SanityWorkCategory,
  type SanityWorkMediaField,
  type SanityWorkProjectItem,
} from "@/lib/sanity/work";
import { extractVimeoId } from "@/lib/sanity/vimeo";
import { extractYoutubeId } from "@/lib/sanity/youtube";

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pickLocalized(
  value: SanityLocalizedString | SanityLocalizedText | undefined,
  locale: Locale,
  fallback?: string,
): string | undefined {
  const localized =
    locale === "en"
      ? clean(value?.en) ?? clean(value?.de)
      : clean(value?.de) ?? clean(value?.en);

  return localized ?? fallback;
}

function imageFallback(
  partial: { src: string; alt: string; width?: number; height?: number },
) {
  return {
    src: partial.src,
    alt: partial.alt,
    width: partial.width ?? 1200,
    height: partial.height ?? 800,
  };
}

function resolveImageMedia(
  image: SanityImageProjection | undefined,
  fallback: Extract<ProjectMedia, { type: "image" }>,
): Extract<ProjectMedia, { type: "image" }> {
  const resolved = resolveSanityImage(image, imageFallback(fallback));
  return {
    type: "image",
    src: resolved.src,
    alt: resolved.alt,
    width: resolved.width,
    height: resolved.height,
  };
}

/** Map Sanity workMediaField → frontend ProjectMedia with local fallback. */
export function resolveWorkMedia(
  field: SanityWorkMediaField | undefined,
  fallback: ProjectMedia,
): ProjectMedia {
  if (!field) {
    return fallback;
  }

  const mediaType =
    field.mediaType ??
    (field.vimeoUrl || field.externalVideoUrl
      ? "video"
      : (field.slideshowImages?.length ?? 0) > 0
        ? "slideshow"
        : field.image?.asset?._ref || field.image?.url
          ? "image"
          : null);

  if (!mediaType) {
    return fallback;
  }

  if (mediaType === "image" && fallback.type === "image") {
    return resolveImageMedia(field.image, fallback);
  }

  if (mediaType === "video" && fallback.type === "video") {
    const vimeoId = extractVimeoId(field.vimeoUrl ?? undefined);
    const youtubeId = extractYoutubeId(field.youtubeUrl ?? undefined);
    const external = clean(field.externalVideoUrl ?? undefined);
    const uploaded = clean(field.videoFile?.url ?? undefined);
    const src = vimeoId ?? youtubeId ?? external ?? uploaded ?? fallback.src;
    const provider = vimeoId
      ? "vimeo"
      : youtubeId
        ? "youtube"
        : external || uploaded
          ? "local"
          : fallback.provider;

    const posterFallback = imageFallback({
      src: fallback.poster,
      alt: fallback.alt ?? "",
    });
    const poster = resolveSanityImage(
      field.poster ?? field.image,
      posterFallback,
    );

    return {
      type: "video",
      src,
      poster: poster.src,
      alt: clean(field.videoAlt) ?? fallback.alt,
      duration: clean(field.duration) ?? fallback.duration,
      provider,
      autoplay: field.videoAutoplay ?? fallback.autoplay ?? true,
      loop: field.videoLoop ?? fallback.loop ?? false,
      muted: field.videoMuted ?? fallback.muted ?? true,
    };
  }

  if (mediaType === "video" && fallback.type === "image") {
    const vimeoId = extractVimeoId(field.vimeoUrl ?? undefined);
    const youtubeId = extractYoutubeId(field.youtubeUrl ?? undefined);
    const external = clean(field.externalVideoUrl ?? undefined);
    const uploaded = clean(field.videoFile?.url ?? undefined);
    const src = vimeoId ?? youtubeId ?? external ?? uploaded;
    if (!src) {
      return fallback;
    }

    const poster = resolveSanityImage(
      field.poster ?? field.image,
      imageFallback(fallback),
    );

    return {
      type: "video",
      src,
      poster: poster.src,
      alt: clean(field.videoAlt) ?? fallback.alt,
      duration: clean(field.duration),
      provider: vimeoId ? "vimeo" : youtubeId ? "youtube" : "local",
      autoplay: field.videoAutoplay ?? true,
      loop: field.videoLoop ?? false,
      muted: field.videoMuted ?? true,
    };
  }

  if (mediaType === "slideshow") {
    const images = (field.slideshowImages ?? [])
      .map((image, index) => {
        const slideFallback =
          fallback.type === "slideshow"
            ? fallback.images[index] ?? fallback.images[0]
            : fallback.type === "image"
              ? fallback
              : {
                  src: "",
                  alt: "",
                };

        if (!slideFallback?.src && !image?.asset?._ref && !image?.url) {
          return null;
        }

        const resolved = resolveSanityImage(
          image,
          imageFallback({
            src: slideFallback.src,
            alt: slideFallback.alt,
            width: slideFallback.width,
            height: slideFallback.height,
          }),
        );

        return {
          src: resolved.src,
          alt: resolved.alt,
          caption: clean(image?.caption ?? undefined),
          width: resolved.width,
          height: resolved.height,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.src));

    if (images.length === 0) {
      return fallback;
    }

    return {
      type: "slideshow",
      images,
      alt: clean(field.slideshowAlt) ?? (fallback.type === "slideshow" ? fallback.alt : undefined),
      interval: field.slideshowInterval ?? (fallback.type === "slideshow" ? fallback.interval : undefined),
    };
  }

  if (mediaType === "image" && fallback.type !== "image") {
    const imageFallback =
      fallback.type === "video"
        ? { src: fallback.poster, alt: fallback.alt ?? "", width: undefined, height: undefined }
        : fallback.type === "slideshow"
          ? fallback.images[0] ?? { src: "", alt: "" }
          : { src: "", alt: "" };

    return resolveImageMedia(field.image, {
      type: "image",
      ...imageFallback,
    });
  }

  return fallback;
}

function mergeWorkItem(
  sanityItem: SanityWorkProjectItem,
  baseItem: WorkProjectItem | undefined,
  locale: Locale,
): WorkProjectItem | null {
  if (sanityItem.active === false) {
    return null;
  }

  const fallback = baseItem ?? {
    id: sanityItem.itemId ?? "unknown",
    title: "",
    media: { type: "image" as const, src: "", alt: "" },
  };

  return {
    id: clean(sanityItem.itemId) ?? fallback.id,
    title:
      pickLocalized(sanityItem.title, locale, fallback.title) ?? fallback.title,
    caption: pickLocalized(sanityItem.caption, locale, fallback.caption),
    media: resolveWorkMedia(sanityItem.media, fallback.media),
  };
}

function mergeCategory(
  sanityCategory: SanityWorkCategory,
  baseCategory: WorkCategory | undefined,
  locale: Locale,
): WorkCategory {
  const baseItemsById = new Map(
    (baseCategory?.items ?? []).map((item) => [item.id, item]),
  );

  const sanityItems = sanityCategory.items;

  const items = (sanityItems ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) =>
      mergeWorkItem(item, baseItemsById.get(item.itemId ?? ""), locale),
    )
    .filter((item): item is WorkProjectItem => item !== null);

  return {
    id: clean(sanityCategory.categoryId) ?? baseCategory?.id ?? "category",
    title:
      pickLocalized(sanityCategory.title, locale, baseCategory?.title) ??
      baseCategory?.title ??
      "",
    items: sanityItems != null ? items : (baseCategory?.items ?? []),
  };
}

/** Pure merge of Sanity Work document → frontend WorkPageContent. */
export function mergeSanityWork(
  base: WorkPageContent,
  doc: SanityWork,
  locale: Locale,
): WorkPageContent {
  const hero = doc.heroSection;
  const seo = doc.seoSection;
  const cta = doc.finalCtaSection;

  const baseCategoriesById = new Map(base.categories.map((c) => [c.id, c]));

  const categories = (doc.categories ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((category) =>
      mergeCategory(category, baseCategoriesById.get(category.categoryId ?? ""), locale),
    );

  return {
    seo: {
      title:
        pickLocalized(seo?.title, locale, base.seo.title) ?? base.seo.title,
      description:
        pickLocalized(seo?.description, locale, base.seo.description) ??
        base.seo.description,
    },
    hero: {
      label:
        pickLocalized(hero?.label, locale, base.hero.label) ?? base.hero.label,
      headline:
        pickLocalized(hero?.headline, locale, base.hero.headline) ??
        base.hero.headline,
      text: pickLocalized(hero?.text, locale, base.hero.text) ?? base.hero.text,
    },
    categories: categories.length > 0 ? categories : base.categories,
    finalCta: {
      headlineBefore:
        pickLocalized(cta?.headlineBefore, locale, base.finalCta.headlineBefore) ??
        base.finalCta.headlineBefore,
      headlineAccent:
        pickLocalized(cta?.headlineAccent, locale, base.finalCta.headlineAccent) ??
        base.finalCta.headlineAccent,
      headlineAfter:
        pickLocalized(cta?.headlineAfter, locale, base.finalCta.headlineAfter) ??
        base.finalCta.headlineAfter,
      text:
        pickLocalized(cta?.text, locale, base.finalCta.text) ?? base.finalCta.text,
      cta: {
        label:
          pickLocalized(cta?.ctaLabel, locale, base.finalCta.cta.label) ??
          base.finalCta.cta.label,
        href: clean(cta?.ctaHref) ?? base.finalCta.cta.href,
      },
    },
  };
}
