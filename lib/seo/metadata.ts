import type { Metadata } from "next";
import type { Locale } from "@/types/i18n";
import type { WpSeoFields } from "@/types/wordpress";
import { localizePathname } from "@/lib/i18n/config";
import { isStagingSite, siteConfig } from "@/lib/site";

type BuildMetadataOptions = {
  locale: Locale;
  pathname?: string;
  title?: string;
  description?: string;
  wordpressSeo?: WpSeoFields;
  /** Absolute or site-relative Open Graph image path. */
  ogImagePath?: string;
  /**
   * When DE/EN use different pathnames (translated slugs), pass both here
   * so hreflang alternates stay correct.
   */
  languageAlternates?: { de: string; en: string };
  /**
   * Omit the English hreflang alternate (e.g. when `/en/…` is only a
   * noindex placeholder and must not be advertised as a language alternate).
   * Still emits `de-CH` and `x-default`.
   */
  omitEnglishAlternate?: boolean;
  /**
   * Placeholder / incomplete pages: `noindex, follow`.
   * Staging builds still force `noindex, nofollow` via `isStagingSite()`.
   */
  noindex?: boolean;
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
  languageAlternates,
  omitEnglishAlternate = false,
  noindex = false,
}: BuildMetadataOptions): Metadata {
  const localizedPath = languageAlternates
    ? languageAlternates[locale]
    : localizePathname(pathname, locale);
  const canonicalPath = wordpressSeo?.canonical || localizedPath;
  const pageTitle = wordpressSeo?.title || title || siteConfig.name;
  const pageDescription =
    wordpressSeo?.description || description || siteConfig.positioning;

  const dePath = languageAlternates?.de ?? localizePathname(pathname, "de");
  const enPath = languageAlternates?.en ?? localizePathname(pathname, "en");

  const languages: Record<string, string> = {
    "de-CH": absoluteUrl(dePath),
    "x-default": absoluteUrl(dePath),
  };
  if (!omitEnglishAlternate) {
    languages.en = absoluteUrl(enPath);
  }

  const ogImage =
    wordpressSeo?.openGraphImageUrl ||
    ogImagePath ||
    siteConfig.defaultOgImage.path;
  const ogImageAbsolute = ogImage.startsWith("http")
    ? ogImage
    : absoluteUrl(ogImage);

  const robots = isStagingSite()
    ? { index: false, follow: false }
    : noindex
      ? { index: false, follow: true }
      : wordpressSeo?.noindex
        ? { index: false, follow: false }
        : { index: true, follow: true };

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
    robots,
  };
}
