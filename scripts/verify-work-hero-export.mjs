/**
 * Fail the production/staging build if the Work export is missing a usable hero image.
 * Expects a completed `out/` from `npm run build` with Sanity production dataset.
 *
 * Run: node scripts/verify-work-hero-export.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const workHtmlPath = resolve(root, "out/work/index.html");
const proxyPath = resolve(root, "out/api/work-page.php");

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!existsSync(workHtmlPath)) {
  fail(`Missing ${workHtmlPath}`);
}
if (!existsSync(proxyPath)) {
  fail(`Missing ${proxyPath}`);
}

const proxy = readFileSync(proxyPath, "utf8");
if (!proxy.includes("image{$imageProjection}")) {
  fail("out/api/work-page.php does not project heroSection.image");
}
if (!/heroSection\{[\s\S]*image\{\$imageProjection\}/.test(proxy)) {
  fail("out/api/work-page.php heroSection block missing image projection");
}

const html = readFileSync(workHtmlPath, "utf8");

// Live client fetches /api/work-page.php; build-time bake should still include
// the published Sanity CDN URL when the singleton has an image.
const sanityImage =
  html.includes("cdn.sanity.io/images/tgx6e6jg/") ||
  html.includes("892218dde5f3d50ef5756b06227f78d164aba6a0");

const hasHeroChrome =
  html.includes("HeroMedia") ||
  html.includes("heroMedia") ||
  /WorkPage_hero/.test(html);

if (!hasHeroChrome) {
  fail("out/work/index.html missing Work hero markup markers");
}

if (!sanityImage) {
  // Soft-fail only if Sanity had no published image; probe live API for evidence.
  fail(
    "out/work/index.html does not contain the published Sanity Work hero image URL. " +
      "Rebuild with Sanity production reachable, or confirm the Work singleton image is published.",
  );
}

console.log("verify-work-hero-export: OK (proxy projects image; HTML contains Sanity hero asset)");
