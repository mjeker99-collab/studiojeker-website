/**
 * Trace Work hero image: raw GROQ → fetch → merge → page resolver.
 * Run: npx tsx scripts/diagnose-work-hero-build-path.mjs
 */
import { getSanityClient } from "../lib/sanity/client.ts";
import {
  WORK_DOCUMENT_ID,
  fetchSanityWork,
  workPageQuery,
} from "../lib/sanity/work.ts";
import { getWorkPageContent } from "../lib/content/work-page.ts";
import { mergeSanityWork } from "../lib/content/merge-sanity-work.ts";
import { getResolvedWorkPageContent } from "../lib/content/work-sanity.ts";

async function main() {
  const client = getSanityClient();
  const raw = await client.fetch(workPageQuery, { id: WORK_DOCUMENT_ID });
  const viaFetch = await fetchSanityWork();
  const merged = mergeSanityWork(getWorkPageContent("de"), viaFetch, "de");
  const resolved = await getResolvedWorkPageContent("de");

  console.log(
    JSON.stringify(
      {
        rawHeroKeys: Object.keys(raw?.heroSection || {}),
        rawImage: raw?.heroSection?.image ?? null,
        fetchImageRef: viaFetch?.heroSection?.image?.asset?._ref ?? null,
        mergedHeroKeys: Object.keys(merged.hero),
        mergedMedia: merged.hero.media ?? null,
        resolvedHeroKeys: Object.keys(resolved.hero),
        resolvedMedia: resolved.hero.media ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
