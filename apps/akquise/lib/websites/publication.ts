import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit } from "../workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { readAsset } from "../studio/assets";
import { objectStore, type ObjectStore } from "../studio/storage";
import { validatedDocument, type WebsiteDocument } from "./input";
import { websiteHtml, websiteZip } from "./render";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export function websiteAssetIds(doc: WebsiteDocument) {
  return [
    ...new Set(
      doc.pages.flatMap((p) =>
        p.sections.flatMap((s) => (s.imageAssetId ? [s.imageAssetId] : [])),
      ),
    ),
  ];
}
const manifestSchema = z.array(
  z.object({
    id: z.string(),
    sha256: z.string(),
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  }),
);
export async function websiteExport(actor: string, doc: WebsiteDocument) {
  const assets = [];
  let total = 0;
  for (const id of websiteAssetIds(doc)) {
    const { asset, bytes } = await readAsset(actor, id);
    if (!imageTypes.includes(asset.mime))
      throw new PolicyError("Nur JPEG-, PNG- und WebP-Bilder verwenden.");
    total += bytes.length;
    if (total > 32 * 1024 * 1024)
      throw new PolicyError(
        "Website-Bilder dürfen zusammen höchstens 32 MB umfassen.",
        413,
      );
    assets.push({ id, mime: asset.mime, bytes });
  }
  return websiteZip(doc, assets);
}
export async function publicationMutation(
  actor: string,
  id: string,
  action: string,
  raw: unknown,
) {
  const base = z.object({
    version: z.number().int().positive(),
    revision: z.number().int().nonnegative(),
  });
  const input =
    action === "publish"
      ? base
          .extend({
            slug: z.string().regex(/^[a-z][a-z0-9-]{2,60}$/),
            confirmedPublic: z.literal(true),
          })
          .strict()
          .parse(raw)
      : base.strict().parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"website:" + id}))`;
    const project = await tx.websiteProject.findFirst({
      where: { id, organizationId: ORG },
      include: {
        publication: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!project) throw new PolicyError("Website nicht zugänglich.", 404);
    if (
      project.version !== input.version ||
      (project.publication?.revision || 0) !== input.revision
    )
      throw new PolicyError(
        "Website oder Veröffentlichung inzwischen geändert. Bitte neu laden.",
        409,
      );
    if (action === "unpublish") {
      if (!project.publication)
        throw new PolicyError("Website ist noch nicht veröffentlicht.", 409);
      await tx.websitePublication.update({
        where: { projectId: id },
        data: { active: false, revision: { increment: 1 } },
      });
      await audit(tx, actor, "WEBSITE_UNPUBLISHED", id, {
        version: input.version,
      });
      return { ok: true };
    }
    if (!("slug" in input) || typeof input.slug !== "string")
      throw new PolicyError("Ungültige Aktion.");
    // The address remains stable, including after withdrawal and republication.
    const slug = project.publication?.slug || input.slug;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"website-slug:" + slug}))`;
    const occupied = await tx.websitePublication.findUnique({
      where: { slug },
    });
    if (occupied && occupied.projectId !== id)
      throw new PolicyError("Diese Webadresse ist bereits vergeben.", 409);
    const doc = validatedDocument.parse(project.versions[0].payload);
    const media = [];
    let total = 0;
    for (const assetId of websiteAssetIds(doc)) {
      const asset = await tx.studioAsset.findFirst({
        where: {
          id: assetId,
          organizationId: ORG,
          deletedAt: null,
          mime: { in: imageTypes },
        },
      });
      if (!asset)
        throw new PolicyError(
          "Ein ausgewähltes Bild ist nicht mehr verfügbar.",
          409,
        );
      total += asset.size;
      if (total > 32 * 1024 * 1024)
        throw new PolicyError(
          "Website-Bilder dürfen zusammen höchstens 32 MB umfassen.",
          413,
        );
      media.push({ id: asset.id, sha256: asset.sha256, mime: asset.mime });
    }
    // Only the rendered content is published; briefing and conversation stay private.
    const payload = { ...doc, briefing: "" };
    const data = {
      slug,
      version: input.version,
      payload,
      media,
      active: true,
      publishedBy: actor,
      publishedAt: new Date(),
    };
    await tx.websitePublication.upsert({
      where: { projectId: id },
      create: { projectId: id, ...data },
      update: { ...data, revision: { increment: 1 } },
    });
    await audit(tx, actor, "WEBSITE_PUBLISHED", id, {
      version: input.version,
      slug,
    });
    return { ok: true, url: `/sites/${slug}/index.html` };
  });
}

// Public access is restricted to a publication snapshot and its exact image manifest.
export async function publicWebsite(
  slug: string,
  path: string[],
  store?: ObjectStore,
) {
  const publication = await db.websitePublication.findFirst({
    where: { slug, active: true, project: { organizationId: ORG } },
  });
  if (!publication) throw new PolicyError("Seite nicht gefunden.", 404);
  const media = manifestSchema.parse(publication.media);
  if (path.length === 2 && path[0] === "media") {
    const entry = media.find((m) => m.id === path[1]);
    if (!entry) throw new PolicyError("Bild nicht gefunden.", 404);
    const asset = await db.studioAsset.findFirst({
      where: {
        id: entry.id,
        organizationId: ORG,
        deletedAt: null,
        sha256: entry.sha256,
        mime: entry.mime,
      },
    });
    if (!asset) throw new PolicyError("Bild nicht gefunden.", 404);
    const bytes = await (store || objectStore()).get(asset.objectKey);
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new PolicyError("Bild nicht verfügbar.", 404);
    return { body: new Uint8Array(bytes), mime: entry.mime };
  }
  if (
    path.length !== 1 ||
    !/^(index|[a-z][a-z0-9-]{0,60})\.html$/.test(path[0])
  )
    throw new PolicyError("Seite nicht gefunden.", 404);
  const doc = validatedDocument.parse(publication.payload);
  const page = path[0].slice(0, -5);
  if (!doc.pages.some((p) => p.slug === page))
    throw new PolicyError("Seite nicht gefunden.", 404);
  return {
    body: websiteHtml(
      doc,
      page,
      Object.fromEntries(
        media.map((m) => [m.id, `/sites/${slug}/media/${m.id}`]),
      ),
    ),
    mime: "text/html; charset=utf-8",
  };
}
