#!/usr/bin/env node
/**
 * One-off Homepage content migration → Sanity.
 *
 * Updates the EXISTING Homepage document (no duplicate).
 * Does NOT wire the marketing homepage to Sanity.
 *
 * Requires: SANITY_API_WRITE_TOKEN (never log / print the token).
 *
 * Usage: node scripts/migrate-homepage-to-sanity.mjs
 */

import { createClient } from "@sanity/client";
import { createReadStream, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "tgx6e6jg";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const API_VERSION =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-01-01";

/** Existing published Homepage singleton — do not create a new document. */
const HOMEPAGE_DOCUMENT_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

/**
 * German Homepage content mapped from lib/content/homepage.ts (locale === "de").
 * Only fields that exist on studio/schemaTypes/homepage.ts.
 */
const DE_HOMEPAGE_FIELDS = {
  heroHeadline: "We create visibility.",
  // Schema has a single hero intro field; preserve subheadline + body prose.
  introText:
    "Photo. Video. 3D. Content. Strategy. Distribution.\n\nWir inszenieren Marken, Produkte und Architektur – visuell stark, strategisch durchdacht, wirkungsvoll umgesetzt.",
  // No hero video on the live homepage today.
  heroVideoUrl: undefined,
  // Homepage About block serves as the main introduction in the current schema.
  mainIntroHeadline: "Strategie. Kreativität. Produktion. Wirkung.",
  mainIntroText:
    "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
  servicesSectionHeadline: "Unsere Leistungen",
  // No dedicated services intro paragraph in current DE content.
  servicesIntro: undefined,
  workSectionHeadline: "Ausgewählte Projekte",
  // No dedicated work intro paragraph in current DE content.
  workIntro: undefined,
  ctaHeadline: "Lassen Sie uns gemeinsam Sichtbarkeit schaffen.",
  ctaText: "Wir freuen uns auf Ihr Projekt.",
  ctaLabel: "Jetzt Kontakt aufnehmen",
  seoTitle: "Studiojeker | Foto, Film, 3D & Marketing für Unternehmen",
  seoDescription:
    "Studiojeker entwickelt seit 1992 Foto-, Film-, 3D- und Marketinglösungen für Unternehmen, Produkte und Architektur. We Create Visibility.",
};

const HERO_IMAGE = {
  relativePath: "public/images/architecture/Architekturvisualisierung.jpg",
  alt: "Architekturvisualisierung von Studiojeker",
};

function requireWriteToken() {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!token) {
    console.error(
      "SANITY_API_WRITE_TOKEN is not set. Add it to the Cloud environment secrets and re-run.",
    );
    process.exit(1);
  }
  return token;
}

function getWriteClient(token) {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
    perspective: "raw",
  });
}

function getPublicReadClient() {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: "published",
  });
}

