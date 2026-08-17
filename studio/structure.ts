import type { StructureBuilder, StructureResolver } from "sanity/structure";

/**
 * Homepage singleton uses the existing published test document ID so Studio
 * opens the live content instead of an empty stub.
 * About and Global Settings use stable semantic IDs.
 */
const HOMEPAGE_DOCUMENT_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

const SINGLETON_DOCS = {
  homepage: {
    type: "homepage",
    title: "Homepage",
    id: HOMEPAGE_DOCUMENT_ID,
  },
  about: {
    type: "about",
    title: "About",
    id: "about",
  },
  globalSettings: {
    type: "globalSettings",
    title: "Global Settings",
    id: "globalSettings",
  },
} as const;

/**
 * The four current service pages. IDs are stable — do not create extras.
 */
export const SERVICE_DOCS = [
  {
    id: "service-digital-marketing",
    title: "Digital & Social Media Marketing",
  },
  {
    id: "service-business-communication",
    title: "Business Communication",
  },
  {
    id: "service-product-communication",
    title: "Product Communication",
  },
  {
    id: "service-architecture",
    title: "Architecture & Real Estate",
  },
] as const;

function singletonListItem(
  S: StructureBuilder,
  item: (typeof SINGLETON_DOCS)[keyof typeof SINGLETON_DOCS],
) {
  return S.listItem()
    .title(item.title)
    .id(item.type)
    .child(
      S.document()
        .schemaType(item.type)
        .documentId(item.id)
        .title(item.title),
    );
}

function serviceListItem(
  S: StructureBuilder,
  item: (typeof SERVICE_DOCS)[number],
) {
  return S.listItem()
    .title(item.title)
    .id(item.id)
    .child(
      S.document()
        .schemaType("service")
        .documentId(item.id)
        .title(item.title),
    );
}

/**
 * Editorial desk order (non-technical editors):
 * Homepage → About → Services → Work → Team → Clients → Global Settings
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Studiojeker Content")
    .items([
      singletonListItem(S, SINGLETON_DOCS.homepage),
      singletonListItem(S, SINGLETON_DOCS.about),
      S.listItem()
        .title("Services")
        .id("services")
        .child(
          S.list()
            .title("Services")
            .items(SERVICE_DOCS.map((item) => serviceListItem(S, item))),
        ),
      S.documentTypeListItem("project").title("Work / Projects"),
      S.documentTypeListItem("teamMember").title("Team"),
      S.documentTypeListItem("client").title("Clients / Logos"),
      S.divider(),
      singletonListItem(S, SINGLETON_DOCS.globalSettings),
    ]);

/** Hide singleton types from the generic “Create new” document menu. */
export const singletonTypes: Set<string> = new Set([
  ...Object.values(SINGLETON_DOCS).map((item) => item.type),
  "service",
]);
