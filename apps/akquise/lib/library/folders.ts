import { z } from "zod";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit, type Tx } from "../workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";

const id = z.string().trim().min(1).max(200);
const folderInput = z
  .object({
    id: id.optional(),
    revision: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
    parentId: id.nullable(),
    customerId: id.nullable(),
    projectId: id.nullable(),
  })
  .strict();

// Serialize tree changes with uploads and item moves to prevent cycles and
// writes into a folder that is being trashed in another request.
export async function lockLibrary(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"library:" + ORG}))`;
}
export async function accessibleFolder(tx: Tx, folderId: string | null) {
  const seen = new Set<string>();
  let current = folderId;
  while (current) {
    if (seen.has(current))
      throw new PolicyError("Ungültige Ordnerstruktur.", 409);
    seen.add(current);
    const folder = await tx.libraryFolder.findFirst({
      where: { id: current, organizationId: ORG, deletedAt: null },
    });
    if (!folder)
      throw new PolicyError(
        "Ordner nicht verfügbar. Bibliothek neu laden.",
        409,
      );
    current = folder.parentId;
  }
  return seen;
}
async function uniqueName(
  tx: Tx,
  name: string,
  parentId: string | null,
  except?: string,
) {
  const duplicate = await tx.libraryFolder.findFirst({
    where: {
      organizationId: ORG,
      parentId,
      deletedAt: null,
      name: { equals: name, mode: "insensitive" },
      ...(except ? { id: { not: except } } : {}),
    },
  });
  if (duplicate)
    throw new PolicyError(
      "Ein Ordner mit diesem Namen ist hier bereits vorhanden.",
      409,
    );
}
export async function saveLibraryFolder(actor: string, raw: unknown) {
  const d = folderInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lockLibrary(tx);
    const ancestors = await accessibleFolder(tx, d.parentId);
    if (d.id) {
      await accessibleFolder(tx, d.id);
      if (ancestors.has(d.id))
        throw new PolicyError(
          "Ein Ordner kann nicht in sich selbst oder einen Unterordner verschoben werden.",
        );
    }
    if (
      d.customerId &&
      !(await tx.customer.findFirst({
        where: { id: d.customerId, organizationId: ORG },
      }))
    )
      throw new PolicyError("Kunde nicht zugänglich.", 403);
    if (d.projectId) {
      const project = await tx.studioSeries.findFirst({
        where: { id: d.projectId, organizationId: ORG },
      });
      if (!project) throw new PolicyError("Projekt nicht zugänglich.", 403);
      if (
        d.customerId &&
        project.customerId &&
        project.customerId !== d.customerId
      )
        throw new PolicyError("Dieses Projekt gehört zu einem anderen Kunden.");
    }
    await uniqueName(tx, d.name, d.parentId, d.id);
    const { id: folderId, revision, ...data } = d;
    if (folderId) {
      if (!revision)
        throw new PolicyError("Ordnerstand fehlt. Neu laden.", 409);
      const updated = await tx.libraryFolder.updateMany({
        where: { id: folderId, organizationId: ORG, revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new PolicyError(
          "Ordner wurde inzwischen geändert. Neu laden.",
          409,
        );
      await audit(tx, actor, "LIBRARY_FOLDER_UPDATED", folderId, {
        revision: revision + 1,
      });
      return { id: folderId };
    }
    const folder = await tx.libraryFolder.create({
      data: { ...data, organizationId: ORG },
    });
    await audit(tx, actor, "LIBRARY_FOLDER_CREATED", folder.id, {});
    return folder;
  });
}
const entries = z
  .array(z.object({ id, revision: z.number().int().positive() }).strict())
  .min(1)
  .max(500);
export async function moveLibraryItems(actor: string, raw: unknown) {
  const d = z
    .object({ items: entries, folderId: id.nullable() })
    .strict()
    .parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lockLibrary(tx);
    await accessibleFolder(tx, d.folderId);
    for (const entry of d.items) {
      const item = await tx.libraryItem.findFirst({
        where: { ...entry, organizationId: ORG, deletedAt: null },
      });
      if (!item)
        throw new PolicyError(
          "Inhalt geändert oder nicht verfügbar. Neu laden.",
          409,
        );
      await accessibleFolder(tx, item.folderId);
      await tx.libraryItem.update({
        where: { id: item.id },
        data: { folderId: d.folderId, revision: { increment: 1 } },
      });
    }
    await audit(tx, actor, "LIBRARY_ITEMS_MOVED", ORG, {
      ids: d.items.map((i) => i.id),
      folderId: d.folderId,
    });
    return { ok: true };
  });
}
export async function trashLibraryEntry(actor: string, raw: unknown) {
  const d = z
    .object({
      id,
      revision: z.number().int().positive(),
      type: z.enum(["folder", "item"]),
      restore: z.boolean(),
    })
    .strict()
    .parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await lockLibrary(tx);
    const where = { id: d.id, organizationId: ORG, revision: d.revision };
    if (d.type === "folder") {
      const folder = await tx.libraryFolder.findFirst({ where });
      if (!folder || Boolean(folder.deletedAt) !== d.restore)
        throw new PolicyError(
          "Ordner geändert oder nicht verfügbar. Neu laden.",
          409,
        );
      await accessibleFolder(tx, folder.parentId);
      if (d.restore)
        await uniqueName(tx, folder.name, folder.parentId, folder.id);
      // Descendants remain linked and are hidden via their ancestor. Restore
      // restores the subtree without reviving previously trashed children.
      await tx.libraryFolder.update({
        where: { id: folder.id },
        data: {
          deletedAt: d.restore ? null : new Date(),
          revision: { increment: 1 },
        },
      });
    } else {
      const item = await tx.libraryItem.findFirst({ where });
      if (!item || Boolean(item.deletedAt) !== d.restore)
        throw new PolicyError(
          "Inhalt geändert oder nicht verfügbar. Neu laden.",
          409,
        );
      await accessibleFolder(tx, item.folderId);
      await tx.libraryItem.update({
        where: { id: item.id },
        data: {
          deletedAt: d.restore ? null : new Date(),
          revision: { increment: 1 },
        },
      });
    }
    await audit(
      tx,
      actor,
      d.restore ? "LIBRARY_RESTORED" : "LIBRARY_TRASHED",
      d.id,
      { type: d.type },
    );
    return { ok: true };
  });
}
