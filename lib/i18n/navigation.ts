import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";

export type NavItem = {
  id: "solutions" | "references" | "about" | "contact";
  href: string;
};

/**
 * V1 navigation from Developer Kit.
 * Insights is reserved architecturally and omitted until approved.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { id: "solutions", href: localizePathname("/solutions", locale) },
    { id: "references", href: localizePathname("/references", locale) },
    { id: "about", href: localizePathname("/about", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

export function getContactHref(locale: Locale): string {
  return localizePathname("/contact", locale);
}
