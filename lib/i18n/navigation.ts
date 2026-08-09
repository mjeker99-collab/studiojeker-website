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
 * Homepage-master navigation (visual SSoT).
 * Services is a dropdown trigger only — no /services overview.
 * Insights remains in IA; page may be a content placeholder until CMS content exists.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { id: "about", href: localizePathname("/about", locale) },
    {
      id: "services",
      hasChildren: true,
    },
    { id: "work", href: localizePathname("/work", locale) },
    { id: "insights", href: localizePathname("/insights", locale) },
    { id: "contact", href: localizePathname("/contact", locale) },
  ];
}

/** Footer NAVIGATION column — no standalone Services entry. */
export function getFooterNav(locale: Locale): NavItem[] {
  return getPrimaryNav(locale).filter(
    (item): item is NavItem & { href: string } =>
      item.id !== "services" && typeof item.href === "string",
  );
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
