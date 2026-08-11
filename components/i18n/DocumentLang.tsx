"use client";

import { useLayoutEffect } from "react";
import type { Locale } from "@/types/i18n";

type DocumentLangProps = {
  locale: Locale;
};

/**
 * Keeps <html lang> in sync with the active SiteChrome locale.
 * Complements the EN layout bootstrap script for client navigations.
 */
export function DocumentLang({ locale }: DocumentLangProps) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale === "de" ? "de" : "en";
  }, [locale]);

  return null;
}
