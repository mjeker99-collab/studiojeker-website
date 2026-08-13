import createImageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { sanityDataset, sanityProjectId } from "@/lib/sanity/env";

const builder = createImageUrlBuilder({
  projectId: sanityProjectId,
  dataset: sanityDataset,
});

/** Build a Sanity CDN image URL builder for the given source. */
export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
