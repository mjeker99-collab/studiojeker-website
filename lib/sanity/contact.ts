import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  editorialColorProjection,
  type SanityEditorialColor,
} from "@/lib/sanity/editorial-color";
import { allEnabledClientLogosProjection } from "@/lib/sanity/clients";
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

/** Deterministic Contact singleton ID (matches Studio desk structure). */
export const CONTACT_DOCUMENT_ID = "contact";

export type SanityContactClientRef = {
  _id?: string;
  name?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  logo?: SanityImageProjection;
} | null;

export type SanityContact = {
  _id?: string | null;
  heroSection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    headlineHighlightText?: SanityLocalizedString;
    headlineColor?: SanityEditorialColor;
    headlineHighlightColor?: SanityEditorialColor;
    subheadline?: SanityLocalizedText;
    subheadlineColor?: SanityEditorialColor;
    ctaLabel?: SanityLocalizedString;
    media?: SanityMediaField;
  } | null;
  detailsSection?: {
    addressLabel?: SanityLocalizedString;
    phoneLabel?: SanityLocalizedString;
    emailLabel?: SanityLocalizedString;
  } | null;
  secondarySection?: {
    label?: SanityLocalizedString;
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    ctaLabel?: SanityLocalizedString;
  } | null;
  formSection?: {
    nameLabel?: SanityLocalizedString;
    companyLabel?: SanityLocalizedString;
    emailLabel?: SanityLocalizedString;
    phoneLabel?: SanityLocalizedString;
    messageLabel?: SanityLocalizedString;
    submitLabel?: SanityLocalizedString;
    privacyNote?: SanityLocalizedString;
    privacyLinkLabel?: SanityLocalizedString;
    successMessage?: SanityLocalizedString;
    errorMessage?: SanityLocalizedString;
    sendingMessage?: SanityLocalizedString;
  } | null;
  clientsSection?: {
    label?: SanityLocalizedString;
    logos?: SanityContactClientRef[] | null;
  } | null;
  finalCtaSection?: {
    headline?: SanityLocalizedString;
    text?: SanityLocalizedText;
    ctaLabel?: SanityLocalizedString;
  } | null;
  seoSection?: {
    title?: SanityLocalizedString;
    description?: SanityLocalizedText;
    ogImage?: SanityImageProjection;
  } | null;
};

/**
 * Published Contact singleton projection.
 * Keep in sync with `public/api/contact-page.php`.
 */
export const contactQuery = groq`*[_id == $id && _type == "contact"][0]{
  _id,
  heroSection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    headlineHighlightText${localizedStringProjection},
    headlineColor${editorialColorProjection},
    headlineHighlightColor${editorialColorProjection},
    subheadline${localizedTextProjection},
    subheadlineColor${editorialColorProjection},
    ctaLabel${localizedStringProjection},
    media${sanityMediaProjection}
  },
  detailsSection{
    addressLabel${localizedStringProjection},
    phoneLabel${localizedStringProjection},
    emailLabel${localizedStringProjection}
  },
  secondarySection{
    label${localizedStringProjection},
    headline${localizedStringProjection},
    text${localizedTextProjection},
    ctaLabel${localizedStringProjection}
  },
  formSection{
    nameLabel${localizedStringProjection},
    companyLabel${localizedStringProjection},
    emailLabel${localizedStringProjection},
    phoneLabel${localizedStringProjection},
    messageLabel${localizedStringProjection},
    submitLabel${localizedStringProjection},
    privacyNote${localizedStringProjection},
    privacyLinkLabel${localizedStringProjection},
    successMessage${localizedStringProjection},
    errorMessage${localizedStringProjection},
    sendingMessage${localizedStringProjection}
  },
  clientsSection{
    label${localizedStringProjection},
    "logos": ${allEnabledClientLogosProjection}
  },
  finalCtaSection{
    headline${localizedStringProjection},
    text${localizedTextProjection},
    ctaLabel${localizedStringProjection}
  },
  seoSection{
    title${localizedStringProjection},
    description${localizedTextProjection},
    ogImage${sanityImageProjection}
  }
}`;

/**
 * Fetch the published Contact singleton at build time.
 * Returns null on failure so callers can fall back to local content.
 */
export async function fetchSanityContact(): Promise<SanityContact | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityContact | null>(contactQuery, {
      id: CONTACT_DOCUMENT_ID,
    });
    return doc ?? null;
  } catch (error) {
    console.warn(
      "[sanity] Contact fetch failed — falling back to local content.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
