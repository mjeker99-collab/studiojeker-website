import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit } from "../workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { publicConfig } from "../studio/config";
import { itemInput, brandInput, brandDefaults } from "./input";
import { z } from "zod";
export async function libraryState(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const [items, organization, campaigns, contents, series] = await Promise.all([
    db.libraryItem.findMany({
      where: { organizationId: ORG },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            mime: true,
            size: true,
            sha256: true,
            kind: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.studioOrganization.findUniqueOrThrow({ where: { id: ORG } }),
    db.campaign.findMany({
      where: { organizationId: ORG },
      select: { id: true, title: true },
    }),
    db.marketingContent.findMany({
      where: { organizationId: ORG },
      select: {
        id: true,
        title: true,
        versions: { select: { version: true, payload: true } },
      },
    }),
    db.studioSeries.findMany({
      where: { organizationId: ORG },
      select: {
        briefing: true,
        contents: { select: { id: true, title: true, version: true } },
      },
    }),
  ]);
  // Only return usage identifiers, never another workspace's data or object-store keys.
  return {
    items: items.map((i) => ({
      ...i,
      usage: [
        ...contents.flatMap((c) =>
          c.versions
            .filter((v) => {
              const s = (
                v.payload as {
                  studio?: {
                    motifAssetId?: string;
                    fontAssetId?: string;
                    brandProfile?: { logoAssetId?: string };
                  };
                }
              ).studio;
              return (
                !!i.assetId &&
                [
                  s?.motifAssetId,
                  s?.fontAssetId,
                  s?.brandProfile?.logoAssetId,
                ].includes(i.assetId)
              );
            })
            .map((v) => ({ id: c.id, title: c.title, version: v.version })),
        ),
        ...series.flatMap((s) => {
          const b = s.briefing as {
            referenceAssetIds?: string[];
            libraryReferenceIds?: string[];
          };
          if (
            !(i.assetId && b.referenceAssetIds?.includes(i.assetId)) &&
            !b.libraryReferenceIds?.includes(i.id)
          )
            return [];
          return s.contents.map((c) => ({
            id: c.id,
            title: `${c.title} (Briefingreferenz)`,
            version: c.version,
          }));
        }),
      ],
    })),
    organization: { id: organization.id, name: organization.name },
    brand: brandDefaults(organization.brand),
    brandRevision: organization.brandRevision,
    campaigns,
    config: publicConfig(),
  };
}
export async function saveLibraryItem(actor: string, raw: unknown) {
  const d = itemInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    if (
      d.campaignId &&
      !(await tx.campaign.findFirst({
        where: { id: d.campaignId, organizationId: ORG },
      }))
    )
      throw new PolicyError("Kampagne nicht zugänglich.", 403);
    if (
      d.thumbnailAssetId &&
      !(await tx.studioAsset.findFirst({
        where: {
          id: d.thumbnailAssetId,
          organizationId: ORG,
          deletedAt: null,
          mime: { startsWith: "image/" },
        },
      }))
    )
      throw new PolicyError("Vorschaubild nicht zugänglich.", 403);
    if (d.id) {
      const old = await tx.libraryItem.findFirst({
        where: { id: d.id, organizationId: ORG },
      });
      if (!old) throw new PolicyError("Inhalt nicht zugänglich.", 403);
      if (old.kind !== d.kind)
        throw new PolicyError("Inhaltstyp kann nicht geändert werden.");
      const r = await tx.libraryItem.updateMany({
        where: { id: d.id, revision: d.revision, organizationId: ORG },
        data: {
          ...d,
          id: undefined,
          text: old.assetId ? old.text : d.text,
          revision: { increment: 1 },
        },
      });
      if (!r.count)
        throw new PolicyError(
          "Inhalt wurde inzwischen geändert. Neu laden.",
          409,
        );
      await audit(tx, actor, "LIBRARY_UPDATED", d.id, {
        revision: (d.revision || 0) + 1,
      });
      return { id: d.id };
    }
    if (!["TEXT", "VIDEO", "LINK"].includes(d.kind))
      throw new PolicyError("Dateien über Upload hinzufügen.");
    if (d.kind === "TEXT" ? !d.text : !d.url)
      throw new PolicyError("Text beziehungsweise Link fehlt.");
    const item = await tx.libraryItem.create({
      data: { ...d, id: undefined, revision: 1, organizationId: ORG },
    });
    await audit(tx, actor, "LIBRARY_CREATED", item.id, { kind: d.kind });
    return item;
  });
}
export async function archiveItem(actor: string, raw: unknown) {
  const d = z
    .object({
      id: z.string(),
      revision: z.number().int().positive(),
      archived: z.boolean(),
    })
    .strict()
    .parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const r = await tx.libraryItem.updateMany({
      where: { id: d.id, organizationId: ORG, revision: d.revision },
      data: {
        archivedAt: d.archived ? new Date() : null,
        revision: { increment: 1 },
      },
    });
    if (!r.count)
      throw new PolicyError("Inhalt geändert oder nicht zugänglich.", 409);
    await audit(tx, actor, "LIBRARY_ARCHIVED", d.id, { archived: d.archived });
    return { ok: true };
  });
}
export async function saveBrand(actor: string, raw: unknown) {
  const { revision, ...b } = brandInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    for (const id of [b.logoAssetId, ...b.logoVariants, b.fontAssetId].filter(
      Boolean,
    )) {
      const a = await tx.studioAsset.findFirst({
        where: { id: id!, organizationId: ORG, deletedAt: null },
      });
      if (
        !a ||
        (id === b.fontAssetId
          ? a.kind !== "FONT"
          : !a.mime.startsWith("image/"))
      )
        throw new PolicyError(
          "Markendatei nicht zugänglich oder falscher Dateityp.",
          403,
        );
    }
    if (b.fontAssetId && !b.fontLicense)
      throw new PolicyError("Schriftlizenz dokumentieren.");
    const r = await tx.studioOrganization.updateMany({
      where: { id: ORG, brandRevision: revision },
      data: {
        brand: b as Prisma.InputJsonValue,
        brandRevision: { increment: 1 },
      },
    });
    if (!r.count)
      throw new PolicyError(
        "Markenprofil wurde inzwischen geändert. Neu laden.",
        409,
      );
    await audit(tx, actor, "BRAND_UPDATED", ORG, {
      revision: revision + 1,
      profile: b,
    });
    return { ok: true };
  });
}
