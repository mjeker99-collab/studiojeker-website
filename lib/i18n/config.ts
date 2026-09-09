import type { Locale } from "@/types/i18n";
import { locales } from "@/types/i18n";

export const defaultLocale: Locale = "de";

export const localeLabels: Record<Locale, string> = {
  de: "DE",
  en: "EN",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Public pathname helpers for Polylang-compatible routing:
 * German (primary) at `/`, English (secondary) at `/en/...`.
 */
export function getLocaleFromPathname(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }

  return defaultLocale;
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") {
    return "/";
  }

  if (pathname.startsWith("/en/")) {
    const stripped = pathname.slice(3);
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }

  return pathname || "/";
}

export function localizePathname(pathname: string, locale: Locale): string {
  const normalized = stripLocalePrefix(pathname);

  if (locale === defaultLocale) {
    return normalized;
  }

  if (normalized === "/") {
    return "/en";
  }

  return `/en${normalized}`;
}

/**
 * Paths whose public slug differs by locale (translated URLs).
 * DE remains unprefixed (project language logic — no `/de` prefix).
 */
const translatedPathPairs: ReadonlyArray<{ de: string; en: string }> = [
  { de: "/content-abo", en: "/content-subscription" },
];

function normalizePath(pathname: string): string {
  const stripped = stripLocalePrefix(pathname);
  if (stripped.length > 1 && stripped.endsWith("/")) {
    return stripped.slice(0, -1);
  }
  return stripped || "/";
}

/** Locale-correct path for the Content-Abo / Visibility Subscription landing page. */
export function getAboPath(locale: Locale): string {
  return localizePathname(
    locale === "en" ? "/content-subscription" : "/content-abo",
    locale,
  );
}

/**
 * Resolve the sibling locale URL, including translated slugs
 * (e.g. `/content-abo` ↔ `/en/content-subscription`).
 */
export function getAlternateLocalePath(
  pathname: string,
  targetLocale: Locale,
): string {
  const normalized = normalizePath(pathname);

  for (const pair of translatedPathPairs) {
    if (normalized === pair.de || normalized === pair.en) {
      return localizePathname(
        targetLocale === "en" ? pair.en : pair.de,
        targetLocale,
      );
    }
  }

  return localizePathname(normalized, targetLocale);
}
