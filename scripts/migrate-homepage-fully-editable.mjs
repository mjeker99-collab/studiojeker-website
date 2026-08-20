/**
 * One-time Homepage CMS migration:
 * 1) Copy Homepage service card copy onto Service documents (single source).
 * 2) Replace embedded homepage service items with Service references.
 * 3) Create featured Work/Project teasers from current Homepage placeholders.
 * 4) Wire Homepage selectedProjects to those teasers.
 *
 * Safe to re-run (createOrReplace / patch with fixed IDs).
 * Does not overwrite Hero media or other already-filled Homepage fields.
 *
 * Usage: node scripts/migrate-homepage-fully-editable.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const HOMEPAGE_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN;
if (!token) {
  console.error("Missing SANITY_API_WRITE_TOKEN or SANITY_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const SERVICE_MAP = [
  {
    serviceId: "digital",
    docId: "service-digital-marketing",
    key: "digital",
  },
  {
    serviceId: "business",
    docId: "service-business-communication",
    key: "business",
  },
  {
    serviceId: "product",
    docId: "service-product-communication",
    key: "product",
  },
  {
    serviceId: "architecture",
    docId: "service-architecture",
    key: "architecture",
  },
];

const PROJECT_TEASERS = [
  {
    id: "project-homepage-digital",
    title: "Content & Digital Marketing",
    slug: "homepage-teaser-digital",
    serviceRef: "service-digital-marketing",
    sortOrder: 0,
    imagePath:
      "public/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
    altDe: "Platzhalterbild Content & Digital Marketing",
    altEn: "Content & Digital Marketing placeholder image",
  },
  {
    id: "project-homepage-business",
    title: "Business Communication",
    slug: "homepage-teaser-business",
    serviceRef: "service-business-communication",
    sortOrder: 1,
    imagePath: "public/images/business/Business_3-e21f49d5.jpg",
    altDe: "Platzhalterbild Business Communication",
    altEn: "Business communication placeholder image",
  },
  {
    id: "project-homepage-product",
    title: "Product Communication",
    slug: "homepage-teaser-product",
    serviceRef: "service-product-communication",
    sortOrder: 2,
    imagePath: "public/images/product/Watch_3-057ab44a.jpg",
    altDe: "Platzhalterbild Product Communication",
    altEn: "Product communication placeholder image",
  },
  {
    id: "project-homepage-architecture",
    title: "Architecture & Real Estate",
    slug: "homepage-teaser-architecture",
    serviceRef: "service-architecture",
    sortOrder: 3,
    imagePath: "public/images/architecture/v5_02_korr.jpg",
    altDe: "Platzhalterbild Architecture & Real Estate",
    altEn: "Architecture & Real Estate placeholder image",
  },
];

async function uploadImage(filePath, filename) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing image file: ${filePath}`);
  }
  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename: filename || basename(filePath),
  });
  return asset;
}

async function migrateServices(homepage) {
  const items = homepage?.servicesSection?.items ?? [];
  console.log(`Services: ${items.length} homepage items`);

  for (const mapping of SERVICE_MAP) {
    const embedded = items.find(
      (item) =>
        item?.serviceId === mapping.serviceId ||
        item?._ref === mapping.docId ||
        item?._id === mapping.docId,
    );

    const title = embedded?.title || embedded?.homepageTitle;
    const description = embedded?.description || embedded?.homepageDescription;

    const patch = {};
    if (title?.de || title?.en) {
      patch.homepageTitle = {
        _type: "localizedString",
        de: title.de || "",
        en: title.en || "",
      };
    }
    if (description?.de || description?.en) {
      patch.homepageDescription = {
        _type: "localizedText",
        de: description.de || "",
        en: description.en || "",
      };
    }

    if (Object.keys(patch).length > 0) {
      await client.patch(mapping.docId).set(patch).commit();
      console.log(`  patched ${mapping.docId} homepage card copy`);
    } else {
      console.log(`  skip ${mapping.docId} (no card copy found)`);
    }
  }

  const refs = SERVICE_MAP.map((mapping) => ({
    _type: "reference",
    _ref: mapping.docId,
    _key: mapping.key,
  }));

  await client
    .patch(HOMEPAGE_ID)
    .set({ "servicesSection.items": refs })
    .commit();
  console.log("  homepage servicesSection.items → Service references");
}

async function migrateProjects() {
  const refs = [];

  for (const teaser of PROJECT_TEASERS) {
    const existing = await client.getDocument(teaser.id).catch(() => null);
    let imageAssetId = existing?.mainImage?.asset?._ref;

    if (!imageAssetId) {
      const asset = await uploadImage(teaser.imagePath, basename(teaser.imagePath));
      imageAssetId = asset._id;
      console.log(`  uploaded ${teaser.imagePath} → ${imageAssetId}`);
    } else {
      console.log(`  keep existing image on ${teaser.id}`);
    }

    await client.createOrReplace({
      _id: teaser.id,
      _type: "project",
      title: teaser.title,
      slug: { _type: "slug", current: teaser.slug },
      // No category ref — keeps Homepage card title-only (matches current teaser UI).
      shortDescription: teaser.title,
      featured: true,
      sortOrder: teaser.sortOrder,
      mainImage: {
        _type: "image",
        asset: { _type: "reference", _ref: imageAssetId },
        alt: teaser.altEn,
      },
    });
    console.log(`  upserted ${teaser.id}`);

    refs.push({
      _type: "reference",
      _ref: teaser.id,
      _key: teaser.slug,
    });
  }

  const homepage = await client.getDocument(HOMEPAGE_ID);
  const current = homepage?.projectsSection?.selectedProjects ?? [];
  if (Array.isArray(current) && current.length > 0) {
    console.log(
      `  homepage already has ${current.length} selectedProjects — leaving as-is`,
    );
    return;
  }

  await client
    .patch(HOMEPAGE_ID)
    .set({ "projectsSection.selectedProjects": refs })
    .commit();
  console.log("  homepage projectsSection.selectedProjects wired");
}

async function main() {
  const homepage = await client.getDocument(HOMEPAGE_ID);
  if (!homepage) {
    throw new Error(`Homepage ${HOMEPAGE_ID} not found`);
  }

  await migrateServices(homepage);
  await migrateProjects();
  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
