/**
 * Live diagnostic: Sanity Work hero image → merge → media src.
 * Run: node --import tsx scripts/diagnose-work-hero-live.mjs
 */
import { getWorkPageContent } from "../lib/content/work-page.ts";
import { mergeSanityWork } from "../lib/content/merge-sanity-work.ts";
import { fetchSanityWork } from "../lib/sanity/work.ts";

async function main() {
  const doc = await fetchSanityWork();
  if (!doc) {
    console.error("No Work document from Sanity");
    process.exit(1);
  }
  const merged = mergeSanityWork(getWorkPageContent("de"), doc, "de");
  const image = doc.heroSection?.image;
  console.log(
    JSON.stringify(
      {
        sanity: {
          id: doc._id ?? null,
          imageRef: image?.asset?._ref ?? null,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt ?? null,
          hasHotspot: Boolean(image?.hotspot),
        },
        merged: {
          hasMedia: Boolean(merged.hero.media?.src),
          src: merged.hero.media?.src ?? null,
          alt: merged.hero.media?.alt ?? null,
          width: merged.hero.media?.width ?? null,
          height: merged.hero.media?.height ?? null,
        },
      },
      null,
      2,
    ),
  );
  if (!merged.hero.media?.src) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
