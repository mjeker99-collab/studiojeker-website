import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { aboLanguageAlternates } from "@/lib/content/abo-page";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

const PUBLIC_PATHS = [
  "/",
  "/about/",
  "/work/",
  "/contact/",
  "/services/digital-marketing/",
  "/services/business-communication/",
  "/services/product-communication/",
  "/services/architecture/",
  "/impressum/",
  "/datenschutz/",
] as const;

function absolute(path: string): string {
  return `${siteConfig.getUrl()}${path === "/" ? "" : path}`;
}

function withTrailingSlash(path: string): string {
  if (path === "/") return path;
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Production sitemap — DE (`/`) and EN (`/en/…`) public pages only.
 * Paths use trailing slashes to match static export (`trailingSlash: true`).
 * Insights omitted until real content is published.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    const deUrl = absolute(path);
    const enUrl = absolute(path === "/" ? "/en/" : `/en${path}`);

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

  const aboDe = absolute(withTrailingSlash(aboLanguageAlternates.de));
  const aboEn = absolute(withTrailingSlash(aboLanguageAlternates.en));

  entries.push({
    url: aboDe,
    changeFrequency: "monthly",
    priority: 0.8,
    alternates: {
      languages: {
        "de-CH": aboDe,
        en: aboEn,
        "x-default": aboDe,
      },
    },
  });

  entries.push({
    url: aboEn,
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: {
      languages: {
        "de-CH": aboDe,
        en: aboEn,
        "x-default": aboDe,
      },
    },
  });

  // German AGB only — no English terms page yet.
  const agbDe = absolute("/agb/");
  entries.push({
    url: agbDe,
    changeFrequency: "yearly",
    priority: 0.3,
    alternates: {
      languages: {
        "de-CH": agbDe,
        "x-default": agbDe,
      },
    },
  });

  return entries;
}
