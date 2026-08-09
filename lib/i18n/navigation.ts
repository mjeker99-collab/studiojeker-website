import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";

export type NavItem = {
  id: "about" | "services" | "work" | "insights" | "contact";
  href: string;
};

/**
 * Homepage-master navigation (visual SSoT).
 * Insights is reserved in IA/URL space; content page not implemented in V1.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { id: "about", href: localizePathname("/about", locale) },
    { id: "services", href: localizePathname("/solutions", locale) },
    { id: "work", href: localizePathname("/references", locale) },
    { id: "insights", href: localizePathname("/insights", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

export function getContactHref(locale: Locale): string {
  return localizePathname("/contact", locale);
}
