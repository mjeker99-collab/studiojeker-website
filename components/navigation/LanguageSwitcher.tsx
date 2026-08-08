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

export function LanguageSwitcher({
  locale,
  label,
  inverse = false,
}: LanguageSwitcherProps) {
  const pathname = usePathname() || "/";
  const pathWithoutLocale = stripLocalePrefix(pathname);

  return (
    <div
      className={[styles.switcher, inverse ? styles.inverse : ""].filter(Boolean).join(" ")}
      aria-label={label}
    >
      <Link
        href={localizePathname(pathWithoutLocale, "de")}
        className={styles.link}
        hrefLang="de-CH"
        aria-current={locale === "de" ? "true" : undefined}
      >
        {localeLabels.de}
      </Link>
      <span className={styles.separator} aria-hidden="true">
        /
      </span>
      <Link
        href={localizePathname(pathWithoutLocale, "en")}
        className={styles.link}
        hrefLang="en"
        aria-current={locale === "en" ? "true" : undefined}
      >
        {localeLabels.en}
      </Link>
    </div>
  );
}
