import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, "export");
mkdirSync(outDir, { recursive: true });
const port = 9334;
const chrome = spawn("/usr/local/bin/google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--force-device-scale-factor=1", `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/chrome-studioone-abnahme", "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notes = [];
function note(ok, text) { notes.push((ok ? "OK " : "FEHLER ") + text); if (!ok) console.error(text); }

async function waitVersion() {
  for (let i = 0; i < 50; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return; } catch { await sleep(200); }
  }
  throw new Error("Chrome nicht erreichbar");
}
function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const pending = new Map();
  const ready = new Promise((res, rej) => { ws.addEventListener("open", () => res()); ws.addEventListener("error", () => rej(new Error("socket"))); });
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const item = pending.get(msg.id); pending.delete(msg.id);
    if (msg.error) item.rej(new Error(JSON.stringify(msg.error))); else item.res(msg.result);
  });
  return { ready, ws, send(method, params = {}) { const call = ++id; return new Promise((res, rej) => { pending.set(call, { res, rej }); ws.send(JSON.stringify({ id: call, method, params })); }); } };
}
async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function clickText(client, text) {
  const found = await evaluate(client, `(() => {
    const node = [...document.querySelectorAll("button, a")].find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!node) return false;
    node.click();
    return true;
  })()`);
  await sleep(120);
  return found;
}
async function shot(client, name) {
  const layout = await client.send("Page.getLayoutMetrics");
  const image = await client.send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 }
  });
  writeFileSync(resolve(outDir, name), Buffer.from(image.data, "base64"));
}
async function size(client, width, height) {
  await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 900 });
}
async function overflow(client) {
  return evaluate(client, "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1");
}

try {
  await waitVersion();
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const client = connect(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
  await client.ready;
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await size(client, 1440, 900);
  await client.send("Page.navigate", { url: `file://${resolve(root, "index.html")}` });
  await sleep(400);
  await evaluate(client, "localStorage.clear()");
  await client.send("Page.reload");
  await sleep(400);
  const title = await evaluate(client, "document.querySelector('h1')?.textContent || ''");
  note(title.includes("Newsletter"), "Start zeigt den letzten Newsletter-Schritt: " + title);

  note(await clickText(client, "Akquise"), "Navigation Akquise");
  note(await clickText(client, "Beispielresultate anzeigen"), "Recherche-Simulation");
  const research = await evaluate(client, "document.body.innerText.includes('Dublette') && document.body.innerText.includes('E-Mail fehlt')");
  note(research, "Dublette und fehlende E-Mail sichtbar");
  note(await clickText(client, "Vollständige übernehmen"), "Vollständige übernehmen");
  const count = await evaluate(client, "document.getElementById('sel-count')?.innerText || ''");
  note(count.includes("4 vollständige"), "Auswahlzahl 4: " + count);
  note(await clickText(client, "Auswahl leeren"), "Auswahl leeren");
  const empty = await evaluate(client, "(document.getElementById('sel-count')?.innerText || '').includes('0 vollständige')");
  note(empty, "Auswahl ist leer");
  note(await clickText(client, "Alle vollständigen auswählen"), "Auswahl wieder setzen");
  note(await clickText(client, "Gemeinsames Briefing öffnen"), "Weiter zum Briefing");
  note(await clickText(client, "Persönliche Entwürfe erstellen"), "Entwürfe erstellen");
  const personal = await evaluate(client, "[...document.querySelectorAll('textarea')].map((node) => node.value).join('\\n').includes('Guten Tag Anna') && [...document.querySelectorAll('textarea')].some((node) => node.value.includes('Guten Tag Tim'))");
  note(personal, "Persönliche Entwürfe mit Namen");
  const buttons = await evaluate(client, "[...document.querySelectorAll('button')].filter(b => b.textContent.includes('Diesen Entwurf prüfen')).length");
  for (let i = 0; i < buttons; i += 1) await clickText(client, "Diesen Entwurf prüfen");
  note(buttons === 4, "Vier Entwürfe einzeln geprüft: " + buttons);
  await evaluate(client, "(() => { const node=document.querySelector('[data-bind=\"akquise.drafts.c1.body\"]'); node.value='Guten Tag Anna\\n\\nGeändert'; node.dispatchEvent(new Event('input',{bubbles:true})); return true; })()");
  await clickText(client, "Auswahl und Zeitpunkt prüfen");
  const onlyAnna = await evaluate(client, "document.body.innerText.includes('Noch nicht geprüft: Anna Beispiel')");
  note(onlyAnna, "Änderung entwertet nur den betroffenen Entwurf");
  await clickText(client, "Diesen Entwurf prüfen");
  note(await clickText(client, "Auswahl und Zeitpunkt prüfen"), "Weiter zur Bestätigung");
  await evaluate(client, "document.getElementById('consent').click()");
  await clickText(client, "Planung simulieren");
  const results = await evaluate(client, "document.body.innerText.includes('Simuliert eingeplant') && document.body.innerText.includes('Simulation unklar')");
  note(results, "Einzelresultate mit einem unklaren Fall");

  await clickText(client, "Inhalte");
  await clickText(client, "Newsletter öffnen");
  await evaluate(client, "(() => { const node=document.getElementById('betreff'); node.value='Sichtbarkeit im Test'; node.dispatchEvent(new Event('input',{bubbles:true})); return true; })()");
  const synced = await evaluate(client, "document.querySelector('[data-mirror=\"newsletter.current.subject\"]').textContent === 'Sichtbarkeit im Test'");
  note(synced, "Betreff und Vorschau sind synchron");
  await size(client, 768, 1024);
  await clickText(client, "Vorschau");
  const kept = await evaluate(client, "document.getElementById('betreff').value === 'Sichtbarkeit im Test' && getComputedStyle(document.querySelector('.edit-pane')).display === 'none' && getComputedStyle(document.querySelector('.preview-pane')).display !== 'none'");
  note(kept, "iPad hoch: Vorschau desselben Entwurfs, Eingabe bleibt");
  await client.send("Page.reload");
  await sleep(400);
  const resumed = await evaluate(client, "document.getElementById('betreff')?.value || document.body.innerText");
  note(String(resumed).includes("Sichtbarkeit im Test"), "Nach Neuladen bleibt der Betreff");
  await evaluate(client, "localStorage.clear(); location.reload()");
  await sleep(400);
  await size(client, 1440, 900);
  await clickText(client, "Inhalte");
  await clickText(client, "Newsletter öffnen");
  note(await clickText(client, "Prüfen"), "Prüfung bei fehlendem Link");
  const stopped = await evaluate(client, "document.body.innerText.includes('hat kein Ziel')");
  note(stopped, "Fehlendes Linkziel stoppt die Prüfung");
  await evaluate(client, "(() => { const node=document.getElementById('link-l1'); node.value='beispiel.invalid/dezember'; node.dispatchEvent(new Event('input',{bubbles:true})); return true; })()");
  await clickText(client, "Prüfen");
  await clickText(client, "Mailchimp-Entwurf simulieren");
  await clickText(client, "Testmail simulieren");
  const simulated = await evaluate(client, "document.body.innerText.includes('keine Mail versendet') || document.body.innerText.includes('Es wurde keine Mail versendet')");
  note(simulated, "Mailchimp und Testmail nur simuliert");

  await clickText(client, "Einstellungen");
  await clickText(client, "Merken aussetzen");
  const blocked = await evaluate(client, "(document.getElementById('storage-status')?.innerText || '').includes('Nicht gemerkt')");
  note(blocked, "Ausgesetztes Merken zeigt keine Erfolgsmeldung");

  for (const [w, h, name] of [[1440, 900, "desktop"], [1024, 768, "ipad_quer"], [768, 1024, "ipad_hoch"]]) {
    await size(client, w, h);
    await sleep(100);
    note(!(await overflow(client)), "Kein horizontaler Überlauf bei " + name);
  }
  const small = await evaluate(client, `[...document.querySelectorAll('button, a, input, select, textarea, summary')].filter(n => n.getClientRects().length).filter(n => { const b=n.getBoundingClientRect(); return b.height > 0 && b.height < 44 && b.width > 28; }).map(n => n.tagName + ':' + (n.innerText||n.id||'').slice(0,30))`);
  note(!small.length, "Bedienflächen unter 44px: " + JSON.stringify(small));

  await size(client, 1440, 900);
  await evaluate(client, "localStorage.clear()");
  await client.send("Page.reload");
  await sleep(300);
  await shot(client, "uebersicht_desktop_1440.png");
  await clickText(client, "Akquise");
  await clickText(client, "Beispielresultate anzeigen");
  await clickText(client, "Alle vollständigen auswählen");
  await shot(client, "akquise_desktop_1440.png");
  await clickText(client, "Inhalte");
  await clickText(client, "Newsletter öffnen");
  await shot(client, "newsletter_desktop_1440.png");
  await clickText(client, "Projekte");
  await shot(client, "projekte_desktop_1440.png");
  await clickText(client, "Bibliothek");
  await shot(client, "bibliothek_desktop_1440.png");
  await clickText(client, "Kalender");
  await shot(client, "kalender_desktop_1440.png");
  await size(client, 768, 1024);
  await clickText(client, "Inhalte");
  await clickText(client, "Newsletter öffnen");
  await shot(client, "newsletter_ipad_hoch_768.png");
  await clickText(client, "Vorschau");
  await shot(client, "newsletter_ipad_hoch_vorschau.png");
  await size(client, 1024, 768);
  await clickText(client, "Übersicht");
  await shot(client, "uebersicht_ipad_quer_1024.png");

  const failed = notes.filter((line) => line.startsWith("FEHLER"));
  writeFileSync(resolve(outDir, "durchspielen.txt"), notes.join("\n") + "\n");
  console.log(notes.join("\n"));
  if (failed.length) process.exitCode = 1;
} finally {
  chrome.kill("SIGTERM");
}
