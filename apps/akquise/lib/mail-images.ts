import sharp from "sharp";
import { createHash } from "node:crypto";
import { db } from "./db";
import { objectStore } from "./studio/storage";
import { storeAsset } from "./studio/assets";
import { ORG } from "./studio/input";
import { mailImageIds } from "./mail-content";
import { PolicyError } from "./policy";
export async function optimizeMailImage(bytes: Buffer) {
  let content: Buffer;
  try {
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format || "") ||
      (meta.pages || 1) > 1
    )
      throw new Error();
    content = await image
      .rotate()
      .resize({
        width: 520,
        height: 520,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new PolicyError(
      "Bitte ein JPG-, PNG- oder WebP-Bild bis 8 MB und 20 Megapixel wählen.",
    );
  }
  return content;
}
export async function uploadMailImage(actor: string, bytes: Buffer) {
  return storeAsset(
    actor,
    await optimizeMailImage(bytes),
    "Mailbild.jpg",
    "MOTIF",
  );
}
export async function mailImageAttachments(body: string) {
  const ids = mailImageIds(body);
  if (ids.length > 3)
    throw new PolicyError("Maximal drei Bilder pro Mail verwenden.");
  return Promise.all(
    ids.map(async (id) => {
      const asset = await db.studioAsset.findFirst({
        where: { id, organizationId: ORG, deletedAt: null },
      });
      if (!asset || !asset.mime.startsWith("image/"))
        throw new PolicyError(
          "Ein Mailbild ist nicht mehr verfügbar. Bitte das Bild ersetzen.",
        );
      const bytes = await objectStore().get(asset.objectKey);
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
        throw new PolicyError("Mailbild konnte nicht geprüft werden.");
      const content = await sharp(bytes, { limitInputPixels: 20_000_000 })
        .rotate()
        .resize({
          width: 520,
          height: 520,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      return {
        filename: "Projektbild.jpg",
        content,
        contentType: "image/jpeg",
        cid: `mail-${id}@studioone`,
        contentDisposition: "inline" as const,
      };
    }),
  );
}
