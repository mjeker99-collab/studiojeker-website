/**
 * Shared WordPress / ACF-oriented content contracts.
 * These types prepare the frontend for CPT + ACF payloads via REST.
 * They intentionally stay presentation-independent.
 */

export type WpRendered = {
  rendered: string;
};

export type WpMedia = {
  id: number;
  sourceUrl: string;
  altText?: string;
  mediaType?: "image" | "file" | "video";
  mimeType?: string;
  width?: number;
  height?: number;
};

export type WpSeoFields = {
  title?: string;
  description?: string;
  canonical?: string;
  openGraphImageUrl?: string;
  noindex?: boolean;
};

export type WpProject = {
  id: number;
  slug: string;
  locale: string;
  title: string;
  client?: string;
  year?: string;
  competenceCenter?: string;
  shortIntroduction?: string;
  heroMedia?: WpMedia | null;
  servicesProvided?: string[];
  challenge?: string;
  approach?: string;
  result?: string;
  gallery?: WpMedia[];
  video?: WpMedia | null;
  metrics?: Array<{ label: string; value: string }>;
  testimonial?: {
    quote: string;
    name?: string;
    role?: string;
    company?: string;
  } | null;
  relatedProjectIds?: number[];
  featured?: boolean;
  seo?: WpSeoFields;
};

export type WpTeamMember = {
  id: number;
  slug: string;
  locale: string;
  name: string;
  role?: string;
  portrait?: WpMedia | null;
  biography?: string;
  specialties?: string[];
  contactEmail?: string;
  sortOrder?: number;
};

export type WpService = {
  id: number;
  slug: string;
  locale: string;
  title: string;
  competenceCenter?: string;
  introduction?: string;
  body?: string;
  media?: WpMedia[];
  relatedProjectIds?: number[];
  ctaLabel?: string;
  ctaHref?: string;
  seo?: WpSeoFields;
};

export type WpClient = {
  id: number;
  slug: string;
  locale: string;
  companyName: string;
  logo?: WpMedia | null;
  website?: string;
  featured?: boolean;
  sortOrder?: number;
};

export type WpVisibilitySubscription = {
  id: number;
  slug: string;
  locale: string;
  headline?: string;
  introduction?: string;
  benefits?: string[];
  process?: Array<{ title: string; body?: string }>;
  packages?: Array<{
    name: string;
    features?: string[];
    /** Optional for future use. Must not be rendered in V1. */
    price?: string;
  }>;
  ctaLabel?: string;
  ctaHref?: string;
  testimonial?: {
    quote: string;
    name?: string;
    role?: string;
    company?: string;
  } | null;
  seo?: WpSeoFields;
};

export type WpSiteSettings = {
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: Array<{ label: string; href: string }>;
  footerContent?: string;
  globalCtaLabel?: string;
  globalCtaHref?: string;
  featuredClientIds?: number[];
};