async function uploadHeroImage(client) {
  const absolutePath = resolve(ROOT, HERO_IMAGE.relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Hero image not found: ${HERO_IMAGE.relativePath}`);
  }

  console.log(`Uploading hero image: ${HERO_IMAGE.relativePath}`);
  const asset = await client.assets.upload(
    "image",
    createReadStream(absolutePath),
    {
      filename: basename(absolutePath),
      contentType: "image/jpeg",
    },
  );

  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: asset._id,
    },
    // Preserve alt as a custom field if schema later supports it;
    // hotspot optional — leave unset for natural framing.
  };
}

function buildPatchPayload(heroImage) {
  const payload = {
    heroHeadline: DE_HOMEPAGE_FIELDS.heroHeadline,
    introText: DE_HOMEPAGE_FIELDS.introText,
    heroImage,
    mainIntroHeadline: DE_HOMEPAGE_FIELDS.mainIntroHeadline,
    mainIntroText: DE_HOMEPAGE_FIELDS.mainIntroText,
    servicesSectionHeadline: DE_HOMEPAGE_FIELDS.servicesSectionHeadline,
    workSectionHeadline: DE_HOMEPAGE_FIELDS.workSectionHeadline,
    ctaHeadline: DE_HOMEPAGE_FIELDS.ctaHeadline,
    ctaText: DE_HOMEPAGE_FIELDS.ctaText,
    ctaLabel: DE_HOMEPAGE_FIELDS.ctaLabel,
    seoTitle: DE_HOMEPAGE_FIELDS.seoTitle,
    seoDescription: DE_HOMEPAGE_FIELDS.seoDescription,
  };

  // Explicitly clear optional empty fields so temporary leftovers do not linger.
  const unset = [];
  if (DE_HOMEPAGE_FIELDS.heroVideoUrl === undefined) unset.push("heroVideoUrl");
  if (DE_HOMEPAGE_FIELDS.servicesIntro === undefined) unset.push("servicesIntro");
  if (DE_HOMEPAGE_FIELDS.workIntro === undefined) unset.push("workIntro");

  return { payload, unset };
}

const VERIFY_QUERY = `*[_id == $id][0]{
  _id,
  _type,
  heroHeadline,
  introText,
  heroImage{
    asset->{_id, url, originalFilename, size, mimeType}
  },
  heroVideoUrl,
  mainIntroHeadline,
  mainIntroText,
  servicesSectionHeadline,
  servicesIntro,
  workSectionHeadline,
  workIntro,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription
}`;

function assertField(doc, key, expected) {
  const actual = doc?.[key] ?? null;
  const ok = expected === undefined ? actual == null : actual === expected;
  if (!ok) {
    throw new Error(
      `Verification failed for ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function main() {
  const token = requireWriteToken();
  const writeClient = getWriteClient(token);
  const readClient = getPublicReadClient();

  console.log(
    `Target: project=${PROJECT_ID} dataset=${DATASET} document=${HOMEPAGE_DOCUMENT_ID}`,
  );

  const existing = await writeClient.fetch(
    `*[_id == $id][0]{_id,_type,heroHeadline}`,
    { id: HOMEPAGE_DOCUMENT_ID },
  );

  if (!existing?._id) {
    throw new Error(
      `Homepage document ${HOMEPAGE_DOCUMENT_ID} not found. Aborting to avoid creating a duplicate.`,
    );
  }

  console.log(`Found existing Homepage document: ${existing._id}`);
  console.log(`Previous heroHeadline: ${existing.heroHeadline ?? "(empty)"}`);

  const heroImage = await uploadHeroImage(writeClient);
  const { payload, unset } = buildPatchPayload(heroImage);

  let patch = writeClient.patch(HOMEPAGE_DOCUMENT_ID).set(payload);
  if (unset.length > 0) {
    patch = patch.unset(unset);
  }

  const result = await patch.commit({ autoGenerateArrayKeys: true });
  console.log(`Patched Homepage revision: ${result._rev}`);

  // Ensure published perspective can see the update (document is not a draft).
  const verified = await readClient.fetch(VERIFY_QUERY, {
    id: HOMEPAGE_DOCUMENT_ID,
  });

  if (!verified?._id) {
    throw new Error("Read-back failed: Homepage document not found after patch.");
  }

  assertField(verified, "heroHeadline", DE_HOMEPAGE_FIELDS.heroHeadline);
  assertField(verified, "introText", DE_HOMEPAGE_FIELDS.introText);
  assertField(verified, "mainIntroHeadline", DE_HOMEPAGE_FIELDS.mainIntroHeadline);
  assertField(verified, "mainIntroText", DE_HOMEPAGE_FIELDS.mainIntroText);
  assertField(
    verified,
    "servicesSectionHeadline",
    DE_HOMEPAGE_FIELDS.servicesSectionHeadline,
  );
  assertField(verified, "workSectionHeadline", DE_HOMEPAGE_FIELDS.workSectionHeadline);
  assertField(verified, "ctaHeadline", DE_HOMEPAGE_FIELDS.ctaHeadline);
  assertField(verified, "ctaText", DE_HOMEPAGE_FIELDS.ctaText);
  assertField(verified, "ctaLabel", DE_HOMEPAGE_FIELDS.ctaLabel);
  assertField(verified, "seoTitle", DE_HOMEPAGE_FIELDS.seoTitle);
  assertField(verified, "seoDescription", DE_HOMEPAGE_FIELDS.seoDescription);

  if (!verified.heroImage?.asset?.url) {
    throw new Error("Read-back failed: heroImage asset URL missing.");
  }

  console.log("Verification OK — fields populated:");
  for (const key of Object.keys(payload)) {
    if (key === "heroImage") {
      console.log(
        `  - heroImage: ${verified.heroImage.asset.originalFilename} (${verified.heroImage.asset._id})`,
      );
      console.log(`    url: ${verified.heroImage.asset.url}`);
    } else {
      const value = verified[key];
      const preview =
        typeof value === "string" && value.length > 80
          ? `${value.slice(0, 77)}...`
          : value;
      console.log(`  - ${key}: ${JSON.stringify(preview)}`);
    }
  }
  console.log("  - heroVideoUrl: (unset — no hero video in DE homepage)");
  console.log("  - servicesIntro: (unset — no dedicated DE services intro)");
  console.log("  - workIntro: (unset — no dedicated DE work intro)");
  console.log("Done. Marketing frontend was not modified.");
}

main().catch((error) => {
  console.error("Homepage migration failed:", error.message || error);
  process.exit(1);
});
