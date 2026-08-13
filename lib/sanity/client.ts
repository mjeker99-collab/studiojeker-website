import { createClient, type SanityClient } from "@sanity/client";
import {
  getSanityReadToken,
  sanityApiVersion,
  sanityDataset,
  sanityProjectId,
} from "@/lib/sanity/env";

/**
 * Read-only Sanity client for future build-time fetches.
 * Not imported by any page yet — keeps current static content unchanged.
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
