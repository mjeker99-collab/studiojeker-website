import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { DriveFiles, folderMime, MAX_DRIVE_IMAGE } from "../lib/drive/files";

test("Drive images: nested folders, bounded bytes, versions and image validation", async (t) => {
  const bytes = await sharp({
    create: { width: 24, height: 12, channels: 3, background: "cyan" },
  })
    .jpeg()
    .toBuffer();
  const checksum = (b: Buffer) => createHash("md5").update(b).digest("hex");
  const folder = (id: string, parents: string[] = []) => ({
    id,
    name: id,
    mimeType: folderMime,
    trashed: false,
    parents,
  });
  const baseImage = {
    id: "photo",
    name: "Nora.jpg",
    mimeType: "image/jpeg",
    trashed: false,
    parents: ["nested"],
    size: String(bytes.length),
    version: "1",
    md5Checksum: checksum(bytes),
    capabilities: { canDownload: true },
  };
  const metadata: Record<string, Record<string, unknown>> = {
    root: folder("root"),
    nested: folder("nested", ["root"]),
    photo: { ...baseImage },
    outside: folder("outside"),
  };
  let downloaded = 0;
  let responseBytes = bytes;
  let afterDownload = () => {};
  t.mock.method(
    globalThis,
    "fetch",
    async (input: URL | string, init?: RequestInit) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://www.googleapis.com");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer synthetic",
      );
      const id = url.pathname.split("/").at(-1)!;
      if (url.searchParams.get("alt") === "media") {
        downloaded++;
        afterDownload();
        return new Response(new Uint8Array(responseBytes));
      }
      return new Response(JSON.stringify(metadata[id]), {
        status: metadata[id] ? 200 : 404,
      });
    },
  );
  const reader = new DriveFiles("synthetic", "root");
  const selected = await reader.image("photo");
  const result = await reader.readImage(selected);
  assert.equal(result.mime, "image/png");
  assert.equal((await sharp(result.bytes).metadata()).width, 24);
  assert.equal(downloaded, 1);
  await assert.rejects(reader.image("../photo"));
  await assert.rejects(reader.image("https://attacker.test"));
  await assert.rejects(reader.withinRoot("outside"), /nicht im ausgewählten/);
  metadata.photo = { ...baseImage, parents: ["outside"] };
  await assert.rejects(reader.image("photo"), /nicht im ausgewählten/);
  metadata.photo = {
    ...baseImage,
    mimeType: "application/vnd.google-apps.shortcut",
  };
  await assert.rejects(reader.image("photo"), /nicht im ausgewählten/);
  metadata.photo = { ...baseImage, capabilities: { canDownload: false } };
  await assert.rejects(reader.image("photo"), /herunterladbare/);
  metadata.photo = { ...baseImage, size: String(MAX_DRIVE_IMAGE + 1) };
  await assert.rejects(reader.image("photo"), /8 MB/);
  metadata.photo = { ...baseImage, version: "2" };
  await assert.rejects(reader.readImage(selected), /geändert/);
  assert.equal(downloaded, 1, "blocked selections do not download content");
  metadata.photo = { ...baseImage };
  metadata.nested = folder("nested", ["nested"]);
  await assert.rejects(reader.image("photo"), /nicht im ausgewählten/);
  metadata.nested = { ...folder("nested", ["root"]), trashed: true };
  await assert.rejects(reader.image("photo"), /nicht im ausgewählten/);
  metadata.nested = folder("nested", ["root"]);
  afterDownload = () => {
    metadata.photo = { ...baseImage, parents: ["outside"] };
  };
  await assert.rejects(reader.readImage(selected), /nicht im ausgewählten/);
  metadata.photo = { ...baseImage };
  afterDownload = () => {};
  responseBytes = Buffer.from("not an image");
  await assert.rejects(
    reader.readImage(selected),
    /während des Ladens geändert/,
  );
  metadata.photo = { ...baseImage, md5Checksum: checksum(responseBytes) };
  await assert.rejects(
    reader.readImage(await reader.image("photo")),
    /Ungültiges Bild/,
  );
  responseBytes = Buffer.alloc(MAX_DRIVE_IMAGE + 1);
  metadata.photo = { ...baseImage };
  await assert.rejects(reader.readImage(selected), /8 MB/);
});
