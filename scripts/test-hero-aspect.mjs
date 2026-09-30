/**
 * Verify shared hero media aspect across Home / About / Services / KI.
 * Expects a running next dev server on localhost:3000.
 */
import { chromium } from "playwright-core";

const PAGES = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "about", url: "http://localhost:3000/about/" },
  { name: "services", url: "http://localhost:3000/services/business-communication/" },
  { name: "ki", url: "http://localhost:3000/ki/" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, expectRatio: 1.25 },
  { name: "tablet", width: 1024, height: 768, expectRatio: 1.25 },
  { name: "mobile", width: 390, height: 844, expectRatio: 4 / 3 },
];

async function measureMedia(page) {
  return page.evaluate(() => {
    const section = document.querySelector('section[data-header-theme="light"]');
    const loop = section?.querySelector("[data-playing]");
    const imgs = section ? Array.from(section.querySelectorAll("img")) : [];
    let target = loop;
    if (!target) {
      let best = null;
      let bestA = 0;
      for (const img of imgs) {
        const r = img.getBoundingClientRect();
        const a = r.width * r.height;
        if (a > bestA && r.top < window.innerHeight * 1.2) {
          best = img;
          bestA = a;
        }
      }
      target = best;
    }
    let el = target;
    let media = null;
    for (let i = 0; i < 8 && el; i++) {
      const cs = getComputedStyle(el);
      if (cs.display === "grid" && el.children.length === 2) {
        const bg = getComputedStyle(el.children[0]).backgroundColor;
        if (bg.includes("0, 200, 255") || bg.includes("0,200,255")) {
          media = el;
          break;
        }
      }
      el = el.parentElement;
    }
    const mr = media?.getBoundingClientRect();
    return mr
      ? {
          w: mr.width,
          h: mr.height,
          ratio: mr.width / mr.height,
          top: mr.top,
        }
      : null;
  });
}

function nearly(a, b, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/opt/google/chrome/chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let failed = 0;

  for (const vp of VIEWPORTS) {
    const sizes = [];
    for (const p of PAGES) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(800);
      const media = await measureMedia(page);
      await page.close();
      if (!media) {
        console.error(`FAIL ${vp.name}/${p.name}: no media`);
        failed += 1;
        continue;
      }
      sizes.push({ name: p.name, ...media });
      if (!nearly(media.ratio, vp.expectRatio)) {
        console.error(
          `FAIL ${vp.name}/${p.name}: ratio ${media.ratio.toFixed(3)} ≠ ${vp.expectRatio}`,
        );
        failed += 1;
      }
    }

    const widths = sizes.map((s) => s.w);
    const heights = sizes.map((s) => s.h);
    const wSpread = Math.max(...widths) - Math.min(...widths);
    const hSpread = Math.max(...heights) - Math.min(...heights);
    if (wSpread > 2 || hSpread > 2) {
      console.error(
        `FAIL ${vp.name}: size spread w=${wSpread.toFixed(1)} h=${hSpread.toFixed(1)}`,
        sizes,
      );
      failed += 1;
    } else {
      console.log(
        `OK ${vp.name}: ${sizes[0].w.toFixed(1)}×${sizes[0].h.toFixed(1)} ratio≈${vp.expectRatio} across ${sizes.length} pages`,
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
