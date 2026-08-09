"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/types/i18n";
import { localeLabels, localizePathname, stripLocalePrefix } from "@/lib/i18n/config";
import styles from "./LanguageSwitcher.module.css";

type LanguageSwitcherProps = {
  locale: Locale;
  label: string;
  inverse?: boolean;
};

/**
 * Master mockup shows a single locale code (e.g. DE).
 * Clicking switches to the other locale.
 */
export function LanguageSwitcher({
  locale,
  label,
  inverse = false,
}: LanguageSwitcherProps) {
  const pathname = usePathname() || "/";
  const pathWithoutLocale = stripLocalePrefix(pathname);
  const nextLocale: Locale = locale === "de" ? "en" : "de";

  return (
    <div
      className={[styles.switcher, inverse ? styles.inverse : ""].filter(Boolean).join(" ")}
      aria-label={label}
    >
      <Link
        href={localizePathname(pathWithoutLocale, nextLocale)}
        className={styles.link}
        hrefLang={nextLocale === "de" ? "de-CH" : "en"}
        aria-label={`${label}: ${localeLabels[nextLocale]}`}
      >
        {localeLabels[locale]}
      </Link>
    </div>
  );
}
