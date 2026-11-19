import type { HomepageContent, HomepageMedia, HomepageProject } from "@/types/homepage";
import type { WorkProjectItem } from "@/types/work";

export const servicePageSlugs = [
  "business-communication",
  "product-communication",
  "architecture",
  "digital-marketing",
] as const;

export type ServicePageSlug = (typeof servicePageSlugs)[number];

/** Media-type galleries on service landing pages (Work tile pattern). */
export const serviceMediaSectionIds = [
  "photos",
  "videos",
  "visualizations",
  "animations",
] as const;

export type ServiceMediaSectionId = (typeof serviceMediaSectionIds)[number];

export type ServiceMediaSection = {
  id: ServiceMediaSectionId;
  title: string;
  description?: string;
  items: WorkProjectItem[];
};

/** Legacy kit/solutions URLs → current public service URLs */
export const legacyServiceRedirects: Record<string, ServicePageSlug> = {
  "brand-business": "business-communication",
  "products-industry": "product-communication",
  "architecture-real-estate": "architecture",
  "social-digital-marketing": "digital-marketing",
};

export type ServiceSolutionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon:
    | "film"
    | "portrait"
    | "reportage"
    | "internal"
    | "product-photo"
    | "product-film"
    | "viz3d"
    | "animation"
    | "architecture"
    | "drone"
    | "tour"
    | "strategy"
    | "social"
    | "content"
    | "abo";
};

export type ServicePageContent = {
  slug: ServicePageSlug;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    label: string;
    headline: string;
    headlineAccent?: string;
    subheadline: string;
    body: string[];
    primaryCta: { label: string; href: string };
    media: HomepageMedia;
    mobilePoster?: HomepageMedia;
    /** When set, ServiceHero renders a muted Vimeo loop with media as poster. */
    videoId?: string;
  };
  solutions: {
    label: string;
    headline: string;
    items: ServiceSolutionItem[];
  };
  showreel: HomepageContent["showreel"];
  /**
   * Media-type galleries (photos / videos / visualizations / animations).
   * Sections with zero items are omitted from the public page.
   */
  media: {
    label: string;
    headline: string;
    sections: ServiceMediaSection[];
  };
  /**
   * Legacy project teaser grid. Shown only when `media.sections` has no
   * visible items (e.g. Digital Marketing until media galleries are filled).
   */
  projects: {
    label: string;
    headline: string;
    viewAll: { label: string; href: string };
    items: HomepageProject[];
  };
  about: HomepageContent["about"];
  clients: HomepageContent["clients"];
  finalCta: HomepageContent["finalCta"];
  /**
   * Internal preview notes for missing editorial media — never invent copy.
   * Rendered only in development / preview builds.
   */
  missingContent?: string[];
};
