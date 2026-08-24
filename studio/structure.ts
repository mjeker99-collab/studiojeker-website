import type { StructureBuilder, StructureResolver } from "sanity/structure";

/**
 * Homepage singleton uses the existing published test document ID so Studio
 * opens the live content instead of an empty stub.
 * About, Contact and Global Settings use stable semantic IDs.
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
  contact: {
    type: "contact",
    title: "Contact",
    id: "contact",
  },
  globalSettings: {
    type: "globalSettings",
    title: "Global Settings",
    id: "globalSettings",
  },
  work: {
    type: "work",
    title: "Work",
    id: "work",
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
 * Homepage → About → Contact → Work → Services → Project teasers → Team → Clients → Global Settings
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Studiojeker Content")
    .items([
      singletonListItem(S, SINGLETON_DOCS.homepage),
      singletonListItem(S, SINGLETON_DOCS.about),
      singletonListItem(S, SINGLETON_DOCS.contact),
      singletonListItem(S, SINGLETON_DOCS.work),
      S.documentTypeListItem("service").title("Services"),
      S.documentTypeListItem("project").title("Project teasers"),
      S.documentTypeListItem("teamMember").title("Team"),
      S.documentTypeListItem("client").title("Clients / Logos"),
      S.divider(),
      singletonListItem(S, SINGLETON_DOCS.globalSettings),
    ]);

/** Hide singleton types from the generic “Create new” document menu. */
export const singletonTypes: Set<string> = new Set(
  Object.values(SINGLETON_DOCS).map((item) => item.type),
);
