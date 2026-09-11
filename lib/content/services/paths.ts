import type { Locale } from "@/types/i18n";
import { getAboPath, localizePathname } from "@/lib/i18n/config";
import type { ServicePageSlug } from "@/types/service-page";

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
  };
}

export const serviceSlugToPath: Record<ServicePageSlug, string> = {
  "business-communication": "/services/business-communication",
  "product-communication": "/services/product-communication",
  architecture: "/services/architecture",
  "digital-marketing": "/services/digital-marketing",
};
