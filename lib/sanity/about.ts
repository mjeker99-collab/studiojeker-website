import groq from "groq";
import { getSanityClient } from "@/lib/sanity/client";
import {
  sanityImageProjection,
  type SanityImageProjection,
} from "@/lib/sanity/media";

/** Deterministic About singleton ID (matches Studio desk structure). */
export const ABOUT_DOCUMENT_ID = "about";

export type SanityAboutTeamMember = {
  _key?: string;
  name?: string | null;
  role?: string | null;
  portrait?: SanityImageProjection;
  isPlaceholder?: boolean | null;
} | null;

export type SanityAboutValueItem = {
  _key?: string;
  title?: string | null;
  description?: string | null;
} | null;

export type SanityAboutFact = {
  _key?: string;
  value?: string | null;
  label?: string | null;
} | null;

export type SanityAboutServiceItem = {
  _key?: string;
  title?: string | null;
  description?: string | null;
} | null;

/**
 * Published About singleton — field names match `studio/schemaTypes/about.ts`.
 * Monolingual (German-primary) strings; images include asset, crop, hotspot, alt.
 */
export type SanityAbout = {
  _id?: string | null;
  heroLabel?: string | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  heroIntroText?: string | null;
  heroCtaLabel?: string | null;
  heroImage?: SanityImageProjection;
  valuesLabel?: string | null;
  valuesItems?: SanityAboutValueItem[] | null;
  teamLabel?: string | null;
  teamHeadline?: string | null;
  teamIntroduction?: string | null;
  teamFeatureImage?: SanityImageProjection;
  teamMembers?: SanityAboutTeamMember[] | null;
  facts?: SanityAboutFact[] | null;
  approachLabel?: string | null;
  approachHeadline?: string | null;
  approachSubheadline?: string | null;
  approachText?: string | null;
  approachCtaLabel?: string | null;
  approachImage?: SanityImageProjection;
  servicesLabel?: string | null;
  servicesHeadline?: string | null;
  servicesItems?: SanityAboutServiceItem[] | null;
  clientsLabel?: string | null;
  ctaHeadline?: string | null;
  ctaText?: string | null;
  ctaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/**
 * Published About singleton projection.
 * Keep in sync with `public/api/about-page.php`.
 */
export const aboutQuery = groq`*[_id == $id && _type == "about"][0]{
  _id,
  heroLabel,
  heroHeadline,
  heroSubheadline,
  heroIntroText,
  heroCtaLabel,
  heroImage${sanityImageProjection},
  valuesLabel,
  valuesItems[]{
    _key,
    title,
    description
  },
  teamLabel,
  teamHeadline,
  teamIntroduction,
  teamFeatureImage${sanityImageProjection},
  teamMembers[]{
    _key,
    name,
    role,
    isPlaceholder,
    portrait${sanityImageProjection}
  },
  facts[]{
    _key,
    value,
    label
  },
  approachLabel,
  approachHeadline,
  approachSubheadline,
  approachText,
  approachCtaLabel,
  approachImage${sanityImageProjection},
  servicesLabel,
  servicesHeadline,
  servicesItems[]{
    _key,
    title,
    description
  },
  clientsLabel,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription
}`;

/**
 * Fetch the published About singleton at build time.
 * Returns null when Sanity is unreachable or the document is missing.
 */
export async function fetchSanityAbout(): Promise<SanityAbout | null> {
  try {
    const client = getSanityClient();
    const doc = await client.fetch<SanityAbout | null>(aboutQuery, {
      id: ABOUT_DOCUMENT_ID,
    });
    return doc?._id ? doc : null;
  } catch {
    return null;
  }
}
