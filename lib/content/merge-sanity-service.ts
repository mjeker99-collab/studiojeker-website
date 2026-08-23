import type { ServicePageContent } from "@/types/service-page";
import type { SanityService } from "@/lib/sanity/service";
import { resolveSanityImage } from "@/lib/sanity/media";

/**
 * Pure merge of Sanity Service document → frontend Service content.
 * Only hero media is CMS-driven in this iteration — all other content stays local.
 * Safe for client and server. Does not fetch Sanity.
 */
export function mergeSanityService(
  base: ServicePageContent,
  doc: SanityService | null | undefined,
): ServicePageContent {
  if (!doc) {
    return base;
  }

  const hasHeroImage = Boolean(
    doc.heroImage?.asset?._ref || doc.heroImage?.url,
  );
  if (!hasHeroImage) {
    return base;
  }

  return {
    ...base,
    hero: {
      ...base.hero,
      media: resolveSanityImage(doc.heroImage, base.hero.media),
    },
  };
}
