import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import type { ServicePageSlug } from "@/types/service-page";

export function getServicePaths(locale: Locale) {
  return {
    contact: localizePathname("/contact", locale),
    references: localizePathname("/references", locale),
    about: localizePathname("/about", locale),
    abo: localizePathname("/solutions/sichtbarkeit-im-abo", locale),
    architecture: localizePathname(
      "/solutions/architecture-real-estate",
      locale,
    ),
    product: localizePathname("/solutions/products-industry", locale),
    business: localizePathname("/solutions/brand-business", locale),
    digital: localizePathname("/solutions/social-digital-marketing", locale),
  };
}

export const serviceSlugToPath: Record<ServicePageSlug, string> = {
  "brand-business": "/solutions/brand-business",
  "products-industry": "/solutions/products-industry",
  "architecture-real-estate": "/solutions/architecture-real-estate",
  "social-digital-marketing": "/solutions/social-digital-marketing",
};
