/**
 * Read-only diagnosis: Sanity published homepage vs frontend merge.
 * Does NOT mutate Sanity. Run: npx tsx scripts/diagnose-sanity-staging-chain.ts
 */
import { getHomepageContent } from "../lib/content/homepage";
import { mergeSanityHomepage } from "../lib/content/merge-sanity-homepage";
import { fetchSanityHomepage } from "../lib/sanity/homepage";

async function main() {
  const fallback = getHomepageContent("de");
  const doc = await fetchSanityHomepage();

  console.log("A) Sanity published document present:", Boolean(doc?._id));
  if (!doc) {
    process.exit(1);
  }

  const merged = mergeSanityHomepage(fallback, doc, "de");

  console.log(
    JSON.stringify(
      {
        B_nextMergeUsesSanity: {
          headlineFromSanity: merged.hero.headline !== fallback.hero.headline,
          headline: merged.hero.headline,
          heroMediaIsCdn: merged.hero.media.src.includes("cdn.sanity.io"),
          heroMediaSrc: merged.hero.media.src,
          showreelMediaIsCdn: merged.showreel.media.src.includes("cdn.sanity.io"),
          showreelVideoId: merged.showreel.videoId ?? null,
        },
        C_deployNote:
          "Staging FTPS must upload a build of current origin/main. Stale re-runs are refused by the tip-of-main guard.",
        D_liveProxyNote:
          "Browser GET /api/homepage.php (no-store) must return this document for instant updates.",
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
