import type { Metadata } from "next";
import type { Locale } from "@/types/i18n";
import type { WpSeoFields } from "@/types/wordpress";
import { localizePathname } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site";

type BuildMetadataOptions = {
  locale: Locale;
  pathname?: string;
  title?: string;
  description?: string;
  wordpressSeo?: WpSeoFields;
  /** Absolute or site-relative Open Graph image path. */
  ogImagePath?: string;
};

function absoluteUrl(pathname: string): string {
  return `${siteConfig.getUrl()}${pathname === "/" ? "" : pathname}`;
}

/**
 * Metadata foundation compatible with DE/EN routing and future WP SEO fields.
 * Uses approved page SEO copy from content modules — does not invent copy.
 */
export function buildPageMetadata({
  locale,
  pathname = "/",
  title,
  description,
  wordpressSeo,
  ogImagePath,
}: BuildMetadataOptions): Metadata {
  const localizedPath = localizePathname(pathname, locale);
  const canonicalPath = wordpressSeo?.canonical || localizedPath;
  const pageTitle = wordpressSeo?.title || title || siteConfig.name;
  const pageDescription =
    wordpressSeo?.description || description || siteConfig.positioning;

  const languages: Record<string, string> = {
    "de-CH": absoluteUrl(localizePathname(pathname, "de")),
    en: absoluteUrl(localizePathname(pathname, "en")),
    "x-default": absoluteUrl(localizePathname(pathname, "de")),
  };

  const ogImage =
    wordpressSeo?.openGraphImageUrl ||
    ogImagePath ||
    siteConfig.defaultOgImage.path;
  const ogImageAbsolute = ogImage.startsWith("http")
    ? ogImage
    : absoluteUrl(ogImage);

  return {
    title: {
      // Use approved SEO titles exactly — do not append the layout brand template.
      absolute: pageTitle,
    },
    description: pageDescription,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale === "de" ? "de_CH" : "en_US",
      url: absoluteUrl(localizedPath),
      siteName: siteConfig.name,
      title: pageTitle,
      description: pageDescription,
      images: [
        {
          url: ogImageAbsolute,
          width: siteConfig.defaultOgImage.width,
          height: siteConfig.defaultOgImage.height,
          alt: siteConfig.defaultOgImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [ogImageAbsolute],
    },
    robots: wordpressSeo?.noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}
