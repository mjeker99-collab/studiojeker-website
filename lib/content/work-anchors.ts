/**
 * Stable public hash IDs for Work tiles.
 * Keys are Sanity / local `itemId` values; values are URL fragments on /work.
 * Language-neutral so DE `/work#…` and EN `/en/work#…` share the same anchors.
 */
export const WORK_ITEM_ANCHORS: Readonly<Record<string, string>> = {
  // Business Communication
  "business-1": "business-showreel",
  "business-3": "unternehmensfilme",
  "business-4": "werbefotografie",
  "business-portraits": "businessportraits",
  // Content & Digital Marketing
  "digital-1": "digital-showreel",
  "digital-2": "eventvideos",
  "digital-3": "content-production",
  "digital-4": "content-marketing-abo",
  // Product Communication
  "product-1": "product-showreel",
  "product-2": "produktfotografie",
  "product-3": "produktfilme",
  "product-4": "produktanimationen",
  "Product Communication": "product-showreel",
  // Architecture & Real Estate
  "architecture-1": "architecture-showreel",
  "architecture-2": "architekturfotos",
  "architecture-3": "architekturvideos",
  "architecture-4": "3d-visualisierungen",
};

/** Category-level anchors (Work section headers). */
export const WORK_CATEGORY_ANCHORS: Readonly<Record<string, string>> = {
  digital: "digital",
  business: "business",
  product: "product",
  architecture: "architecture",
};

/**
 * Default Service → Work link targets (path + hash, no locale prefix).
 * Used as local fallbacks and when Sanity still has a bare `/work` href.
 */
export const SERVICE_SOLUTION_WORK_HREFS: Readonly<
  Record<string, Record<string, string>>
> = {
  "business-communication": {
    "corporate-films": "/work#unternehmensfilme",
    portraits: "/work#businessportraits",
    reportage: "/work#business",
    internal: "/work#eventvideos",
  },
  "product-communication": {
    photo: "/work#produktfotografie",
    film: "/work#produktfilme",
    viz3d: "/work#3d-visualisierungen",
    animation: "/work#produktanimationen",
  },
  architecture: {
    viz: "/work#3d-visualisierungen",
    animation: "/work#architekturvideos",
    drone: "/work#architecture",
    tours: "/work#architecture",
  },
  "digital-marketing": {
    content: "/work#content-production",
    social: "/work#eventvideos",
  },
};

export function getWorkItemAnchorId(itemId: string): string {
  return WORK_ITEM_ANCHORS[itemId] ?? itemId;
}

export function getWorkCategoryAnchorId(categoryId: string): string {
  const base = categoryId.replace(/-\d+$/, "");
  return WORK_CATEGORY_ANCHORS[base] ?? base;
}
