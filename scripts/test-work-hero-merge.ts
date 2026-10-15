/**
 * Work hero merge checks (optional Sanity image, no stock fallback).
 * Run: npx tsx scripts/test-work-hero-merge.ts
 */
import { getWorkPageContent } from "../lib/content/work-page";
import { mergeSanityWork } from "../lib/content/merge-sanity-work";
import { fetchSanityWork } from "../lib/sanity/work";
import type { SanityWork } from "../lib/sanity/work";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const baseDe = getWorkPageContent("de");
  const baseEn = getWorkPageContent("en");

  assert(baseDe.hero.headline === "Ausgewählte Arbeitsproben", "DE local headline");
  assert(baseDe.hero.label === "Work", "DE local label");
  assert(
    baseDe.hero.text.includes("Strategie, Content und Design"),
    "DE local intro",
  );
  assert(baseDe.hero.media === undefined, "local content has no stock hero image");
  assert(baseEn.hero.headline === "Selected work samples", "EN local headline");
  assert(baseEn.hero.media === undefined, "EN local has no stock hero image");

  const emptyDoc: SanityWork = {
    _id: "work",
    heroSection: {
      label: { de: "Work", en: "Work" },
      headline: { de: "Ausgewählte Arbeitsproben", en: "Selected work samples" },
      text: {
        de: "Strategie, Content und Design – bewegt, inszeniert und wirksam über alle Kanäle.",
        en: "Strategy, content and design — moved, staged and effective across every channel.",
      },
      image: null,
    },
  };

  const withoutImage = mergeSanityWork(baseDe, emptyDoc, "de");
  assert(withoutImage.hero.media === undefined, "null image → no media");
  assert(withoutImage.hero.headline === "Ausgewählte Arbeitsproben", "headline merge");
  assert(withoutImage.hero.label === "Work", "label merge");

  const withImage = mergeSanityWork(
    baseDe,
    {
      ...emptyDoc,
      heroSection: {
        ...emptyDoc.heroSection,
        image: {
          _type: "image",
          asset: { _ref: "image-abc123", _type: "reference" },
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/hero.jpg",
          alt: "Work hero",
          hotspot: { x: 0.4, y: 0.35, height: 0.3, width: 0.3 },
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
          dimensions: { width: 1600, height: 1600 },
        },
      },
    },
    "de",
  );
  assert(Boolean(withImage.hero.media?.src), "image present when Sanity has asset");
  assert(
    withImage.hero.media?.src.includes("cdn.sanity.io") ||
      withImage.hero.media?.src.includes("sanity"),
    "hero src from Sanity",
  );
  assert(withImage.hero.media?.alt === "Work hero", "hero alt from Sanity");

  const live = await fetchSanityWork();
  if (live?._id === "work") {
    const merged = mergeSanityWork(baseDe, live, "de");
    assert(
      merged.hero.headline === (live.heroSection?.headline?.de || baseDe.hero.headline),
      "live headline merge",
    );
    if (live.heroSection?.image?.asset?._ref || live.heroSection?.image?.url) {
      assert(
        Boolean(merged.hero.media?.src),
        "live hero image resolved when uploaded",
      );
    } else {
      assert(
        merged.hero.media === undefined,
        "live hero media omitted before upload",
      );
    }
    console.log("Live Sanity Work hero:", {
      headline: merged.hero.headline,
      hasImage: Boolean(merged.hero.media?.src),
      categories: merged.categories.length,
      tiles: merged.categories.reduce((n, c) => n + c.items.length, 0),
    });
  } else {
    console.log("Sanity Work fetch unavailable — offline assertions only");
  }

  console.log("Work hero merge checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
