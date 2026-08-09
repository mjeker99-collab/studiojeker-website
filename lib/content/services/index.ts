import type { Locale } from "@/types/i18n";
import {
  servicePageSlugs,
  type ServicePageContent,
  type ServicePageSlug,
} from "@/types/service-page";
import { getArchitectureContent } from "@/lib/content/services/architecture";
import { getBusinessCommunicationContent } from "@/lib/content/services/business";
import { getDigitalMarketingContent } from "@/lib/content/services/digital";
import { getProductCommunicationContent } from "@/lib/content/services/product";

export function isServicePageSlug(value: string): value is ServicePageSlug {
  return (servicePageSlugs as readonly string[]).includes(value);
}

export function getServicePageContent(
  slug: ServicePageSlug,
  locale: Locale,
): ServicePageContent {
  switch (slug) {
    case "brand-business":
      return getBusinessCommunicationContent(locale);
    case "products-industry":
      return getProductCommunicationContent(locale);
    case "architecture-real-estate":
      return getArchitectureContent(locale);
    case "social-digital-marketing":
      return getDigitalMarketingContent(locale);
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}

export { servicePageSlugs };
export type { ServicePageSlug, ServicePageContent };
