import createImageUrlBuilder from "@sanity/image-url";
import { sanityDataset, sanityProjectId } from "@/lib/sanity/env";

const builder = createImageUrlBuilder({
  projectId: sanityProjectId,
  dataset: sanityDataset,
});

/**
 * Build CDN URLs for Sanity images (cdn.sanity.io).
 * Scaffold helper — unused by pages until content migration is approved.
 */
export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}
