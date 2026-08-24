import { sanityImageProjection } from "@/lib/sanity/media";

/**
 * All published Client / Logo documents that are enabled and have a logo asset.
 *
 * Intentionally uncapped: no [0...N], slice, or limit. Order is sortOrder only.
 * Used by Homepage and Contact live/build queries so newly published logos appear
 * without editing a curated reference array.
 */
export const allEnabledClientLogosProjection = `*[_type == "client" && active != false && defined(logo.asset)] | order(coalesce(sortOrder, 999999) asc) {
  _id,
  name,
  websiteUrl,
  sortOrder,
  active,
  logo${sanityImageProjection}
}`;
