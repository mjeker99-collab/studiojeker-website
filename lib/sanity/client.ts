import { createClient, type SanityClient } from "@sanity/client";
import {
  getSanityReadToken,
  sanityApiVersion,
  sanityDataset,
  sanityProjectId,
} from "@/lib/sanity/env";

/**
 * Read-only Sanity client for build-time / server fetches.
 * Public published content needs no token. Optional SANITY_API_READ_TOKEN
 * is server-only and never exposed to the browser bundle.
 *
 * Used only in Server Components / build-time data functions so the static
 * export (`output: "export"`) bakes Sanity content into the HTML. No runtime
 * request to Sanity (or Metanet) happens for a visitor.
 *
 * `useCdn: false` — staging rebuilds must read freshly published CMS data.
 * The API CDN can briefly serve stale documents after a Studio publish,
 * which previously caused the static export to bake outdated Homepage content.
 */
export function getSanityClient(): SanityClient {
  return createClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: sanityApiVersion,
    useCdn: false,
    perspective: "published",
    token: getSanityReadToken(),
  });
}
