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

/** Deterministic Content-Abo singleton ID (matches Studio desk structure). */
export const ABO_DOCUMENT_ID = "abo";

export type SanityAboBenefitItem = {
  _key?: string;
  id?: string | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
  sortOrder?: number | null;
} | null;

export type SanityAboProcessStep = {
  _key?: string;
  id?: string | null;
  number?: string | null;
  title?: SanityLocalizedString;
  description?: SanityLocalizedText;
} | null;

export type SanityAboScopeItem = {
  _key?: string;
  label?: SanityLocalizedString;
} | null;

export type SanityAboCta = {
  label?: SanityLocalizedString;
  href?: string | null;
} | null;

export type SanityAbo = {
  _id?: string | null;
  heroSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityAboCta;
    media?: SanityMediaField;
  } | null;
  problemSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    highlight?: SanityLocalizedText;
  } | null;
  benefitsSection?: {
    items?: SanityAboBenefitItem[] | null;
  } | null;
  processSection?: {
    headline?: SanityLocalizedString;
    steps?: SanityAboProcessStep[] | null;
  } | null;
  scopeSection?: {
    headline?: SanityLocalizedString;
    introduction?: SanityLocalizedText;
    items?: SanityAboScopeItem[] | null;
    closing?: SanityLocalizedText;
    highlight?: SanityLocalizedText;
  } | null;
  showreelSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityAboCta;
    media?: SanityMediaField;
  } | null;
  closingSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    cta?: SanityAboCta;
  } | null;
  seoSection?: {
    title?: SanityLocalizedString;
    description?: SanityLocalizedText;
    ogImage?: SanityImageProjection;
  } | null;
};

const ctaProjection = `{ label${localizedStringProjection}, href }`;

/**
 * Published Content-Abo singleton projection.
 * Keep in sync with `public/api/abo-page.php`.
 */
export const aboQuery = groq`*[_id == $id && _type == "abo"][0]{
  _id,
  heroSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  problemSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    highlight${localizedTextProjection}
  },
  benefitsSection{
    items[]{
      _key,
      id,
      title${localizedStringProjection},
      description${localizedTextProjection},
      sortOrder
    }
  },
  processSection{
    headline${localizedStringProjection},
    steps[]{
      _key,
      id,
      number,
      title${localizedStringProjection},
      description${localizedTextProjection}
    }
  },
  scopeSection{
    headline${localizedStringProjection},
    introduction${localizedTextProjection},
    items[]{
      _key,
      label${localizedStringProjection}
    },
    closing${localizedTextProjection},
    highlight${localizedTextProjection}
  },
  showreelSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection},
    media${sanityMediaProjection}
  },
  closingSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    cta${ctaProjection}
  },
  seoSection{
    title${localizedStringProjection},
    description${localizedTextProjection},
    ogImage${sanityImageProjection}
  }
}`;

/**
 * Fetch the published Content-Abo singleton at build time.
 * Returns null on failure so callers can fall back to local content.
 */
export async function fetchSanityAbo(): Promise<SanityAbo | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityAbo | null>(aboQuery, {
      id: ABO_DOCUMENT_ID,
    });
    return doc ?? null;
  } catch (error) {
    console.warn(
      "[sanity] Content-Abo fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
