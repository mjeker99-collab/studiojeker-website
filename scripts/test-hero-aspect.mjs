/**
 * Verify shared hero media frame size across all split-hero pages.
 * Expects a running next dev server on localhost:3000.
 *
 * Acceptance: within each viewport, outer [data-hero-media="frame"]
 * width × height are identical (≤2px spread). Cyan bar height equals frame.
 */
import { chromium } from "playwright-core";

const PAGES = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "about", url: "http://localhost:3000/about/" },
  { name: "ki", url: "http://localhost:3000/ki/" },
  {
    name: "services-business",
    url: "http://localhost:3000/services/business-communication/",
  },
  {
    name: "services-product",
    url: "http://localhost:3000/services/product-communication/",
  },
  {
    name: "services-architecture",
    url: "http://localhost:3000/services/architecture/",
  },
  {
    name: "services-digital",
    url: "http://localhost:3000/services/digital-marketing/",
  },
  { name: "content-abo", url: "http://localhost:3000/content-abo/" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, expectRatio: 1.25 },
  { name: "ipad", width: 1024, height: 768, expectRatio: 1.25 },
  { name: "mobile", width: 390, height: 844, expectRatio: 4 / 3 },
];

async function measureMedia(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-hero-media="frame"]');
    if (!frame) return null;
    const fr = frame.getBoundingClientRect();
    const bar = frame.children[0];
    const br = bar?.getBoundingClientRect();
    const photo = frame.querySelector('[data-hero-media="photo"]');
    const pr = photo?.getBoundingClientRect();
    const cs = getComputedStyle(frame);
    return {
      w: fr.width,
      h: fr.height,
      ratio: fr.width / fr.height,
      top: fr.top,
      left: fr.left,
      aspectCss: cs.aspectRatio,
      barH: br?.height ?? null,
      photoW: pr?.width ?? null,
      photoH: pr?.height ?? null,
    };
  });
}

function nearly(a, b, eps = 0.025) {
  return Math.abs(a - b) <= eps;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/opt/google/chrome/chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let failed = 0;
  const report = [];

  for (const vp of VIEWPORTS) {
    const sizes = [];
    for (const p of PAGES) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForSelector('[data-hero-media="frame"]', {
        timeout: 30000,
      });
      await page.waitForTimeout(600);
      const media = await measureMedia(page);
      await page.close();
      if (!media) {
        console.error(`FAIL ${vp.name}/${p.name}: no [data-hero-media=frame]`);
        failed += 1;
        continue;
      }
      sizes.push({ name: p.name, ...media });
      const line = `${vp.name}/${p.name}: ${media.w.toFixed(1)}×${media.h.toFixed(1)} (ratio ${media.ratio.toFixed(3)}, barH ${media.barH?.toFixed(1)})`;
      report.push(line);
      console.log(line);

      if (!nearly(media.ratio, vp.expectRatio)) {
        console.error(
          `  FAIL ratio ${media.ratio.toFixed(3)} ≠ ${vp.expectRatio}`,
        );
        failed += 1;
      }
      if (
        media.barH != null &&
        Math.abs(media.barH - media.h) > 1.5
      ) {
        console.error(
          `  FAIL cyan bar height ${media.barH.toFixed(1)} ≠ frame ${media.h.toFixed(1)}`,
        );
        failed += 1;
      }
    }

    if (sizes.length < 2) continue;

    const widths = sizes.map((s) => s.w);
    const heights = sizes.map((s) => s.h);
    const tops = sizes.map((s) => s.top);
    const wSpread = Math.max(...widths) - Math.min(...widths);
    const hSpread = Math.max(...heights) - Math.min(...heights);
    const tSpread = Math.max(...tops) - Math.min(...tops);
    if (wSpread > 2 || hSpread > 2) {
      console.error(
        `FAIL ${vp.name}: size spread w=${wSpread.toFixed(1)} h=${hSpread.toFixed(1)}`,
        sizes.map((s) => `${s.name}:${s.w.toFixed(1)}×${s.h.toFixed(1)}`),
      );
      failed += 1;
    } else {
      console.log(
        `OK ${vp.name}: ${sizes[0].w.toFixed(1)}×${sizes[0].h.toFixed(1)} across ${sizes.length} pages (top spread ${tSpread.toFixed(1)}px)`,
      );
    }
  }

  await browser.close();
  if (failed) {
    process.exit(1);
  }
  console.log("All hero media frames match.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
