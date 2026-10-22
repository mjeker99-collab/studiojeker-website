import { validatedDocument, type WebsiteDocument } from "./input";
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const previewCsp =
  "default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'";
export function websiteHtml(raw: WebsiteDocument, slug = "index") {
  const doc = validatedDocument.parse(raw);
  const page = doc.pages.find((p) => p.slug === slug);
  if (!page) throw new Error("Seite nicht gefunden.");
  const dark = doc.style === "DARK";
  return `<!doctype html><html lang="${doc.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${previewCsp}"><meta name="referrer" content="no-referrer"><title>${escape(page.seoTitle || page.title + " · " + doc.name)}</title><meta name="description" content="${escape(page.seoDescription)}"><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${dark ? "#151719" : "#fff"};color:${dark ? "#f8fafb" : "#151719"};font:17px/1.65 Arial,Helvetica,sans-serif;overflow-wrap:anywhere}a{color:inherit;text-underline-offset:5px}a:focus-visible{outline:3px solid currentColor;outline-offset:5px}header,main,footer{width:min(1140px,90%);margin:auto}header{padding:28px 0;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;border-bottom:1px solid #7e858750}nav{display:flex;gap:22px;flex-wrap:wrap}nav a[aria-current]{font-weight:700;text-decoration-thickness:3px}h1,h2{line-height:1.1;letter-spacing:-.035em}h1{font-size:clamp(40px,7vw,82px);max-width:960px;margin:0 0 30px}h2{font-size:clamp(26px,4vw,44px);margin:0 0 22px}.hero{padding:90px 0 70px;border-bottom:5px solid ${doc.accent}}.hero p{font-size:clamp(19px,2.5vw,25px);max-width:760px}.copy{white-space:pre-line}.section{padding:64px 0;border-bottom:1px solid #7e858750}.split{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:45px}.banner{padding:40px;border-left:7px solid ${doc.accent};background:${dark ? "#24292b" : "#f1f5f5"};margin:35px 0}.section img{width:100%;max-height:540px;object-fit:cover;border-radius:3px}.cta{display:inline-block;padding:12px 22px;margin-top:14px;border:2px solid currentColor;border-radius:10px;text-decoration:none;font-weight:700}footer{padding:45px 0;font-size:14px}.skip{position:absolute;left:-10000px}.skip:focus{left:15px;top:15px;background:#fff;color:#111;padding:10px;z-index:2}@media(max-width:680px){.split{grid-template-columns:1fr}.hero{padding:50px 0}.section{padding:35px 0}.banner{padding:24px}nav{gap:15px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><a class="skip" href="#inhalt">Zum Inhalt</a><header><a href="index.html"><strong>${escape(doc.name)}</strong></a><nav aria-label="Hauptnavigation">${doc.pages.map((p) => `<a href="${p.slug}.html"${p.slug === slug ? ' aria-current="page"' : ""}>${escape(p.title)}</a>`).join("")}</nav></header><main id="inhalt"><section class="hero"><h1>${escape(page.headline || page.title)}</h1><p class="copy">${escape(page.intro)}</p></section>${page.sections.map((s, i) => `<section id="abschnitt-${i + 1}" class="section ${s.layout === "SPLIT" ? "split" : s.layout === "BANNER" ? "banner" : ""}"><div>${s.heading ? `<h2>${escape(s.heading)}</h2>` : ""}<p class="copy">${escape(s.body)}</p>${s.ctaLabel && s.ctaUrl ? `<a class="cta" href="${escape(s.ctaUrl)}">${escape(s.ctaLabel)}</a>` : ""}</div>${s.imageUrl ? `<img src="${escape(s.imageUrl)}" alt="${escape(s.imageAlt)}" loading="lazy" referrerpolicy="no-referrer">` : ""}</section>`).join("")}</main><footer class="copy">${escape(doc.footer)}</footer></body></html>`;
}
export async function websiteZip(raw: WebsiteDocument) {
  const doc = validatedDocument.parse(raw);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const page of doc.pages)
    zip.file(page.slug + ".html", websiteHtml(doc, page.slug));
  zip.file("studioone.json", JSON.stringify(doc, null, 2));
  zip.file(
    "README.txt",
    "StudioONE Website-Export\nindex.html ist die Startseite. Alle HTML-Dateien zusammen auf den Webspace laden.\nBilder werden von den eingetragenen öffentlichen HTTPS-Adressen geladen und sind nicht im Paket enthalten.\nKontaktaktionen sind Links; Formulare, Tracking, Hosting und CMS-Anbindung sind nicht enthalten.\nInhalte, Bilderrechte und rechtliche Seiten vor Veröffentlichung prüfen.\n",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
