import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  localizedStringProjection,
  localizedTextProjection,
  sanityImageProjection,
  sanityWorkMediaProjection,
  type SanityImageProjection,
} from "@/lib/sanity/media";
import type {
  SanityLocalizedString,
  SanityLocalizedText,
} from "@/lib/sanity/homepage";

/** Deterministic Work singleton ID (matches Studio desk structure). */
export const WORK_DOCUMENT_ID = "work";

export type SanityWorkMediaField = {
  mediaType?: "image" | "video" | "slideshow" | null;
  image?: SanityImageProjection;
  vimeoUrl?: string | null;
  youtubeUrl?: string | null;
  externalVideoUrl?: string | null;
  videoFile?: { url?: string | null } | null;
  poster?: SanityImageProjection;
  videoAlt?: string | null;
  duration?: string | null;
  videoAutoplay?: boolean | null;
  videoLoop?: boolean | null;
  videoMuted?: boolean | null;
  slideshowImages?: (SanityImageProjection & { caption?: string | null })[] | null;
  slideshowAlt?: string | null;
  slideshowInterval?: number | null;
} | null;

export type SanityWorkProjectItem = {
  itemId?: string | null;
  active?: boolean | null;
  title?: SanityLocalizedString;
  caption?: SanityLocalizedString;
  subtitle?: SanityLocalizedString;
  description?: SanityLocalizedText;
  client?: string | null;
  year?: string | null;
  href?: string | null;
  media?: SanityWorkMediaField;
  sortOrder?: number | null;
};

export type SanityWorkCategory = {
  categoryId?: string | null;
  title?: SanityLocalizedString;
  items?: SanityWorkProjectItem[] | null;
  sortOrder?: number | null;
};

export type SanityWork = {
  _id?: string | null;
  heroSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
  } | null;
  categories?: SanityWorkCategory[] | null;
  finalCtaSection?: {
    headlineBefore?: SanityLocalizedString;
    headlineAccent?: SanityLocalizedString;
    headlineAfter?: SanityLocalizedString;
    text?: SanityLocalizedText;
    ctaLabel?: SanityLocalizedString;
    ctaHref?: string | null;
  } | null;
  seoSection?: {
    title?: SanityLocalizedString;
    description?: SanityLocalizedText;
    ogImage?: SanityImageProjection;
  } | null;
};

export const workPageQuery = groq`*[_id == $id && _type == "work"][0]{
  _id,
  heroSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection}
  },
  categories[]{
    categoryId,
    title${localizedStringProjection},
    sortOrder,
    items[]{
      itemId,
      active,
      title${localizedStringProjection},
      caption${localizedStringProjection},
      subtitle${localizedStringProjection},
      description${localizedTextProjection},
      client,
      year,
      href,
      sortOrder,
      media${sanityWorkMediaProjection}
    }
  },
  finalCtaSection{
    headlineBefore${localizedStringProjection},
    headlineAccent${localizedStringProjection},
    headlineAfter${localizedStringProjection},
    text${localizedTextProjection},
    ctaLabel${localizedStringProjection},
    ctaHref
  },
  seoSection{
    title${localizedStringProjection},
    description${localizedTextProjection},
    ogImage${sanityImageProjection}
  }
}`;

export async function fetchSanityWork(): Promise<SanityWork | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityWork | null>(workPageQuery, {
      id: WORK_DOCUMENT_ID,
    });
    return doc ?? null;
  } catch (error) {
    console.warn(
      "[sanity] Work fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
