import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { signatureAssets } from "./mail-signature";

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
        content,
        contentType: asset.type,
        cid: asset.cid,
        contentDisposition: "inline" as const,
      };
    }),
  );
}
