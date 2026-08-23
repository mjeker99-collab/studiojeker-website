/**
 * Ensure each Service document uses the exact current staging Hero image.
 *
 * Digital / Business / Architecture already match local files by size.
 * Product Communication previously pointed at certina1.jpg — replace with
 * Watch_3-057ab44a.jpg (the live Service page hero).
 *
 * Usage: node scripts/migrate-service-hero-images.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";

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

/** Current Service page hero assets (must stay visually identical on staging). */
const SERVICES = [
  {
    docId: "service-digital-marketing",
    slug: "digital-marketing",
    imagePath:
      "public/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
    altDe: "Digitale Content-Produktion von Studiojeker",
    altEn: "Digital content production by Studiojeker",
    expectedFilename: "Zofingen-0279-b9bf2eb3.jpg",
  },
  {
    docId: "service-business-communication",
    slug: "business-communication",
    imagePath: "public/images/business/Business_3-e21f49d5.jpg",
    altDe: "Business-Filmproduktion von Studiojeker",
    altEn: "Business film production by Studiojeker",
    expectedFilename: "Business_3-e21f49d5.jpg",
  },
  {
    docId: "service-product-communication",
    slug: "product-communication",
    imagePath: "public/images/product/Watch_3-057ab44a.jpg",
    altDe: "Produktfotografie von Studiojeker",
    altEn: "Product photography by Studiojeker",
    expectedFilename: "Watch_3-057ab44a.jpg",
  },
  {
    docId: "service-architecture",
    slug: "architecture",
    imagePath: "public/images/architecture/hero-villa-master.jpg",
    altDe: "Architekturvisualisierung von Studiojeker",
    altEn: "Architectural visualization by Studiojeker",
    expectedFilename: "hero-villa-master.jpg",
  },
];

async function uploadImage(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing image: ${filePath}`);
  }
  return client.assets.upload("image", createReadStream(filePath), {
    filename: basename(filePath),
  });
}

async function main() {
  for (const service of SERVICES) {
    const existing = await client.getDocument(service.docId).catch(() => null);
    if (!existing) {
      console.warn(`⚠ Document ${service.docId} not found — skip`);
      continue;
    }

    const assetRef = existing.heroImage?.asset?._ref;
    let currentFilename = null;
    if (assetRef) {
      const asset = await client.getDocument(assetRef).catch(() => null);
      currentFilename = asset?.originalFilename ?? null;
    }

    const matches =
      currentFilename === service.expectedFilename ||
      (currentFilename &&
        currentFilename.toLowerCase() === service.expectedFilename.toLowerCase());

    let imageRef = assetRef;
    if (!matches) {
      const asset = await uploadImage(service.imagePath);
      imageRef = asset._id;
      console.log(
        `↑ ${service.slug}: uploaded ${service.expectedFilename} → ${imageRef}` +
          (currentFilename ? ` (was ${currentFilename})` : ""),
      );
    } else {
      console.log(
        `✓ ${service.slug}: keeping ${currentFilename} (${imageRef})`,
      );
    }

    await client
      .patch(service.docId)
      .set({
        heroImage: {
          _type: "image",
          asset: { _type: "reference", _ref: imageRef },
          alt: existing.heroImage?.alt || service.altDe,
        },
      })
      .commit({ autoGenerateArrayKeys: true });

    console.log(`  patched ${service.docId} heroImage + alt`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
