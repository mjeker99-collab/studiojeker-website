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
  kind: "ORIGINAL" | "MOTIF" | "FONT" | "EXPORT" | "DOCUMENT",
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
  } else if (kind === "DOCUMENT") {
    if (name.toLowerCase().endsWith(".txt")) {
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
          throw new Error();
      } catch {
        throw new PolicyError("TXT muss gültiger UTF-8-Text sein.");
      }
      mime = "text/plain; charset=utf-8";
    } else if (
      name.toLowerCase().endsWith(".pdf") &&
      bytes.subarray(0, 5).toString() === "%PDF-" &&
      bytes.subarray(-1024).includes(Buffer.from("%%EOF")) &&
      /\/Type\s*\/Catalog\b/.test(bytes.toString("latin1")) &&
      /\bobj\b[\s\S]*\bendobj\b/.test(bytes.toString("latin1")) &&
      /\bstartxref\b/.test(bytes.toString("latin1"))
    ) {
      mime = "application/pdf";
    } else
      throw new PolicyError(
        "Nur PDF oder UTF-8-TXT bis 8 MB. PDF wird ausschliesslich abgelegt, nicht analysiert.",
      );
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
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const id = randomUUID(),
    objectKey = `${ORG}/${id}`;
  let uploaded = false;
  try {
    return await db.$transaction(
      async (tx) => {
        await hubActor(tx, actor);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"asset:" + ORG + sha256}))`;
        const existing = await tx.studioAsset.findFirst({
          where: { organizationId: ORG, sha256, kind, deletedAt: null },
        });
        if (existing && kind !== "EXPORT") {
          const original = await store.get(existing.objectKey);
          if (createHash("sha256").update(original).digest("hex") !== sha256)
            throw new PolicyError(
              "Vorhandene Datei ist beschädigt. Wiederverwendung blockiert; Wiederherstellung prüfen.",
              503,
            );
          return { ...existing, reused: true };
        }
        await store.put(objectKey, bytes, mime!);
        uploaded = true;
        const a = await tx.studioAsset.create({
          data: {
            id,
            organizationId: ORG,
            objectKey,
            name: name.replace(/[^\p{L}\p{N}_. -]/gu, "_").slice(0, 150),
            mime: mime!,
            kind,
            size: bytes.length,
            sha256,
            width,
            height,
            userId: actor,
          },
        });
        await tx.libraryItem.create({
          data: {
            assetId: id,
            organizationId: ORG,
            title: a.name,
            kind:
              kind === "FONT"
                ? "FONT"
                : kind === "EXPORT"
                  ? "EXPORT"
                  : kind === "DOCUMENT"
                    ? "DOCUMENT"
                    : "IMAGE",
            rights: ["ORIGINAL", "FONT", "DOCUMENT"].includes(kind)
              ? "Nutzungsrechte beim Upload bestätigt; Details ergänzen."
              : "Herkunft und Nutzungsrechte prüfen.",
            text:
              kind === "DOCUMENT" && mime!.startsWith("text/plain")
                ? new TextDecoder().decode(bytes).slice(0, 16000)
                : "",
          },
        });
        await audit(tx, actor, "STUDIO_ASSET_STORED", id, {
          kind,
          size: bytes.length,
          sha256,
        });
        return { ...a, reused: false };
      },
      { timeout: 30000, maxWait: 10000 },
    );
  } catch (e) {
    if (uploaded) await store.remove(objectKey).catch(() => {});
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
