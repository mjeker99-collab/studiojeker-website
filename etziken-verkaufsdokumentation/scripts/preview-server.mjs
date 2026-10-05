#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".md": "text/markdown; charset=utf-8",
};

createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = join(ROOT, urlPath === "/" ? "brochure.html" : urlPath);
  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const data = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
  res.end(data);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Vorschau: http://127.0.0.1:${PORT}/brochure.html`);
  console.log(`Kontaktübersicht: http://127.0.0.1:${PORT}/contact-sheet.html`);
});
