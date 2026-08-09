import type { HomepageContent, HomepageMedia, HomepageProject } from "@/types/homepage";

export const servicePageSlugs = [
  "brand-business",
  "products-industry",
  "architecture-real-estate",
  "social-digital-marketing",
] as const;

export type ServicePageSlug = (typeof servicePageSlugs)[number];

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
  };
  solutions: {
    label: string;
    headline: string;
    items: ServiceSolutionItem[];
  };
  showreel: HomepageContent["showreel"];
  projects: {
    label: string;
    headline: string;
    viewAll: { label: string; href: string };
    items: HomepageProject[];
  };
  about: HomepageContent["about"];
  clients: HomepageContent["clients"];
  finalCta: HomepageContent["finalCta"];
};
