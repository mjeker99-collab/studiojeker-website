import type { Locale } from "@/types/i18n";
import { getAboPath, localizePathname } from "@/lib/i18n/config";
import type { ServicePageSlug } from "@/types/service-page";

/** Locale-aware `/work#anchor` for Service → Work deep links. */
export function workHref(anchor: string, locale: Locale): string {
  return `${localizePathname("/work", locale)}#${anchor}`;
}

export function getServicePaths(locale: Locale) {
  return {
    contact: localizePathname("/contact", locale),
    work: localizePathname("/work", locale),
    about: localizePathname("/about", locale),
    /** Content-Abo landing: DE `/content-abo`, EN `/en/content-subscription`. */
    abo: getAboPath(locale),
    architecture: localizePathname("/services/architecture", locale),
    product: localizePathname("/services/product-communication", locale),
    business: localizePathname("/services/business-communication", locale),
    digital: localizePathname("/services/digital-marketing", locale),
    servicesAnchor: `${localizePathname("/", locale)}#services`,
    workUnternehmensfilme: workHref("unternehmensfilme", locale),
    workBusinessportraits: workHref("businessportraits", locale),
    workEventvideos: workHref("eventvideos", locale),
    workBusiness: workHref("business", locale),
    workProduktfotografie: workHref("produktfotografie", locale),
    workProduktfilme: workHref("produktfilme", locale),
    workProduktanimationen: workHref("produktanimationen", locale),
    work3dVisualisierungen: workHref("3d-visualisierungen", locale),
    workArchitekturvideos: workHref("architekturvideos", locale),
    workArchitecture: workHref("architecture", locale),
    workContentProduction: workHref("content-production", locale),
  };
}

export const serviceSlugToPath: Record<ServicePageSlug, string> = {
  "business-communication": "/services/business-communication",
  "product-communication": "/services/product-communication",
  architecture: "/services/architecture",
  "digital-marketing": "/services/digital-marketing",
};
