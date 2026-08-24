/**
 * One-time Work page CMS migration:
 * Creates the Work singleton with four category grids and sixteen tiles
 * matching the current approved local Work page content.
 *
 * Safe to re-run (createOrReplace with fixed ID `work`).
 * Uploads local placeholder images to Sanity assets when missing.
 *
 * Usage: node scripts/migrate-work-page.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const WORK_ID = "work";

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

const SHOWREELS = {
  digitalMarketing: "1216349266",
};

const CATEGORIES = [
  {
    categoryId: "digital",
    sortOrder: 0,
    title: {
      de: "Content & Digital Marketing",
      en: "Content & Digital Marketing",
    },
    items: [
      {
        itemId: "digital-1",
        sortOrder: 0,
        title: {
          de: "Content & Digital Marketing",
          en: "Content & Digital Marketing",
        },
        mediaType: "image",
        imagePath:
          "public/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
        altDe: "Visual Content & Digital Marketing",
        altEn: "Content & Digital Marketing visual",
      },
      {
        itemId: "digital-2",
        sortOrder: 1,
        title: {
          de: "Content & Digital Marketing",
          en: "Content & Digital Marketing",
        },
        mediaType: "image",
        imagePath:
          "public/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
        altDe: "Visual Content & Digital Marketing",
        altEn: "Content & Digital Marketing visual",
      },
      {
        itemId: "digital-3",
        sortOrder: 2,
        title: {
          de: "Content & Digital Marketing",
          en: "Content & Digital Marketing",
        },
        mediaType: "video",
        vimeoUrl: SHOWREELS.digitalMarketing,
        posterPath:
          "public/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
        altDe: "Visual Content & Digital Marketing",
        altEn: "Content & Digital Marketing visual",
      },
      {
        itemId: "digital-4",
        sortOrder: 3,
        title: {
          de: "Content & Digital Marketing",
          en: "Content & Digital Marketing",
        },
        mediaType: "image",
        imagePath:
          "public/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
        altDe: "Visual Content & Digital Marketing",
        altEn: "Content & Digital Marketing visual",
      },
    ],
  },
  {
    categoryId: "business",
    sortOrder: 1,
    title: {
      de: "Business Communication",
      en: "Business Communication",
    },
    items: [
      {
        itemId: "business-1",
        sortOrder: 0,
        title: {
          de: "Business Communication",
          en: "Business Communication",
        },
        mediaType: "image",
        imagePath: "public/images/business/Business_3-e21f49d5.jpg",
        altDe: "Visual Business Communication",
        altEn: "Business Communication visual",
      },
      {
        itemId: "business-2",
        sortOrder: 1,
        title: {
          de: "Business Communication",
          en: "Business Communication",
        },
        mediaType: "image",
        imagePath: "public/images/business/Reportage_21-d196d171.jpg",
        altDe: "Visual Business Communication",
        altEn: "Business Communication visual",
      },
      {
        itemId: "business-3",
        sortOrder: 2,
        title: {
          de: "Business Communication",
          en: "Business Communication",
        },
        mediaType: "image",
        imagePath: "public/images/business/Business_1-03e4abec.jpg",
        altDe: "Visual Business Communication",
        altEn: "Business Communication visual",
      },
      {
        itemId: "business-4",
        sortOrder: 3,
        title: {
          de: "Business Communication",
          en: "Business Communication",
        },
        mediaType: "image",
        imagePath: "public/images/business/Industrie_1-1dfc4e3a.jpg",
        altDe: "Visual Business Communication",
        altEn: "Business Communication visual",
      },
    ],
  },
  {
    categoryId: "product",
    sortOrder: 2,
    title: {
      de: "Product Communication",
      en: "Product Communication",
    },
    items: [
      {
        itemId: "product-1",
        sortOrder: 0,
        title: {
          de: "Product Communication",
          en: "Product Communication",
        },
        mediaType: "slideshow",
        slideshowInterval: 4500,
        altDe: "Visual Product Communication",
        altEn: "Product Communication visual",
        slideshowPaths: [
          "public/images/product/Watch_3-057ab44a.jpg",
          "public/images/product/Produktfotografie-scaled.jpg",
          "public/images/product/Produkt_7.jpg",
          "public/images/product/Fotocomposing-725efaf0.jpg",
        ],
      },
      {
        itemId: "product-2",
        sortOrder: 1,
        title: {
          de: "Product Communication",
          en: "Product Communication",
        },
        mediaType: "image",
        imagePath: "public/images/product/Produktfotografie-scaled.jpg",
        altDe: "Visual Product Communication",
        altEn: "Product Communication visual",
      },
      {
        itemId: "product-3",
        sortOrder: 2,
        title: {
          de: "Product Communication",
          en: "Product Communication",
        },
        mediaType: "image",
        imagePath: "public/images/product/Produkt_7.jpg",
        altDe: "Visual Product Communication",
        altEn: "Product Communication visual",
      },
      {
        itemId: "product-4",
        sortOrder: 3,
        title: {
          de: "Product Communication",
          en: "Product Communication",
        },
        mediaType: "image",
        imagePath: "public/images/product/Fotocomposing-725efaf0.jpg",
        altDe: "Visual Product Communication",
        altEn: "Product Communication visual",
      },
    ],
  },
  {
    categoryId: "architecture",
    sortOrder: 3,
    title: {
      de: "Architecture & Real Estate",
      en: "Architecture & Real Estate",
    },
    items: [
      {
        itemId: "architecture-1",
        sortOrder: 0,
        title: {
          de: "Architecture & Real Estate",
          en: "Architecture & Real Estate",
        },
        mediaType: "image",
        imagePath: "public/images/architecture/v5_02_korr.jpg",
        altDe: "Visual Architecture & Real Estate",
        altEn: "Architecture & Real Estate visual",
      },
      {
        itemId: "architecture-2",
        sortOrder: 1,
        title: {
          de: "Architecture & Real Estate",
          en: "Architecture & Real Estate",
        },
        mediaType: "image",
        imagePath: "public/images/architecture/Architekturvisualisierung.jpg",
        altDe: "Visual Architecture & Real Estate",
        altEn: "Architecture & Real Estate visual",
      },
      {
        itemId: "architecture-3",
        sortOrder: 2,
        title: {
          de: "Architecture & Real Estate",
          en: "Architecture & Real Estate",
        },
        mediaType: "image",
        imagePath: "public/images/architecture/troesch4.jpg",
        altDe: "Visual Architecture & Real Estate",
        altEn: "Architecture & Real Estate visual",
      },
      {
        itemId: "architecture-4",
        sortOrder: 3,
        title: {
          de: "Architecture & Real Estate",
          en: "Architecture & Real Estate",
        },
        mediaType: "image",
        imagePath: "public/images/architecture/3D_2.jpg",
        altDe: "Visual Architecture & Real Estate",
        altEn: "Architecture & Real Estate visual",
      },
    ],
  },
];

async function uploadImage(filePath, altDe) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing image file: ${filePath}`);
  }
  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename: basename(filePath),
  });
  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
    alt: altDe,
  };
}

async function buildMedia(item) {
  if (item.mediaType === "video") {
    const poster = item.posterPath
      ? await uploadImage(item.posterPath, item.altDe)
      : undefined;
    return {
      _type: "workMediaField",
      mediaType: "video",
      vimeoUrl: item.vimeoUrl,
      poster,
      videoAlt: item.altDe,
    };
  }

  if (item.mediaType === "slideshow") {
    const slideshowImages = [];
    for (const path of item.slideshowPaths ?? []) {
      slideshowImages.push(await uploadImage(path, item.altDe));
    }
    return {
      _type: "workMediaField",
      mediaType: "slideshow",
      slideshowAlt: item.altDe,
      slideshowInterval: item.slideshowInterval ?? 4500,
      slideshowImages,
    };
  }

  return {
    _type: "workMediaField",
    mediaType: "image",
    image: await uploadImage(item.imagePath, item.altDe),
  };
}

async function main() {
  const categories = [];
  for (const category of CATEGORIES) {
    const items = [];
    for (const item of category.items) {
      items.push({
        _type: "workProjectItem",
        _key: item.itemId,
        itemId: item.itemId,
        sortOrder: item.sortOrder,
        title: {
          _type: "localizedString",
          de: item.title.de,
          en: item.title.en,
        },
        media: await buildMedia(item),
      });
      console.log(`  uploaded tile ${item.itemId}`);
    }

    categories.push({
      _type: "workCategory",
      _key: category.categoryId,
      categoryId: category.categoryId,
      sortOrder: category.sortOrder,
      title: {
        _type: "localizedString",
        de: category.title.de,
        en: category.title.en,
      },
      items,
    });
  }

  const doc = {
    _id: WORK_ID,
    _type: "work",
    heroSection: {
      label: { _type: "localizedString", de: "Work", en: "Work" },
      headline: {
        _type: "localizedString",
        de: "Ausgewählte Projekte.",
        en: "Selected projects.",
      },
      text: {
        _type: "localizedText",
        de: "Strategie, Content und Design – bewegt, inszeniert und wirksam über alle Kanäle.",
        en: "Strategy, content and design — moved, staged and effective across every channel.",
      },
    },
    categories,
    seoSection: {
      title: {
        _type: "localizedString",
        de: "Work | Studiojeker",
        en: "Work | Studiojeker",
      },
      description: {
        _type: "localizedText",
        de: "Ausgewählte Arbeiten in Content & Digital Marketing, Business Communication, Product Communication und Architecture & Real Estate.",
        en: "Selected projects across Content & Digital Marketing, Business Communication, Product Communication and Architecture & Real Estate.",
      },
    },
  };

  await client.createOrReplace(doc);
  console.log(`Work singleton created/updated: ${WORK_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
