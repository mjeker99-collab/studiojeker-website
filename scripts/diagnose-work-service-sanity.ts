/**
 * Diagnose Work + Service Sanity merge vs local fallbacks.
 * Run: npx tsx scripts/diagnose-work-service-sanity.ts
 */
import { getWorkPageContent } from "../lib/content/work-page";
import { mergeSanityWork } from "../lib/content/merge-sanity-work";
import { fetchSanityWork } from "../lib/sanity/work";
import { getServicePageContent } from "../lib/content/services";
import { mergeSanityService } from "../lib/content/merge-sanity-service";
import { fetchSanityService } from "../lib/sanity/service";
import { servicePageSlugs } from "../types/service-page";

async function main() {
  const workBase = getWorkPageContent("de");
  const workDoc = await fetchSanityWork();
  if (!workDoc) {
    console.log("WORK: fetch returned null");
    process.exit(1);
  }
  const workMerged = mergeSanityWork(workBase, workDoc, "de");

  const workMediaSample = workMerged.categories.flatMap((c) =>
    c.items.map((item) => {
      if (item.media.type === "image") {
        return {
          id: item.id,
          type: "image",
          fromSanity: item.media.src.includes("cdn.sanity.io"),
          src: item.media.src.slice(0, 90),
        };
      }
      if (item.media.type === "video") {
        return {
          id: item.id,
          type: "video",
          src: item.media.src,
          posterFromSanity: item.media.poster.includes("cdn.sanity.io"),
        };
      }
      return {
        id: item.id,
        type: "slideshow",
        fromSanity: item.media.images.some((img) =>
          img.src.includes("cdn.sanity.io"),
        ),
        first: item.media.images[0]?.src.slice(0, 90),
      };
    }),
  );

  console.log(
    JSON.stringify(
      {
        work: {
          docId: workDoc._id,
          heroUsesSanity:
            workMerged.hero.headline === workDoc.heroSection?.headline?.de,
          textUsesSanity:
            workMerged.hero.text === workDoc.heroSection?.text?.de,
          baseHero: workBase.hero.headline,
          mergedHero: workMerged.hero.headline,
          categoryIds: workMerged.categories.map((c) => c.id),
          sanityCategoryIds: (workDoc.categories ?? []).map(
            (c) => c.categoryId,
          ),
          duplicateCategoryIds: (() => {
            const ids = workMerged.categories.map((c) => c.id);
            return ids.filter((id, i) => ids.indexOf(id) !== i);
          })(),
          mediaSample: workMediaSample,
        },
      },
      null,
      2,
    ),
  );

  for (const slug of servicePageSlugs) {
    const base = getServicePageContent(slug, "de");
    const doc = await fetchSanityService(slug);
    const merged = mergeSanityService(base, doc, "de");
    console.log(
      JSON.stringify(
        {
          service: slug,
          docId: doc?._id ?? null,
          fetchedKeys: doc ? Object.keys(doc) : [],
          heroImageFromSanity: merged.hero.media.src.includes("cdn.sanity.io"),
          headlineFromSanity: merged.hero.headline === doc?.heroHeadline,
          baseHeadline: base.hero.headline,
          mergedHeadline: merged.hero.headline,
          sanityHeroHeadline: doc?.heroHeadline ?? null,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
