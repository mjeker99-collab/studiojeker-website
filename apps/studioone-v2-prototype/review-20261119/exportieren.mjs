import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, "export");
mkdirSync(outDir, { recursive: true });
const port = 9222;
const chrome = spawn(
  "/usr/local/bin/google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--remote-debugging-port=${port}`,
    "--user-data-dir=/tmp/chrome-studioone-v2-review",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitVersion() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return await response.json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error("Chrome-Debugging nicht erreichbar");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const opened = new Promise((resolveOpen, rejectOpen) => {
    ws.addEventListener("open", () => resolveOpen());
    ws.addEventListener("error", () => rejectOpen(new Error("WebSocket fehlgeschlagen")));
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolveCall, rejectCall } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectCall(new Error(JSON.stringify(message.error)));
    else resolveCall(message.result);
  });
  return {
    ready: opened,
    send(method, params = {}) {
      const callId = ++id;
      return new Promise((resolveCall, rejectCall) => {
        pending.set(callId, { resolveCall, rejectCall });
        ws.send(JSON.stringify({ id: callId, method, params }));
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

const jobs = [
  ["uebersicht", "uebersicht.html", 1440, 900, "desktop"],
  ["uebersicht", "uebersicht.html", 1024, 768, "ipad_quer"],
  ["uebersicht", "uebersicht.html", 768, 1024, "ipad_hoch"],
  ["akquise", "akquise.html", 1440, 900, "desktop"],
  ["akquise", "akquise.html", 1024, 768, "ipad_quer"],
  ["akquise", "akquise.html", 768, 1024, "ipad_hoch"],
  ["newsletter", "newsletter.html", 1440, 900, "desktop"],
  ["newsletter", "newsletter.html", 1024, 768, "ipad_quer"],
  ["newsletter", "newsletter.html", 768, 1024, "ipad_hoch"],
];

const report = { chromePid: chrome.pid, shots: [], checks: [] };

try {
  await waitVersion();
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find((entry) => entry.type === "page");
  const client = connect(page.webSocketDebuggerUrl);
  await client.ready;
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  report.font = await (async () => {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Page.navigate", {
      url: `file://${resolve(root, "uebersicht.html")}`,
    });
    for (let i = 0; i < 40; i += 1) {
      const state = await evaluate(client, "document.readyState");
      if (state === "complete") break;
      await sleep(100);
    }
    return evaluate(client, `(() => {
      function raster(font) {
        const canvas = document.createElement("canvas");
        canvas.width = 520; canvas.height = 90;
        const context = canvas.getContext("2d");
        context.fillStyle = "#000";
        context.font = "48px " + font;
        context.fillText("Agil Rösg StudioONE", 4, 64);
        return Array.from(context.getImageData(0, 0, 520, 90).data);
      }
      function diff(a, b) {
        let count = 0;
        for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 3] !== b[i + 3]) count += 1;
        return count;
      }
      const stack = "Arial, Helvetica, sans-serif";
      const base = raster(stack);
      const names = ["Arial", "Helvetica", "Arimo", "Liberation Sans", "Noto Sans", "DejaVu Sans", "Cantarell", "Inter", "sans-serif"];
      const matches = names.map((name) => ({ name, pixels: diff(base, raster(name)) }));
      const body = getComputedStyle(document.body);
      const heading = getComputedStyle(document.querySelector("h1"));
      return {
        specified: body.fontFamily,
        bodyLetterSpacing: body.letterSpacing,
        headingLetterSpacing: heading.letterSpacing,
        bodyFontSize: body.fontSize,
        bodyWeight: body.fontWeight,
        headingSize: heading.fontSize,
        headingWeight: heading.fontWeight,
        headingLineHeight: heading.lineHeight,
        matches,
      };
    })()`);
  })();

  for (const [name, file, width, height, device] of jobs) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 900,
    });
    await client.send("Page.navigate", { url: `file://${resolve(root, file)}` });
    for (let i = 0; i < 40; i += 1) {
      const state = await evaluate(client, "document.readyState");
      if (state === "complete") break;
      await sleep(100);
    }
    await sleep(150);
    const metrics = await evaluate(client, `(() => {
      const root = document.documentElement;
      const controls = [...document.querySelectorAll("a, button, input, textarea, summary, label")]
        .filter((node) => node.getClientRects().length)
        .map((node) => {
          const box = node.getBoundingClientRect();
          return { tag: node.tagName, text: (node.innerText || node.getAttribute("aria-label") || "").slice(0, 40), w: Math.round(box.width), h: Math.round(box.height) };
        });
      const small = controls.filter((item) => item.h > 0 && item.h < 44 && item.w > 24);
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        scrollHeight: root.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        small,
      };
    })()`);
    const layout = await client.send("Page.getLayoutMetrics");
    const contentWidth = layout.cssContentSize?.width || width;
    const contentHeight = layout.cssContentSize?.height || height;
    const full = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: contentWidth, height: contentHeight, scale: 1 },
    });
    const fileName = `${name}_${device}_${width}.png`;
    writeFileSync(resolve(outDir, fileName), Buffer.from(full.data, "base64"));
    report.shots.push({ file: fileName, viewport: [width, height], content: [contentWidth, contentHeight], metrics });
    report.checks.push({
      view: `${name} ${device}`,
      overflow: metrics.scrollWidth > metrics.clientWidth + 1,
      smallControls: metrics.small,
    });
  }

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `file://${resolve(root, "newsletter.html")}` });
  for (let i = 0; i < 40; i += 1) {
    const state = await evaluate(client, "document.readyState");
    if (state === "complete") break;
    await sleep(100);
  }
  report.newsletterIpad = await evaluate(client, `(() => {
    const before = document.getElementById("betreff").value;
    document.getElementById("tab-preview").checked = true;
    document.getElementById("tab-preview").dispatchEvent(new Event("change", { bubbles: true }));
    const editHidden = getComputedStyle(document.querySelector(".edit-pane")).display === "none";
    const previewShown = getComputedStyle(document.querySelector(".preview-pane")).display !== "none";
    const after = document.getElementById("betreff").value;
    document.getElementById("bild-b").checked = true;
    const figureB = getComputedStyle(document.getElementById("fig-b")).display;
    const figureA = getComputedStyle(document.getElementById("fig-a")).display;
    return { before, after, editHidden, previewShown, figureA, figureB, sameValue: before === after && before.length > 0 };
  })()`);
  const previewShot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: (await client.send("Page.getLayoutMetrics")).cssContentSize.width,
      height: (await client.send("Page.getLayoutMetrics")).cssContentSize.height,
      scale: 1,
    },
  });
  writeFileSync(resolve(outDir, "newsletter_ipad_hoch_768_vorschau.png"), Buffer.from(previewShot.data, "base64"));

  client.close();
  writeFileSync(resolve(outDir, "messung.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ font: report.font, checks: report.checks, newsletterIpad: report.newsletterIpad }, null, 2));
} finally {
  chrome.kill("SIGTERM");
}
