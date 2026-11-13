/**
 * Local checks for service media gallery fallbacks + empty-section hiding.
 * Run: npx tsx scripts/test-service-media-sections.ts
 */
import { getServicePageContent } from "../lib/content/services";
import {
  EXPECTED_MEDIA_SECTIONS,
  visibleMediaSections,
} from "../lib/content/services/media-sections";
import { mergeSanityService } from "../lib/content/merge-sanity-service";
import type { ServicePageSlug } from "../types/service-page";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const landingSlugs = [
  "business-communication",
  "product-communication",
  "architecture",
] as const satisfies readonly ServicePageSlug[];

for (const slug of landingSlugs) {
  const content = getServicePageContent(slug, "de");
  const expected = EXPECTED_MEDIA_SECTIONS[slug] ?? [];
  assert(content.media.sections.length === expected.length, `${slug} section count`);
  const visible = visibleMediaSections(content.media.sections);
  assert(visible.length > 0, `${slug} has at least one visible media section`);
  assert(
    visible.every((section) => section.items.length > 0),
    `${slug} visible sections have items`,
  );
  assert(
    (content.missingContent?.length ?? 0) > 0,
    `${slug} lists missing media for preview`,
  );

  const cleared = mergeSanityService(
    content,
    {
      mediaSections: [],
    },
    "de",
  );
  assert(
    visibleMediaSections(cleared.media.sections).length === 0,
    `${slug} empty Sanity mediaSections clears galleries`,
  );
}

const digital = getServicePageContent("digital-marketing", "de");
assert(digital.media.sections.length === 0, "digital has no media galleries");
assert(digital.projects.items.length > 0, "digital keeps legacy projects");

console.log(
  JSON.stringify(
    {
      ok: true,
      businessPhotos: visibleMediaSections(
        getServicePageContent("business-communication", "de").media.sections,
      ).map((s) => s.id),
      productVisible: visibleMediaSections(
        getServicePageContent("product-communication", "de").media.sections,
      ).map((s) => s.id),
      architectureVisible: visibleMediaSections(
        getServicePageContent("architecture", "de").media.sections,
      ).map((s) => s.id),
      businessMissing: getServicePageContent("business-communication", "de")
        .missingContent,
    },
    null,
    2,
  ),
);
