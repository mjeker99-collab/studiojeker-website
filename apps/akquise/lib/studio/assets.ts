import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { objectStore, type ObjectStore } from "./storage";
import { ORG } from "./input";
sharp.concurrency(1);
sharp.cache({ memory: 16, files: 0, items: 16 });
export const MAX_UPLOAD = 8 * 1024 * 1024;
export async function storeAsset(
  actor: string,
  bytes: Buffer,
  name: string,
  kind: "ORIGINAL" | "MOTIF" | "FONT" | "EXPORT",
  mime?: string,
  store: ObjectStore = objectStore(),
) {
  if (
    !bytes.length ||
    bytes.length > (kind === "EXPORT" ? 96 * 1024 * 1024 : MAX_UPLOAD)
  )
    throw new PolicyError("Datei zu gross oder leer.", 413);
  let width: number | undefined, height: number | undefined;
  if (kind === "FONT") {
    const sig = bytes.subarray(0, 4).toString("hex");
    if (!["00010000", "4f54544f"].includes(sig) || bytes.length < 64)
      throw new PolicyError("Nur geprüfte TTF-/OTF-Schriftdateien erlaubt.");
    mime = sig === "4f54544f" ? "font/otf" : "font/ttf";
  } else if (kind !== "EXPORT") {
    try {
      const m = await sharp(bytes, {
        limitInputPixels: 20_000_000,
        animated: false,
      }).metadata();
      if (
        !m.width ||
        !m.height ||
        !["jpeg", "png", "webp"].includes(m.format || "") ||
        (m.pages || 1) > 1
      )
        throw new Error();
      // Decode all pixels before accepting, reject malformed/truncated and oversized input.
      await sharp(bytes, {
        limitInputPixels: 20_000_000,
        failOn: "warning",
      }).stats();
      mime = m.format === "jpeg" ? "image/jpeg" : `image/${m.format}`;
      width = m.width;
      height = m.height;
    } catch {
      throw new PolicyError(
        "Ungültiges Bild. JPEG, PNG oder WebP bis 8 MB und 20 Megapixel verwenden.",
      );
    }
  }
  const id = randomUUID(),
    objectKey = `${ORG}/${id}`;
  await db.$transaction((tx) => hubActor(tx, actor));
  await store.put(objectKey, bytes, mime!);
  try {
    return await db.$transaction(async (tx) => {
      await hubActor(tx, actor);
      const a = await tx.studioAsset.create({
        data: {
          id,
          organizationId: ORG,
          objectKey,
          name: name.replace(/[^\p{L}\p{N}_. -]/gu, "_").slice(0, 150),
          mime: mime!,
          kind,
          size: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          width,
          height,
          userId: actor,
        },
      });
      await audit(tx, actor, "STUDIO_ASSET_STORED", id, {
        kind,
        size: bytes.length,
        sha256: a.sha256,
      });
      return a;
    });
  } catch (e) {
    await store.remove(objectKey).catch(() => {});
    throw e;
  }
}
export async function readAsset(
  actor: string,
  id: string,
  store: ObjectStore = objectStore(),
) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const asset = await db.studioAsset.findFirst({
    where: { id, organizationId: ORG, deletedAt: null },
  });
  if (!asset) throw new PolicyError("Datei nicht gefunden.", 404);
  const bytes = await store.get(asset.objectKey);
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    throw new PolicyError("Datei-Prüfsumme stimmt nicht überein.", 503);
  return { asset, bytes };
}
