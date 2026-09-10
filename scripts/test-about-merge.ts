/**
 * About / Team Sanity merge regression checks.
 * Run: npx tsx scripts/test-about-merge.ts
 */
import { getAboutPageContent } from "../lib/content/about-page";
import { mergeSanityAbout } from "../lib/content/merge-sanity-about";
import {
  ABOUT_DOCUMENT_ID,
  fetchSanityAbout,
  type SanityAbout,
} from "../lib/sanity/about";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const base = getAboutPageContent("de");
  assert(base.team.members.length === 6, "local fallback reserves 6 team slots");
  assert(
    base.team.members[0]?.image?.src === "/images/team/Martin.jpg",
    "fallback uses local Martin portrait",
  );
  assert(
    base.team.members[1]?.image?.src === "/images/team/Nora.jpg",
    "fallback uses local Nora portrait",
  );

  const live = await fetchSanityAbout();
  assert(live?._id === ABOUT_DOCUMENT_ID, "published singleton id is about");
  assert(
    Array.isArray(live!.teamMembers) && live!.teamMembers!.length >= 2,
    "published About has teamMembers",
  );

  const fromCms = mergeSanityAbout(base, live!, "de");
  assert(fromCms.team.members.length === 6, "merged team always has 6 slots");
  assert(
    fromCms.team.members[0]?.image?.src.includes("cdn.sanity.io"),
    "Martin portrait URL comes from Sanity CDN",
  );
  assert(
    fromCms.team.members[1]?.image?.src.includes("cdn.sanity.io"),
    "Nora portrait URL comes from Sanity CDN",
  );
  assert(
    fromCms.team.featureMedia.src.includes("cdn.sanity.io"),
    "team feature image comes from Sanity CDN",
  );
  assert(
    fromCms.team.members[0]?.role === live!.teamMembers![0]?.role,
    "published team role overrides local fallback",
  );
  assert(
    !fromCms.team.members[0]?.image?.src.includes("/images/team/"),
    "local /images/team fallback must not win over published portrait",
  );

  // Live CMS still has leftover isPlaceholder on filled members (Sabine/Jonathan).
  // Portraits must still win.
  const flaggedWithPortrait = live!.teamMembers!.find(
    (member) =>
      member?.isPlaceholder &&
      (member.portrait?.asset?._ref || member.portrait?.url),
  );
  if (flaggedWithPortrait) {
    const mergedFlagged = fromCms.team.members.find(
      (member) => member.id === flaggedWithPortrait._key,
    );
    assert(mergedFlagged, "flagged member present after merge");
    assert(
      mergedFlagged!.isPlaceholder !== true,
      "isPlaceholder must not stick when portrait exists",
    );
    assert(
      mergedFlagged!.image?.src.includes("cdn.sanity.io"),
      "portrait still loads when Empty-slot flag was left on",
    );
  }

  const swapped: SanityAbout = {
    ...live!,
    teamMembers: [
      {
        _key: "martin",
        name: "Martin Jeker",
        role: "Test role Martin",
        isPlaceholder: false,
        portrait: {
          asset: {
            _ref: "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg",
          },
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/martin-swapped.jpg",
          dimensions: { width: 800, height: 600 },
          alt: "Martin swapped",
          crop: {
            _type: "sanity.imageCrop",
            top: 0,
            bottom: 0,
            left: 0.1,
            right: 0.1,
          },
          hotspot: {
            _type: "sanity.imageHotspot",
            x: 0.5,
            y: 0.4,
            height: 0.8,
            width: 0.8,
          },
        },
      },
      {
        _key: "nora",
        name: "Nora Jeker",
        role: "Test role Nora",
        isPlaceholder: false,
        portrait: {
          asset: {
            _ref: "image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-800x600-jpg",
          },
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/nora-swapped.jpg",
          dimensions: { width: 800, height: 600 },
          alt: "Nora swapped",
        },
      },
      {
        _key: "slot-1",
        name: "Person With Flag",
        role: "Role",
        // Leftover empty-slot flag with real content + portrait
        isPlaceholder: true,
        portrait: {
          asset: {
            _ref: "image-cccccccccccccccccccccccccccccccccccccccc-800x600-jpg",
          },
          url: "https://cdn.sanity.io/images/tgx6e6jg/production/flagged-portrait.jpg",
          dimensions: { width: 800, height: 600 },
          alt: "Flagged portrait",
        },
      },
      {
        _key: "slot-2",
        name: "",
        role: "",
        isPlaceholder: true,
        portrait: null,
      },
    ],
  };

  const afterSwap = mergeSanityAbout(base, swapped, "de");
  assert(afterSwap.team.members.length === 6, "swap case pads to 6 slots");
  assert(
    afterSwap.team.members[0]?.image?.src.includes("martin-swapped.jpg") ||
      afterSwap.team.members[0]?.image?.src.includes("cdn.sanity.io"),
    "swapped Martin portrait wins over local fallback",
  );
  assert(
    afterSwap.team.members[0]?.image?.alt === "Martin swapped",
    "portrait alt comes from Sanity",
  );
  assert(
    afterSwap.team.members[0]?.role === "Test role Martin",
    "swapped role wins",
  );
  assert(
    afterSwap.team.members[2]?.isPlaceholder !== true,
    "filled member with leftover Empty-slot flag is not a placeholder",
  );
  assert(
    afterSwap.team.members[2]?.image?.src.includes("flagged-portrait.jpg") ||
      afterSwap.team.members[2]?.image?.src.includes("cdn.sanity.io"),
    "portrait wins over leftover Empty-slot flag",
  );
  assert(
    afterSwap.team.members[3]?.isPlaceholder === true,
    "true empty slots stay placeholders",
  );

  const emptyDoc: SanityAbout = { _id: "about" };
  const fallbackOnly = mergeSanityAbout(base, emptyDoc, "de");
  assert(
    fallbackOnly.team.members[0]?.image?.src === "/images/team/Martin.jpg",
    "missing Sanity portraits keep local fallback images",
  );

  const draftIgnored = mergeSanityAbout(
    base,
    { _id: "drafts.about", teamMembers: swapped.teamMembers },
    "de",
  );
  // Merge itself does not filter drafts — fetch/query does via perspective + _id.
  // Prove merge still prefers CMS portraits when given a document payload.
  assert(
    draftIgnored.team.members[0]?.image?.src.includes("cdn.sanity.io"),
    "merge applies portraits from provided document payload",
  );

  console.log(
    "OK: About Team — Sanity portraits win (incl. leftover Empty-slot flags), 6-slot grid.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
