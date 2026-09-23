import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  localizedStringProjection,
  localizedTextProjection,
  sanityImageProjection,
  sanityMediaProjection,
  type SanityImageProjection,
  type SanityMediaField,
} from "@/lib/sanity/media";
import type {
  SanityLocalizedString,
  SanityLocalizedText,
} from "@/lib/sanity/homepage";

/** Deterministic KI/AI singleton ID (matches Studio desk structure). */
export const AI_DOCUMENT_ID = "ai";

export type SanityAiCta = {
  label?: SanityLocalizedString;
  href?: string | null;
} | null;

export type SanityAiApplicationItem = {
  _key?: string;
  id?: string | null;
  number?: string | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
} | null;

export type SanityAiProcessStep = {
  _key?: string;
  id?: string | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
} | null;

export type SanityAiTextSection = {
  headline?: SanityLocalizedString;
  text?: SanityLocalizedText;
  media?: SanityMediaField;
  caption?: SanityLocalizedString;
} | null;

export type SanityAiLandscapeBreak = {
  media?: SanityMediaField;
  /** @deprecated Prefer media — kept for older image-only slots. */
  image?: SanityImageProjection;
  caption?: SanityLocalizedString;
} | null;

export type SanityAi = {
  _id?: string | null;
  heroSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    media?: SanityMediaField;
  } | null;
  introSection?: SanityAiTextSection;
  processSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    introduction?: SanityLocalizedText;
    steps?: SanityAiProcessStep[] | null;
  } | null;
  showreelSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityAiCta;
    media?: SanityMediaField;
  } | null;
  applicationsSection?: {
    headline?: SanityLocalizedString;
    items?: SanityAiApplicationItem[] | null;
    media?: SanityMediaField;
    caption?: SanityLocalizedString;
  } | null;
  modelsSection?: SanityAiTextSection;
  experienceSection?: SanityAiTextSection;
  approachSection?: SanityAiTextSection;
  visualMedia?: {
    keyVisual?: SanityImageProjection;
    clayVilla?: SanityImageProjection;
    photoVilla?: SanityImageProjection;
    contentFormats?: SanityImageProjection;
    distributionChannels?: SanityImageProjection;
  } | null;
  landscapeBreaks?: {
    afterAi?: SanityAiLandscapeBreak;
    afterDistribution?: SanityAiLandscapeBreak;
    afterVisibility?: SanityAiLandscapeBreak;
    midApplications?: SanityAiLandscapeBreak;
    afterApplications?: SanityAiLandscapeBreak;
    afterModels?: SanityAiLandscapeBreak;
    afterExperience?: SanityAiLandscapeBreak;
  } | null;
  closingSection?: {
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityAiCta;
  } | null;
  clientsLabel?: SanityLocalizedString;
  seoSection?: {
    title?: SanityLocalizedString;
    description?: SanityLocalizedText;
    ogImage?: SanityImageProjection;
  } | null;
};

const ctaProjection = `{ label${localizedStringProjection}, href }`;

/**
 * Published KI/AI singleton projection.
 * Keep in sync with `public/api/ai-page.php`.
 */
export const aiQuery = groq`*[_id == $id && _type == "ai"][0]{
  _id,
  heroSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    media${sanityMediaProjection}
  },
  introSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    media${sanityMediaProjection},
    caption${localizedStringProjection}
  },
  processSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    introduction${localizedTextProjection},
    steps[]{
      _key,
      id,
      title${localizedStringProjection},
      description${localizedTextProjection}
    }
  },
  showreelSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  applicationsSection{
    headline${localizedStringProjection},
    items[]{
      _key,
      id,
      number,
      title${localizedStringProjection},
      description${localizedTextProjection}
    },
    media${sanityMediaProjection},
    caption${localizedStringProjection}
  },
  modelsSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    media${sanityMediaProjection},
    caption${localizedStringProjection}
  },
  experienceSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    media${sanityMediaProjection},
    caption${localizedStringProjection}
  },
  approachSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    media${sanityMediaProjection},
    caption${localizedStringProjection}
  },
  visualMedia{
    keyVisual${sanityImageProjection},
    clayVilla${sanityImageProjection},
    photoVilla${sanityImageProjection},
    contentFormats${sanityImageProjection},
    distributionChannels${sanityImageProjection}
  },
  landscapeBreaks{
    afterAi{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    afterDistribution{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    afterVisibility{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    midApplications{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    afterApplications{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    afterModels{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    },
    afterExperience{
      media${sanityMediaProjection},
      image${sanityImageProjection},
      caption${localizedStringProjection}
    }
  },
  closingSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection}
  },
  clientsLabel${localizedStringProjection},
  seoSection{
    title${localizedStringProjection},
    description${localizedTextProjection},
    ogImage${sanityImageProjection}
  }
}`;

/**
 * Fetch the published KI/AI singleton at build time.
 * Returns null when Sanity is unreachable or the document is missing.
 */
export async function fetchSanityAi(): Promise<SanityAi | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityAi | null>(aiQuery, {
      id: AI_DOCUMENT_ID,
    });
    return doc?._id ? doc : null;
  } catch (error) {
    console.warn(
      "[sanity] KI/AI fetch failed — page will render Sanity-empty shell.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
