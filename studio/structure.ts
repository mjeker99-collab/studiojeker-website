import type { StructureResolver } from "sanity/structure";

/**
 * Homepage singleton uses the existing published test document ID so Studio
 * opens the live content (heroHeadline / introText / heroImage) instead of an
 * empty stub. About and Global Settings use stable semantic IDs.
 */
const HOMEPAGE_DOCUMENT_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

const SINGLETONS = [
  { type: "homepage", title: "Homepage", id: HOMEPAGE_DOCUMENT_ID },
  { type: "about", title: "About", id: "about" },
  { type: "globalSettings", title: "Global Settings", id: "globalSettings" },
] as const;

/**
 * Desk structure for non-technical editors.
 * Singletons open a fixed document ID — no duplicate Homepage/About/Settings.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Studiojeker Content")
    .items([
      ...SINGLETONS.map((item) =>
        S.listItem()
          .title(item.title)
          .id(item.type)
          .child(
            S.document()
              .schemaType(item.type)
              .documentId(item.id)
              .title(item.title),
          ),
      ),
      S.divider(),
      S.documentTypeListItem("service").title("Services"),
      S.documentTypeListItem("project").title("Work / Projects"),
      S.documentTypeListItem("teamMember").title("Team"),
      S.documentTypeListItem("client").title("Clients / Logos"),
    ]);

/** Hide singleton types from the generic “Create new” document menu. */
export const singletonTypes: Set<string> = new Set(
  SINGLETONS.map((item) => item.type),
);
