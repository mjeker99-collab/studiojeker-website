import type { StructureResolver } from "sanity/structure";

const SINGLETONS = [
  { type: "homepage", title: "Homepage", id: "homepage" },
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
          .id(item.id)
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
