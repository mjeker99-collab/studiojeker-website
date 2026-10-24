import JSZip from "jszip";
import { chapters, type ConceptInput } from "./input";
export const escapeMarkup = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
export type ExportMeta = {
  version: number;
  status: string;
  customer: string;
  author: string;
};
const metadata = (meta: ExportMeta) =>
  `${meta.customer} · Version ${meta.version} · ${meta.status}${meta.author ? ` · ${meta.author}` : ""}`;
export function conceptHtml(data: ConceptInput, meta: ExportMeta) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeMarkup(data.title)}</title><style>
body{font:11pt/1.5 Arial,sans-serif;color:#14212a;max-width:800px;margin:32px auto;padding:0 24px}h1{font-size:26pt}h2{font-size:15pt;border-bottom:2px solid #007a99;padding-bottom:6px;break-after:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere}button{font:inherit;padding:12px;cursor:pointer}@page{size:A4;margin:20mm}@media print{button{display:none}body{margin:0;padding:0}a{color:inherit}}
</style></head><body><button onclick="window.print()">Als PDF speichern / Drucken</button><h1>${escapeMarkup(data.title)}</h1><p>${escapeMarkup(metadata(meta))}</p>${chapters.map(([key, title]) => `<section><h2>${escapeMarkup(title)}</h2><p>${escapeMarkup(data[key] || "Noch offen")}</p></section>`).join("")}</body></html>`;
}
export async function conceptDocx(data: ConceptInput, meta: ExportMeta) {
  const zip = new JSZip();
  const paragraph = (text: string, style = "Normal") =>
    `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeMarkup(text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ""))}</w:t></w:r></w:p>`;
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="140"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="007A99"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(data.title, "Title")}${paragraph(metadata(meta))}${chapters
      .map(
        ([key, title]) =>
          paragraph(title, "Heading1") +
          (data[key] || "Noch offen")
            .split("\n")
            .map((line) => paragraph(line))
            .join(""),
      )
      .join(
        "",
      )}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
