import sharp, { type OverlayOptions } from "sharp";
import { ZipArchive } from "archiver";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db } from "../db";
import { hubActor, approvedContent } from "../hub/workflow";
import { contentInput } from "../hub/input";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { readAsset, storeAsset } from "./assets";
import { logoBytes, logoHash } from "./config";
import {
  ORG,
  dimensions,
  type StudioFormat,
  type StudioSnapshot,
} from "./input";
import type { ObjectStore } from "./storage";
import { graphicsBox, graphicsSchema } from "./graphics";
export function fontFamily(bytes: Buffer): string {
  // Read the actual SFNT name table; no invented family or fallback font.
  const count = bytes.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const p = 12 + i * 16;
    if (p + 16 > bytes.length) break;
    if (bytes.toString("ascii", p, p + 4) !== "name") continue;
    const off = bytes.readUInt32BE(p + 8);
    if (off + 6 > bytes.length) break;
    const n = bytes.readUInt16BE(off + 2),
      start = off + bytes.readUInt16BE(off + 4);
    for (let j = 0; j < n; j++) {
      const q = off + 6 + j * 12;
      if (q + 12 > bytes.length) break;
      const platform = bytes.readUInt16BE(q),
        id = bytes.readUInt16BE(q + 6),
        len = bytes.readUInt16BE(q + 8),
        pos = start + bytes.readUInt16BE(q + 10);
      if ((id !== 1 && id !== 16) || pos + len > bytes.length) continue;
      const chunk = Buffer.from(bytes.subarray(pos, pos + len));
      const name =
        platform === 0 || platform === 3
          ? chunk.swap16().toString("utf16le")
          : chunk.toString("latin1");
      if (/^[\p{L}\p{N} ._-]{1,100}$/u.test(name)) return name;
    }
  }
  throw new PolicyError("Schriftfamilie konnte nicht sicher gelesen werden.");
}
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export async function renderLayout(
  actor: string,
  s: StudioSnapshot,
  format: StudioFormat,
  encoding: "png" | "jpg",
  store?: ObjectStore,
) {
  if (!s.motifAssetId) throw new PolicyError("Zuerst ein Motiv zuordnen.");
  if (s.logoSha256 !== logoHash())
    throw new PolicyError(
      "Original-Logo wurde geändert. Neue Version erforderlich.",
      409,
    );
  const { bytes, asset } = await readAsset(actor, s.motifAssetId, store);
  if (asset.sha256 !== s.motifSha256)
    throw new PolicyError("Motiv-Prüfsumme stimmt nicht überein.", 409);
  const [width, height] = dimensions[format];
  const g = s.graphics ? graphicsSchema.parse(s.graphics) : undefined;
  const panelFraction = g ? g.panelTop / 100 : 0.7;
  const normalized = await sharp(bytes, { limitInputPixels: 20_000_000 })
    .rotate()
    .toBuffer();
  const m = await sharp(normalized).metadata();
  const imageHeight =
    s.template === "PANEL" ? Math.round(height * panelFraction) : height;
  const scale = Math.max(width / m.width!, imageHeight / m.height!) * s.zoom;
  const rw = Math.ceil(m.width! * scale),
    rh = Math.ceil(m.height! * scale);
  const background = await sharp(normalized)
    .resize(rw, rh)
    .extract({
      left: Math.round((rw - width) * s.cropX),
      top: Math.round((rh - imageHeight) * s.cropY),
      width,
      height: imageHeight,
    })
    .png()
    .toBuffer();
  const overlays: OverlayOptions[] = [{ input: background, left: 0, top: 0 }];
  const panelY =
    s.template === "PANEL" ? imageHeight : Math.round(height * panelFraction);
  if (s.template === "PHOTO")
    overlays.push({
      input: Buffer.from(
        `<svg width="${width}" height="${height - panelY}"><rect width="100%" height="100%" fill="#000000" fill-opacity="0.80"/></svg>`,
      ),
      left: 0,
      top: panelY,
    });
  overlays.push({
    input: Buffer.from(
      `<svg width="${width}" height="8"><rect width="100%" height="8" fill="${s.brandProfile?.colors.cyan || "#00c8ff"}"/></svg>`,
    ),
    left: 0,
    top: panelY,
  });

  if ((s.showHeadline && s.headline) || s.showClaim) {
    if (!s.fontAssetId)
      throw new PolicyError(
        "Freigegebene Original-Schriftdatei fehlt. Schrift hochladen oder Textebene ausblenden.",
        409,
      );
    const font = await readAsset(actor, s.fontAssetId, store);
    if (font.asset.kind !== "FONT" || font.asset.sha256 !== s.fontSha256)
      throw new PolicyError("Schriftversion nicht gültig.", 409);
    const family = fontFamily(font.bytes);
    // Pango caches registered file paths. Keep an immutable per-hash cache
    // for the runtime lifetime; deleting each temporary file causes fallback
    // or "scaled_font: file not found" on the next export. S3 remains canonical.
    const cache = join(tmpdir(), "studio-brand-fonts");
    await mkdir(cache, { recursive: true, mode: 0o700 });
    const fontPath = join(cache, `${font.asset.sha256}.ttf`);
    try {
      await writeFile(fontPath, font.bytes, { mode: 0o600, flag: "wx" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    if (
      createHash("sha256")
        .update(await readFile(fontPath))
        .digest("hex") !== font.asset.sha256
    )
      throw new PolicyError(
        "Schriftcache-Prüfsumme stimmt nicht überein.",
        503,
      );
    process.env.XDG_CACHE_HOME ||= join(tmpdir(), "studio-fontconfig-cache");
    await mkdir(process.env.XDG_CACHE_HOME, { recursive: true, mode: 0o700 });
    if (s.showHeadline && s.headline) {
      const box = g
        ? graphicsBox(g, "headline", width, height)
        : {
            left: 48,
            top: panelY + 30,
            width: width - 96,
            height: height - panelY - 180,
          };
      const availableHeight = box.height;
      let text: Buffer | undefined;
      for (
        let size = g?.fontSize || 64;
        size >= (g ? 24 : 32);
        size -= g ? 1 : 4
      ) {
        const candidate = await sharp({
          text: {
            text: `<span foreground="${s.brandProfile?.colors.white || "#ffffff"}">${escape(s.headline)}</span>`,
            font: `${family} ${size}`,
            fontfile: fontPath,
            width: box.width,
            align: g?.align || "left",
            rgba: true,
            wrap: "word-char",
          },
        })
          .png()
          .toBuffer();
        if ((await sharp(candidate).metadata()).height! <= availableHeight) {
          text = candidate;
          break;
        }
      }
      if (!text)
        throw new PolicyError(
          "Headline passt nicht in diese Vorlage. Bitte kürzen.",
        );
      overlays.push({ input: text, left: box.left, top: box.top });
    }
    if (
      s.showClaim &&
      (s.brandProfile ? s.brandProfile.claim : "We create visibility")
    ) {
      const text = await sharp({
        text: {
          text: `<span foreground="${s.brandProfile?.colors.cyan || "#00c8ff"}">${escape(s.brandProfile ? s.brandProfile.claim : "We create visibility")}</span>`,
          font: `${family} 28`,
          fontfile: fontPath,
          ...(g
            ? { width: Math.round(width * 0.62), wrap: "word-char" as const }
            : {}),
          rgba: true,
        },
      })
        .png()
        .toBuffer();
      if (g && (await sharp(text).metadata()).height! > 54)
        throw new PolicyError(
          "Claim passt nicht in die Fusszeile. Bitte kürzen oder ausblenden.",
        );
      overlays.push({ input: text, left: 48, top: height - (g ? 64 : 54) });
    }
  }
  if (s.showLogo) {
    // Exact original SVG bytes; preserve its aspect ratio and colours.
    const logoId = g?.logoAssetId || s.brandProfile?.logoAssetId;
    const logoSha = g?.logoAssetId ? g.logoSha256 : s.brandLogoSha256;
    const originalLogo = logoId ? await readAsset(actor, logoId, store) : null;
    if (originalLogo && originalLogo.asset.sha256 !== logoSha)
      throw new PolicyError("Markenlogo-Prüfsumme stimmt nicht überein.", 409);
    const box = g ? graphicsBox(g, "logo", width, height) : null;
    const logo = await sharp(originalLogo?.bytes || logoBytes())
      .resize(
        box
          ? { width: box.width, height: box.height, fit: "inside" }
          : { width: 220 },
      )
      .png()
      .toBuffer();
    const lm = await sharp(logo).metadata();
    const plate = await sharp({
      create: {
        width: 244,
        height: lm.height! + 24,
        channels: 4,
        background: "#ffffff",
      },
    })
      .png()
      .toBuffer();
    if (!box)
      overlays.push({
        input: plate,
        left: width - 220 - 52,
        top: height - lm.height! - 36,
      });
    overlays.push({
      input: logo,
      left: box ? box.left : width - 220 - 40,
      top: box ? box.top : height - lm.height! - 24,
    });
  }
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: s.brandProfile?.colors.black || "#000000",
    },
  }).composite(overlays);
  return encoding === "jpg"
    ? image
        .flatten({ background: s.brandProfile?.colors.black || "#000000" })
        .jpeg({ quality: 92 })
        .toBuffer()
    : image.png().toBuffer();
}
export function channelTexts(payload: ReturnType<typeof contentInput.parse>) {
  return payload.variants
    .map(
      (v) =>
        `${v.channel}\n\n${payload.studio?.headline || payload.title}\n\n${v.text}\n\n${v.cta}\n${v.link}\n${payload.studio?.hashtags || ""}`,
    )
    .join("\n\n--------------------\n\n");
}
// In-process guard bounds native image memory; Render V1 runs one web instance.
let rendering = false;
export async function exportContent(
  actor: string,
  id: string,
  version: number,
  format: StudioFormat,
  encoding: "png" | "jpg",
  preview: boolean,
  store?: ObjectStore,
) {
  if (rendering)
    throw new PolicyError("Ein Export läuft bereits. Bitte warten.", 429);
  rendering = true;
  try {
    const payload = await db.$transaction(async (tx) => {
      await hubActor(tx, actor);
      if (!preview) return (await approvedContent(tx, id, version)).payload;
      const c = await tx.marketingContent.findFirst({
        where: { id, organizationId: ORG, version },
        include: { versions: { where: { version } } },
      });
      if (!c) throw new PolicyError("Version wurde geändert.", 409);
      return contentInput.parse(c.versions[0].payload);
    });
    if (!payload.studio || !payload.studio.formats.includes(format))
      throw new PolicyError("Studio-Format nicht ausgewählt.");
    const bytes = await renderLayout(
      actor,
      payload.studio,
      format,
      encoding,
      store,
    );
    if (!preview)
      await db.$transaction((tx) => approvedContent(tx, id, version));
    const asset = await storeAsset(
      actor,
      bytes,
      `${preview ? "vorschau" : "sujet"}-${id}-v${version}-${format.replace(":", "x")}.${encoding}`,
      "EXPORT",
      encoding === "jpg" ? "image/jpeg" : "image/png",
      store,
    );
    await db.libraryItem.updateMany({
      where: { assetId: asset.id, organizationId: ORG },
      data: {
        parentAssetId: payload.studio.motifAssetId,
        campaignId: payload.campaignId,
        description: `${preview ? "Vorschau" : "Sujet"} aus Beitrag ${id}, Version ${version}, ${format}`,
      },
    });
    await db.$transaction((tx) =>
      audit(tx, actor, preview ? "STUDIO_PREVIEW" : "STUDIO_EXPORT", id, {
        version,
        format,
        assetId: asset.id,
      }),
    );
    return {
      assetId: asset.id,
      url: `/api/studio/assets/${asset.id}`,
      name: asset.name,
    };
  } finally {
    rendering = false;
  }
}
export async function exportSeries(
  actor: string,
  id: string,
  store?: ObjectStore,
) {
  if (rendering)
    throw new PolicyError("Ein Export läuft bereits. Bitte warten.", 429);
  rendering = true;
  try {
    const snapshots = await db.$transaction(async (tx) => {
      await hubActor(tx, actor);
      const series = await tx.studioSeries.findFirst({
        where: { id, organizationId: ORG },
        include: { contents: { orderBy: { createdAt: "asc" } } },
      });
      if (!series || !series.contents.length)
        throw new PolicyError("Serie nicht gefunden.", 404);
      const values = [];
      for (const c of series.contents)
        values.push({
          id: c.id,
          version: c.version,
          payload: (await approvedContent(tx, c.id, c.version)).payload,
        });
      return values;
    });
    const archive = new ZipArchive({ zlib: { level: 3 } }),
      chunks: Buffer[] = [];
    let size = 0;
    const finished = new Promise<Buffer>((resolve, reject) => {
      archive.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 96 * 1024 * 1024) {
          archive.abort();
          reject(
            new PolicyError(
              "ZIP überschreitet 96 MB. Einzelbeiträge exportieren.",
              413,
            ),
          );
        } else chunks.push(chunk);
      });
      archive.on("error", reject);
      archive.on("end", () => resolve(Buffer.concat(chunks)));
    });
    // Attach rejection handler while native image work is in progress.
    void finished.catch(() => {});
    try {
      for (let i = 0; i < snapshots.length; i++) {
        const c = snapshots[i],
          s = c.payload.studio!;
        if (!s?.motifAssetId)
          throw new PolicyError("Alle Beiträge benötigen ein Motiv.");
        const prefix = `${String(i + 1).padStart(2, "0")}-${c.id}-v${c.version}`;
        archive.append(channelTexts(c.payload), {
          name: `${prefix}-kanaltexte.txt`,
        });
        const original = await readAsset(actor, s.motifAssetId, store);
        archive.append(original.bytes, {
          name: `${prefix}-motiv.${original.asset.mime === "image/jpeg" ? "jpg" : original.asset.mime === "image/webp" ? "webp" : "png"}`,
        });
        for (const format of s.formats)
          archive.append(await renderLayout(actor, s, format, "png", store), {
            name: `${prefix}-${format.replace(":", "x")}.png`,
          });
      }
      await archive.finalize();
      const bytes = await finished;
      // Recheck all exact versions immediately before issuing final export.
      await db.$transaction(async (tx) => {
        for (const c of snapshots) await approvedContent(tx, c.id, c.version);
      });
      const asset = await storeAsset(
        actor,
        bytes,
        `studio-serie-${id}.zip`,
        "EXPORT",
        "application/zip",
        store,
      );
      await db.libraryItem.updateMany({
        where: { assetId: asset.id, organizationId: ORG },
        data: {
          source: `Studio-Serie ${id}`,
          description: `ZIP aus ${snapshots.map((c) => `${c.id} v${c.version}`).join(", ")}`,
        },
      });
      await db.$transaction((tx) =>
        audit(tx, actor, "STUDIO_SERIES_EXPORTED", id, {
          assetId: asset.id,
          versions: snapshots.map((c) => ({ id: c.id, version: c.version })),
        }),
      );
      return {
        assetId: asset.id,
        url: `/api/studio/assets/${asset.id}`,
        name: asset.name,
      };
    } catch (e) {
      archive.abort();
      throw e;
    }
  } finally {
    rendering = false;
  }
}

