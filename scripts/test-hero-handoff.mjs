/**
 * Manual-ish hero handoff verification.
 * Opens headed Chrome on DISPLAY, hard-refreshes key pages, samples
 * poster/iframe geometry + data-playing, and writes screenshots.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "about", url: "http://localhost:3000/about/" },
  { name: "ki", url: "http://localhost:3000/ki/" },
];

async function sampleHero(page) {
  return page.evaluate(() => {
    const loop = document.querySelector("[data-playing]");
    if (!loop) return { found: false };
    const poster = loop.querySelector("img");
    const iframe = loop.querySelector("iframe");
    const rootRect = loop.getBoundingClientRect();
    const posterRect = poster?.getBoundingClientRect();
    const iframeRect = iframe?.getBoundingClientRect();
    const csPoster = poster ? getComputedStyle(poster) : null;
    const csIframe = iframe ? getComputedStyle(iframe) : null;
    return {
      found: true,
      playing: loop.getAttribute("data-playing"),
      posterSrc: poster?.getAttribute("src") || null,
      videoSrc: iframe?.getAttribute("src") || null,
      root: { w: rootRect.width, h: rootRect.height },
      poster: posterRect
        ? {
            w: posterRect.width,
            h: posterRect.height,
            t: posterRect.top,
            l: posterRect.left,
            opacity: csPoster?.opacity,
            objectFit: csPoster?.objectFit,
            objectPosition: csPoster?.objectPosition,
          }
        : null,
      iframe: iframeRect
        ? {
            w: iframeRect.width,
            h: iframeRect.height,
            t: iframeRect.top,
            l: iframeRect.left,
            opacity: csIframe?.opacity,
          }
        : null,
    };
  });
}

function nearlyEqual(a, b, eps = 1.5) {
  return Math.abs(a - b) <= eps;
}

async function runPage(browser, { name, url }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Hard reload to observe handoff from first paint
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });

  const samples = [];
  let revealedAt = null;
  // Wait up to ~10s for Vimeo to paint a first frame.
  for (let i = 0; i < 40; i++) {
    const sample = await sampleHero(page);
    samples.push({ t: i * 250, ...sample });
    if (sample.found && sample.playing === "true" && revealedAt == null) {
      revealedAt = i * 250;
      await page.screenshot({
        path: join(OUT, `hero-handoff-${name}-playing.png`),
        fullPage: false,
      });
      break;
    }
    if (i === 0) {
      await page.screenshot({
        path: join(OUT, `hero-handoff-${name}-initial.png`),
        fullPage: false,
      });
    }
    await page.waitForTimeout(250);
  }

  if (revealedAt == null) {
    await page.screenshot({
      path: join(OUT, `hero-handoff-${name}-final.png`),
      fullPage: false,
    });
  }

  // Geometry checks around the reveal moment
  const before = samples.find((s) => s.playing === "false" && s.poster && s.iframe);
  const after = samples.find((s) => s.playing === "true" && s.poster && s.iframe);
  const geometryOk =
    before &&
    after &&
    nearlyEqual(before.poster.w, before.iframe.w) &&
    nearlyEqual(before.poster.h, before.iframe.h) &&
    nearlyEqual(before.poster.t, before.iframe.t) &&
    nearlyEqual(before.poster.l, before.iframe.l) &&
    nearlyEqual(after.poster.w, after.iframe.w) &&
    nearlyEqual(after.poster.h, after.iframe.h) &&
    before.poster.objectFit === "cover" &&
    /center|50%/.test(before.poster.objectPosition || "");

  const usedFirstFrame =
    Boolean(before?.posterSrc?.includes("vimeo-posters/")) ||
    Boolean(after?.posterSrc?.includes("vimeo-posters/"));

  await page.close();
  return {
    name,
    url,
    revealedAtMs: revealedAt,
    geometryOk: Boolean(geometryOk),
    usedFirstFrame,
    beforePosterOpacity: before?.poster?.opacity,
    afterPosterOpacity: after?.poster?.opacity,
    afterIframeOpacity: after?.iframe?.opacity,
    posterSrc: after?.posterSrc || before?.posterSrc,
    videoSrc: after?.videoSrc || before?.videoSrc,
    consoleErrors: consoleErrors.filter((e) =>
      /vimeo|video|iframe|hero/i.test(e),
    ),
    sampleCount: samples.length,
  };
}

const browser = await chromium.launch({
  headless: false,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});

const results = [];
for (const entry of PAGES) {
  results.push(await runPage(browser, entry));
}

await browser.close();

const reportPath = join(OUT, "hero-handoff-report.json");
await import("node:fs/promises").then((fs) =>
  fs.writeFile(reportPath, JSON.stringify(results, null, 2)),
);
console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.geometryOk || r.revealedAtMs == null);
process.exit(failed.length ? 1 : 0);
