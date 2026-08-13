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
      S.documentTypeListItem("service").title("Services"),
      S.documentTypeListItem("project").title("Work / Projects"),
      S.documentTypeListItem("teamMember").title("Team"),
      S.documentTypeListItem("client").title("Clients / Logos"),
      S.divider(),
      singletonListItem(S, SINGLETON_DOCS.globalSettings),
    ]);

/** Hide singleton types from the generic “Create new” document menu. */
export const singletonTypes: Set<string> = new Set(
  Object.values(SINGLETON_DOCS).map((item) => item.type),
);
