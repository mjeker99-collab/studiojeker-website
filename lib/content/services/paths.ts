import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import type { ServicePageSlug } from "@/types/service-page";

export function getServicePaths(locale: Locale) {
  return {
    contact: localizePathname("/contact", locale),
    references: localizePathname("/references", locale),
    about: localizePathname("/about", locale),
    /** Abo landing remains under /solutions until that page is built. */
    abo: localizePathname("/solutions/sichtbarkeit-im-abo", locale),
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
