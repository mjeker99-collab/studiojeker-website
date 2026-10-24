import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { signatureAssets } from "./mail-signature";
import sharp from "sharp";

export async function signatureAttachments() {
  return Promise.all(
    signatureAssets.map(async (asset) => {
      const content = await readFile(
        join(process.cwd(), "brand/mail", asset.file),
      );
      if (createHash("sha256").update(content).digest("hex") !== asset.sha256)
        throw new Error(
          "Signaturbild stimmt nicht mit der freigegebenen Version überein.",
        );
      return {
        filename: asset.file,
        // Intrinsic size is the fallback when a mail client strips HTML sizing
        // during forwarding. Never attach the full-resolution originals.
        content: await sharp(content)
          .rotate()
          .resize({ width: asset.width, withoutEnlargement: true })
          .toBuffer(),
        contentType: asset.type,
        cid: asset.cid,
        contentDisposition: "inline" as const,
      };
    }),
  );
}
