/**
 * Regression checks for Work + Service Sanity merges.
 * Run: npx tsx scripts/test-work-service-merge.ts
 */
import { getWorkPageContent } from "../lib/content/work-page";
import { mergeSanityWork } from "../lib/content/merge-sanity-work";
import { fetchSanityWork } from "../lib/sanity/work";
import { getServicePageContent } from "../lib/content/services";
import { mergeSanityService } from "../lib/content/merge-sanity-service";
import { fetchSanityService } from "../lib/sanity/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workBase = getWorkPageContent("de");
  const workDoc = await fetchSanityWork();
  assert(workDoc?._id === "work", "work singleton id");
  const work = mergeSanityWork(workBase, workDoc!, "de");
  assert(
    work.hero.headline === workDoc!.heroSection?.headline?.de,
    "work hero headline from Sanity",
  );
  const catIds = work.categories.map((c) => c.id);
  assert(new Set(catIds).size === catIds.length, "work category ids unique");
  assert(catIds.includes("digital"), "digital category id present");
  assert(
    work.categories.some((c) =>
      c.items.some((item) =>
        item.media.type === "image"
          ? item.media.src.includes("cdn.sanity.io")
          : item.media.type === "video"
            ? item.media.poster.includes("cdn.sanity.io")
            : item.media.images.some((img) =>
                img.src.includes("cdn.sanity.io"),
              ),
      ),
    ),
    "work media from Sanity CDN",
  );

  const slug = "architecture" as const;
  const serviceBase = getServicePageContent(slug, "de");
  const serviceDoc = await fetchSanityService(slug);
  assert(serviceDoc?._id === "service-architecture", "architecture doc id");
  assert(
    Boolean(serviceDoc?.heroHeadline),
    "service query returns heroHeadline",
  );
  const service = mergeSanityService(serviceBase, serviceDoc, "de");
  assert(
    service.hero.headline === serviceDoc!.heroHeadline,
    "service DE headline from Sanity (not local fallback)",
  );
  assert(
    service.hero.headline !== serviceBase.hero.headline ||
      serviceDoc!.heroHeadline === serviceBase.hero.headline,
    "Sanity headline applied when it differs from local",
  );
  assert(
    service.hero.media.src.includes("cdn.sanity.io"),
    "service hero image from Sanity",
  );

  const serviceEn = mergeSanityService(
    getServicePageContent(slug, "en"),
    serviceDoc,
    "en",
  );
  assert(
    serviceEn.hero.headline === getServicePageContent(slug, "en").hero.headline,
    "EN keeps local headline",
  );
  assert(
    serviceEn.hero.media.src.includes("cdn.sanity.io"),
    "EN still gets Sanity hero image",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        workHero: work.hero.headline,
        workCategoryIds: catIds,
        architectureHeadline: service.hero.headline,
        architectureEnHeadline: serviceEn.hero.headline,
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
