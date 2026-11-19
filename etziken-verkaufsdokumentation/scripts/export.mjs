#!/usr/bin/env node
/**
 * Export Layoutentwurf PDF (exactly 2 A4 pages) + PNG page previews.
 * Waits for fonts + images before rendering.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = join(ROOT, "output");
const APPROVED = join(ROOT, "assets", "approved");

mkdirSync(OUTPUT, { recursive: true });

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function verifyApprovedHashes() {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "content", "image-manifest.json"), "utf8")
  );
  const mismatches = [];
  for (const img of manifest.images) {
    const path = join(APPROVED, img.filename);
    const actual = sha256File(path);
    if (actual !== img.sha256) {
      mismatches.push({ filename: img.filename, expected: img.sha256, actual });
    }
  }
  if (mismatches.length) {
    console.error("SHA-256 mismatch — Originaldateien wurden verändert:");
    console.error(mismatches);
    process.exit(1);
  }
  console.log(`SHA-256 OK: ${manifest.images.length} Dateien unverändert.`);
  return manifest;
}

function startStaticServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let filePath = join(ROOT, urlPath === "/" ? "brochure.html" : urlPath);
      if (filePath.endsWith("/")) filePath = join(filePath, "index.html");
      try {
        const data = readFileSync(filePath);
        const ext = filePath.split(".").pop().toLowerCase();
        const types = {
          html: "text/html; charset=utf-8",
          css: "text/css; charset=utf-8",
          js: "text/javascript; charset=utf-8",
          json: "application/json; charset=utf-8",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          ttf: "font/ttf",
          woff2: "font/woff2",
        };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolvePromise({ server, port });
    });
  });
}

async function main() {
  verifyApprovedHashes();

  const brochure = JSON.parse(
    readFileSync(join(ROOT, "content", "brochure.json"), "utf8")
  );
  const titleImg = brochure.image_assignment.title_page;
  const interiorImg = brochure.image_assignment.interior_page;
  const files = readdirSync(APPROVED);
  for (const needed of [titleImg, interiorImg]) {
    if (!files.includes(needed)) {
      console.error(`Pflichtbild fehlt: ${needed}`);
      process.exit(1);
    }
  }

  const { server, port } = await startStaticServer();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${base}/brochure.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", {
    timeout: 30000,
  });
  await page.evaluate(() => document.fonts.ready);

  // Hide screen chrome for PDF
  await page.addStyleTag({
    content: `.screen-chrome { display: none !important; } body { background: white !important; } .pages { padding: 0 !important; gap: 0 !important; }`,
  });

  const pdfPath = join(OUTPUT, "etziken-layoutentwurf.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  // PNG previews of each page via PDF page screenshots using chromium
  // Re-render each page individually at A4 pixel size for crisp previews
  const pageEls = await page.$$(".page");
  if (pageEls.length !== 2) {
    console.error(`Erwartet 2 Seiten, gefunden: ${pageEls.length}`);
    process.exit(1);
  }

  // Use pdf.js-free approach: screenshot each .page element
  for (let i = 0; i < pageEls.length; i++) {
    const el = pageEls[i];
    const previewPath = join(OUTPUT, `preview-page-${i + 1}.png`);
    await el.screenshot({ path: previewPath, type: "png" });
    console.log(`PNG: ${previewPath}`);
  }

  // Verify PDF page count with pdfinfo if available, else with a small node check
  let pageCountNote = "";
  try {
    const pdfBuffer = readFileSync(pdfPath);
    // Count /Type /Page (not /Pages) occurrences roughly
    const text = pdfBuffer.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page(?!s)/g);
    const count = matches ? matches.length : -1;
    pageCountNote = `PDF /Type /Page count ≈ ${count}`;
    if (count !== 2 && count !== -1) {
      console.error(`WARNUNG: PDF scheint ${count} Seiten zu haben (erwartet 2).`);
    }
  } catch (e) {
    pageCountNote = String(e);
  }

  // Write verification report
  const report = {
    label: "Layoutentwurf — keine PDF/X- oder Druckereifreigabe",
    pdf: "output/etziken-layoutentwurf.pdf",
    previews: ["output/preview-page-1.png", "output/preview-page-2.png"],
    page_elements_rendered: pageEls.length,
    page_count_note: pageCountNote,
    image_assignment: brochure.image_assignment,
    sha256_verified: true,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(join(OUTPUT, "export-report.json"), JSON.stringify(report, null, 2) + "\n");

  console.log(`PDF: ${pdfPath}`);
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
