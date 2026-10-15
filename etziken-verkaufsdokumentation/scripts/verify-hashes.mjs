#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "content", "image-manifest.json"), "utf8")
);

let ok = true;
for (const img of manifest.images) {
  const path = join(ROOT, "assets", "approved", img.filename);
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== img.sha256) {
    console.error(`FAIL ${img.filename}`);
    ok = false;
  } else {
    console.log(`OK   ${img.filename}`);
  }
}
process.exit(ok ? 0 : 1);
