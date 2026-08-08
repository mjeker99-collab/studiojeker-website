"use client";

import { useEffect } from "react";
import type { Locale } from "@/types/i18n";

type DocumentLangProps = {
  locale: Locale;
};

export function DocumentLang({ locale }: DocumentLangProps) {
  useEffect(() => {
    document.documentElement.lang = locale === "de" ? "de" : "en";
  }, [locale]);

  return null;
}
