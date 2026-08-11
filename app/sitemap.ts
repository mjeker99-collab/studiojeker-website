import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/work",
  "/contact",
  "/services/digital-marketing",
  "/services/business-communication",
  "/services/product-communication",
  "/services/architecture",
  "/impressum",
  "/datenschutz",
] as const;

function absolute(path: string): string {
  return `${siteConfig.getUrl()}${path === "/" ? "" : path}`;
}

/**
 * Production sitemap — DE (`/`) and EN (`/en/…`) public pages only.
 * Insights omitted until real content is published.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    const deUrl = absolute(path);
    const enUrl = absolute(path === "/" ? "/en" : `/en${path}`);

    entries.push({
      url: deUrl,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: {
          "de-CH": deUrl,
          en: enUrl,
          "x-default": deUrl,
        },
      },
    });

    entries.push({
      url: enUrl,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 0.9 : 0.6,
      alternates: {
        languages: {
          "de-CH": deUrl,
          en: enUrl,
          "x-default": deUrl,
        },
      },
    });
  }

  return entries;
}
