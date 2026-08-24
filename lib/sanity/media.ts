import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import type { HomepageMedia } from "@/types/homepage";
import { urlForImage } from "@/lib/sanity/image";
import { extractVimeoId } from "@/lib/sanity/vimeo";

export type SanityImageProjection = {
  _type?: string;
  asset?: { _ref?: string; _type?: string } | null;
  hotspot?: unknown;
  crop?: unknown;
  url?: string | null;
  alt?: string | null;
  dimensions?: {
    width?: number | null;
    height?: number | null;
  } | null;
} | null;

export type SanityMediaField = {
  mediaType?: "image" | "video" | null;
  image?: SanityImageProjection;
  vimeoUrl?: string | null;
  poster?: SanityImageProjection;
  mobilePoster?: SanityImageProjection;
} | null;

export type ResolvedMedia = {
  media: HomepageMedia;
  videoId?: string;
};

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The image object is a valid source for the image-url builder. */
export function sanityImageSource(
  image: SanityImageProjection,
): SanityImageSource | null {
  return image?.asset?._ref ? (image as SanityImageSource) : null;
}

/** Resolve a Sanity image projection to HomepageMedia with optional fallback. */
export function resolveSanityImage(
  image: SanityImageProjection | undefined,
  fallback: HomepageMedia,
  width = 1920,
): HomepageMedia {
  if (!image) {
    return fallback;
  }

  let src = clean(image.url ?? undefined);
  const source = sanityImageSource(image);
  if (source) {
    try {
      src = urlForImage(source).width(width).auto("format").url();
    } catch {
      // Keep raw asset URL when the builder fails.
    }
  }

  if (!src) {
    return fallback;
  }

  return {
    src,
    alt: clean(image.alt) ?? fallback.alt,
    width: image.dimensions?.width ?? fallback.width,
    height: image.dimensions?.height ?? fallback.height,
  };
}

/**
 * Resolve a reusable mediaField to HomepageMedia and optional Vimeo video ID.
 * Falls back to the provided base media when CMS data is incomplete.
 */
export function resolveSanityMedia(
  field: SanityMediaField | undefined,
  fallback: HomepageMedia,
  options?: { width?: number; preferMobilePoster?: boolean },
): ResolvedMedia {
  if (!field) {
    return { media: fallback };
  }

  // Incomplete CMS rows may omit mediaType while still carrying an image/video.
  // Prefer the explicit type; otherwise infer so we do not fall back to local
  // architecture placeholders when Studio media is present.
  const mediaType: "image" | "video" | null =
    field.mediaType ??
    (field.vimeoUrl
      ? "video"
      : field.image?.asset?._ref || field.image?.url
        ? "image"
        : null);

  if (!mediaType) {
    return { media: fallback };
  }

  if (mediaType === "video") {
    const videoId = extractVimeoId(field.vimeoUrl ?? undefined);
    const posterSource =
      options?.preferMobilePoster && field.mobilePoster
        ? field.mobilePoster
        : field.poster ?? field.image;

    const media = resolveSanityImage(posterSource, fallback, options?.width);

    if (!videoId) {
      return { media };
    }

    return { media, videoId };
  }

  return {
    media: resolveSanityImage(field.image, fallback, options?.width),
  };
}

/** GROQ fragment for projecting Sanity images with CDN metadata. */
export const sanityImageProjection = `{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}`;

/** GROQ fragment for projecting the reusable mediaField object. */
export const sanityMediaProjection = `{
  mediaType,
  vimeoUrl,
  image${sanityImageProjection},
  poster${sanityImageProjection},
  mobilePoster${sanityImageProjection}
}`;

/** GROQ fragment for the Work tile media object. */
export const sanityWorkMediaProjection = `{
  mediaType,
  vimeoUrl,
  externalVideoUrl,
  videoAlt,
  duration,
  image${sanityImageProjection},
  poster${sanityImageProjection},
  slideshowAlt,
  slideshowInterval,
  "slideshowImages": slideshowImages[]${sanityImageProjection}
}`;

/** GROQ fragment for localized string/text objects. */
export const localizedStringProjection = `{ de, en }`;

export const localizedTextProjection = `{ de, en }`;

/** GROQ fragment for CTA objects. */
export const ctaProjection = `{
  label${localizedStringProjection},
  href
}`;