export async function exportMotif(
  actor: string,
  id: string,
  version: number,
  encoding: "png" | "jpg",
  store?: ObjectStore,
) {
  if (rendering)
    throw new PolicyError("Ein Export läuft bereits. Bitte warten.", 429);
  rendering = true;
  try {
    await db.$transaction((tx) => hubActor(tx, actor));
    const c = await db.marketingContent.findFirst({
      where: { id, organizationId: ORG, version },
      include: { versions: { where: { version } } },
    });
    if (!c) throw new PolicyError("Version wurde geändert.", 409);
    const s = contentInput.parse(c.versions[0].payload).studio;
    if (!s?.motifAssetId) throw new PolicyError("Kein Motiv zugeordnet.");
    const original = await readAsset(actor, s.motifAssetId, store);
    if (original.asset.sha256 !== s.motifSha256)
      throw new PolicyError("Motiv-Prüfsumme stimmt nicht überein.", 409);
    const pipeline = sharp(original.bytes, {
      limitInputPixels: 20_000_000,
    }).rotate();
    const bytes =
      encoding === "jpg"
        ? await pipeline
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 92 })
            .toBuffer()
        : await pipeline.png().toBuffer();
    const asset = await storeAsset(
      actor,
      bytes,
      `motiv-${id}-v${version}.${encoding}`,
      "EXPORT",
      encoding === "jpg" ? "image/jpeg" : "image/png",
      store,
    );
    await db.libraryItem.updateMany({
      where: { assetId: asset.id, organizationId: ORG },
      data: {
        parentAssetId: s.motifAssetId,
        description: `Reines Motiv aus Beitrag ${id}, Version ${version}`,
      },
    });
    await db.$transaction((tx) =>
      audit(tx, actor, "STUDIO_MOTIF_EXPORTED", id, {
        version,
        assetId: asset.id,
        encoding,
      }),
    );
    return {
      assetId: asset.id,
      url: `/api/studio/assets/${asset.id}`,
      name: asset.name,
    };
  } finally {
    rendering = false;
  }
}
