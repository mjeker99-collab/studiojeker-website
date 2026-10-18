import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { PolicyError } from "../policy";

export const driveId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
export const folderMime = "application/vnd.google-apps.folder";
export const imageMimes = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DRIVE_IMAGE = 8 * 1024 * 1024;
const metadataSchema = z.object({
  id: driveId,
  name: z.string(),
  mimeType: z.string(),
  trashed: z.boolean(),
  parents: z.array(driveId).default([]),
  size: z.string().optional(),
  version: z.string().optional(),
  md5Checksum: z.string().optional(),
  capabilities: z.object({ canDownload: z.boolean().optional() }).optional(),
});
export type DriveImage = {
  id: string;
  name: string;
  mimeType: string;
  version: string;
  md5Checksum: string;
};

export async function driveRequest(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  url.search = new URLSearchParams(params).toString();
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new PolicyError("Google Drive ist momentan nicht erreichbar.", 502);
  }
  if (!response.ok)
    throw new PolicyError(
      `Google Drive meldet HTTP ${response.status}. Freigabe und aktivierte Drive API prüfen.`,
      502,
    );
  return response;
}

/** Only explicit descendants of the selected root; never follow shortcuts. */
export class DriveFiles {
  constructor(
    private token: string,
    private root: string,
  ) {
    driveId.parse(root);
  }

  private async metadata(id: string) {
    const response = await driveRequest(
      this.token,
      `files/${driveId.parse(id)}`,
      {
        fields:
          "id,name,mimeType,trashed,parents,size,version,md5Checksum,capabilities(canDownload)",
        supportsAllDrives: "true",
      },
    );
    return metadataSchema.parse(await response.json());
  }

  async withinRoot(id: string) {
    const file = await this.metadata(id);
    let current = file;
    const visited = new Set<string>();
    for (let depth = 0; depth < 32; depth++) {
      if (
        current.trashed ||
        visited.has(current.id) ||
        current.mimeType === "application/vnd.google-apps.shortcut"
      )
        break;
      visited.add(current.id);
      if (current.id === this.root && current.mimeType === folderMime)
        return file;
      if (current.parents.length !== 1) break;
      current = await this.metadata(current.parents[0]);
      if (current.mimeType !== folderMime) break;
    }
    throw new PolicyError(
      "Datei liegt nicht im ausgewählten Drive-Ordner oder ist nicht mehr verfügbar.",
      403,
    );
  }

  async image(id: string): Promise<DriveImage> {
    const file = await this.withinRoot(id);
    if (!imageMimes.includes(file.mimeType) || !file.capabilities?.canDownload)
      throw new PolicyError(
        "Nur herunterladbare JPEG-, PNG- oder WebP-Bilder auswählen.",
      );
    const size = Number(file.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_DRIVE_IMAGE)
      throw new PolicyError("Drive-Bild ist leer oder grösser als 8 MB.", 413);
    if (!file.version || !file.md5Checksum)
      throw new PolicyError("Drive-Bild kann nicht eindeutig geprüft werden.");
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      version: file.version,
      md5Checksum: file.md5Checksum,
    };
  }

  async readImage(expected: DriveImage, preview = false) {
    const check = async () => {
      const actual = await this.image(expected.id);
      if (
        actual.version !== expected.version ||
        actual.md5Checksum !== expected.md5Checksum ||
        actual.mimeType !== expected.mimeType
      )
        throw new PolicyError(
          "Drive-Bild wurde geändert. Bitte neu auswählen und bestätigen.",
          409,
        );
    };
    await check();
    const response = await driveRequest(
      this.token,
      `files/${driveId.parse(expected.id)}`,
      {
        alt: "media",
        supportsAllDrives: "true",
      },
    );
    const reader = response.body?.getReader();
    if (!reader) throw new PolicyError("Drive-Bild ist leer.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_DRIVE_IMAGE) {
          await reader.cancel();
          throw new PolicyError("Drive-Bild ist grösser als 8 MB.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    if (createHash("md5").update(bytes).digest("hex") !== expected.md5Checksum)
      throw new PolicyError(
        "Drive-Bild wurde während des Ladens geändert.",
        409,
      );
    // Recheck ancestry and version after download, including moves or revoked access.
    await check();
    try {
      const options = {
        limitInputPixels: 20_000_000,
        failOn: "warning" as const,
      };
      const metadata = await sharp(bytes, options).metadata();
      const mime =
        metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
      if (mime !== expected.mimeType || (metadata.pages || 1) > 1)
        throw new Error();
      // Fully decode, orient, resize and remove metadata before either preview or AI transfer.
      const normalized = await sharp(bytes, options)
        .rotate()
        .resize({
          width: preview ? 512 : 2048,
          height: preview ? 512 : 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      if (normalized.length > MAX_DRIVE_IMAGE) throw new Error();
      return { bytes: normalized, mime: "image/png" };
    } catch {
      throw new PolicyError(
        "Ungültiges Bild. JPEG, PNG oder WebP bis 8 MB und 20 Megapixel verwenden.",
      );
    }
  }
}
