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
 */
export function getSanityClient(): SanityClient {
  return createClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: sanityApiVersion,
    useCdn: true,
    perspective: "published",
    token: getSanityReadToken(),
  });
}
