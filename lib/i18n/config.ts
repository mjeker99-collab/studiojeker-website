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
