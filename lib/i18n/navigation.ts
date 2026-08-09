import type { Dictionary, Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";

export type NavItem = {
  id: "about" | "services" | "work" | "insights" | "contact";
  href: string;
  hasChildren?: boolean;
};

export type ServiceNavLink = {
  id: "business" | "product" | "architecture" | "digital";
  label: string;
  href: string;
};

/**
 * Homepage-master navigation (visual SSoT).
 * Insights is reserved in IA/URL space; content page not implemented in V1.
 * Services is a menu trigger → homepage #services + four direct children.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { id: "about", href: localizePathname("/about", locale) },
    {
      id: "services",
      href: `${localizePathname("/", locale)}#services`,
      hasChildren: true,
    },
    { id: "work", href: localizePathname("/references", locale) },
    { id: "insights", href: localizePathname("/insights", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

export function getServiceNavLinks(
  locale: Locale,
  dictionary: Dictionary,
): ServiceNavLink[] {
  return [
    {
      id: "business",
      label: dictionary.footer.businessCommunication,
      href: localizePathname("/services/business-communication", locale),
    },
    {
      id: "product",
      label: dictionary.footer.productCommunication,
      href: localizePathname("/services/product-communication", locale),
    },
    {
      id: "architecture",
      label: dictionary.footer.architecture,
      href: localizePathname("/services/architecture", locale),
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
