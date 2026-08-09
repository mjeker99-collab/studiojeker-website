import type { Dictionary, Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";

export type NavItem = {
  id: "about" | "services" | "work" | "insights" | "contact";
  /** Omitted for Services — dropdown trigger only, no overview page. */
  href?: string;
  hasChildren?: boolean;
};

export type ServiceNavLink = {
  id: "business" | "product" | "architecture" | "digital";
  label: string;
  href: string;
};

/**
 * Final primary navigation:
 * ABOUT | SERVICES | WORK | CONTACT | DE
 *
 * Services is a dropdown trigger only — no /services overview.
 * Insights remains routed/available but is not shown in the main nav.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { id: "about", href: localizePathname("/about", locale) },
    {
      id: "services",
      hasChildren: true,
    },
    { id: "work", href: localizePathname("/work", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

/**
 * Footer NAVIGATION column — matches primary IA.
 * No standalone Services overview. Insights omitted for now (route retained).
 */
export function getFooterNav(locale: Locale): Array<NavItem & { href: string }> {
  return [
    { id: "about", href: localizePathname("/about", locale) },
    { id: "work", href: localizePathname("/work", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

export function getServiceNavLinks(
  locale: Locale,
  dictionary: Dictionary,
): ServiceNavLink[] {
  return [
    {
      id: "architecture",
      label: dictionary.footer.architecture,
      href: localizePathname("/services/architecture", locale),
    },
    {
      id: "product",
      label: dictionary.footer.productCommunication,
      href: localizePathname("/services/product-communication", locale),
    },
    {
      id: "business",
      label: dictionary.footer.businessCommunication,
      href: localizePathname("/services/business-communication", locale),
    },
    {
      id: "digital",
      label: dictionary.footer.digitalMarketing,
      href: localizePathname("/services/digital-marketing", locale),
    },
  ];
}

export function getContactHref(locale: Locale): string {
  return localizePathname("/contact", locale);
}
