import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadProblem, uploadLimit, MAX_UPLOAD, MAX_VIDEO_UPLOAD } from "../lib/studio/upload-policy";
import { videoUploadMime } from "../lib/studio/video-upload";

function box(type: string, body: Buffer) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8);
  header.write(type, 4);
  return Buffer.concat([header, body]);
}
function movie(brand = "isom", handler = "vide") {
  return Buffer.concat([
    box("ftyp", Buffer.from(brand + "\0\0\0\0")),
    box("moov", box("trak", box("mdia", box("hdlr", Buffer.concat([Buffer.alloc(8), Buffer.from(handler)]))))),
    box("mdat", Buffer.from([1, 2, 3])),
  ]);
}
test("Drive filenames work independently of provider MIME; limits remain bounded", () => {
  assert.equal(uploadProblem("Foto.JPG", 1024), null);
  assert.equal(uploadProblem("Clip.MOV", 18 * 1024 * 1024), null);
  assert.equal(uploadProblem("clip.m4v", MAX_VIDEO_UPLOAD), null);
  assert.ok(uploadProblem("clip.mp4", MAX_VIDEO_UPLOAD + 1));
  assert.ok(uploadProblem("photo.png", MAX_UPLOAD + 1));
  assert.ok(uploadProblem("clip.mp4", 0));
  assert.ok(uploadProblem("script.html", 100));
  assert.ok(uploadProblem("clip.mp4.exe", 100));
  assert.equal(uploadLimit("clip.mp4.exe"), MAX_UPLOAD);
});
test("Video containers require movie data and a video track", () => {
  assert.equal(videoUploadMime(movie()), "video/mp4");
  assert.equal(videoUploadMime(movie("qt  ")), "video/quicktime");
  assert.throws(() => videoUploadMime(movie("isom", "soun")));
  assert.throws(() => videoUploadMime(movie().subarray(0, -1)));
  assert.throws(() => videoUploadMime(Buffer.from("renamed image or html")));
  assert.throws(() => videoUploadMime(box("ftyp", Buffer.from("isom0000"))));
  assert.throws(() => videoUploadMime(movie("avif")));
  const invalid = movie();
  invalid.writeUInt32BE(4);
  assert.throws(() => videoUploadMime(invalid));
});
