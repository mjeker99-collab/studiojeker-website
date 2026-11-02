// Shared navigation and visibility rules, including descendants of trashed folders.
export type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
  deletedAt: unknown;
  customerId: string | null;
  projectId: string | null;
};
export function folderPath<T extends FolderNode>(
  folders: T[],
  id: string | null,
): T[] {
  const result: T[] = [],
    seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = folders.find((f) => f.id === id);
    if (!folder) break;
    result.unshift(folder);
    id = folder.parentId;
  }
  return result;
}
export function folderVisible(
  folders: FolderNode[],
  id: string | null,
): boolean {
  if (!id) return true;
  const path = folderPath(folders, id);
  return (
    path.length > 0 &&
    path[0].parentId === null &&
    !path.some((f) => f.deletedAt)
  );
}
export function folderLabel(folders: FolderNode[], id: string | null) {
  return ["Bibliothek", ...folderPath(folders, id).map((f) => f.name)].join(
    " / ",
  );
}
