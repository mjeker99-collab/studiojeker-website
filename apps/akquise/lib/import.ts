import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { z } from "zod";
import { normalizeEmail, personKey, PolicyError } from "./policy";
const text = z.string().trim().max(4000).default("");
const url = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v), "Nur HTTP(S)-URLs"),
  ])
  .default("");
export const contactInput = z
  .object({
    organisation: z.string().trim().min(1).max(250),
    industry: text,
    region: text,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    position: text,
    email: z
      .union([z.literal(""), z.string().trim().email().max(254)])
      .default("")
      .transform(normalizeEmail),
    website: url,
    sourceUrl: url,
    verifiedAt: z.union([z.literal(""), z.string().datetime()]).optional(),
    confidence: z
      .enum(["UNCONFIRMED", "ESTIMATED", "GENERAL", "VERIFIED"])
      .default("UNCONFIRMED"),
    hook: text,
    service: text,
    legalCategory: z
      .enum([
        "UNASSESSED",
        "CONSENT_DOCUMENTED",
        "EXISTING_RELATIONSHIP",
        "OTHER_REVIEW_REQUIRED",
        "PUBLIC_AUTHORITY",
      ])
      .default("UNASSESSED"),
    publicAuthority: z.boolean().default(false),
    newsletterConsent: z.boolean().default(false),
    newsletterEvidence: text,
    owner: text,
    notes: text,
  })
  .strict();
export type ContactInput = z.infer<typeof contactInput>;
const columns = [
  "organisation",
  "industry",
  "region",
  "firstName",
  "lastName",
  "position",
  "email",
  "website",
  "sourceUrl",
  "hook",
  "service",
  "owner",
  "notes",
  "legalCategory",
];

const masterHeaders = [
  "Person",
  "Funktion",
  "Organisation",
  "Ort",
  "Direkte E-Mail",
  "Prüfstatus",
  "Prüfdatum",
  "Priorität",
  "Kontaktrolle",
  "Kontaktstrategie",
  "Studiojeker-Anknüpfungspunkt",
  "Quellen-URL",
  "Newsletter-Einwilligung",
  "Akquise-Status",
  "E-Mail-Betreff",
  "E-Mail-Entwurf",
];
const driveHeaders = [
  "Person",
  "Funktion",
  "Organisation",
  "Ort",
  "E-Mail",
  "Prüfstatus",
  "Prüfdatum",
  "Priorität",
  "Quellen-URL",
  "Newsletter-Einwilligung",
  "Akquise-Status",
  "Betreff",
  "E-Mail-Entwurf",
  "Herkunft",
  "Hinweise",
];

// Some valid exports prefix spreadsheet XML elements with x:. ExcelJS 4.4
// does not recognize those elements and throws while reading workbook.sheets.
// Normalize that namespace and discard table *metadata* (never worksheet data).
async function compatibleXlsx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!workbookXml?.includes("<x:workbook")) return buffer;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (
      name.startsWith("xl/tables/") ||
      /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(name)
    ) {
      zip.remove(name);
      continue;
    }
    if (!name.endsWith(".xml")) continue;
    let xml = await entry.async("string");
    xml = xml
      .replace(/<(\/?)x:/g, "<$1")
      .replaceAll(
        'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      );
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      xml = xml.replace(/<tableParts\b[^>]*>[\s\S]*?<\/tableParts>/g, "");
    zip.file(name, xml);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

function masterRows(sheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const expected = sheet.name === "Kontakte" ? driveHeaders : masterHeaders;
  const headers = expected.map((_, i) =>
    sheet
      .getRow(1)
      .getCell(i + 1)
      .text.trim(),
  );
  if (
    headers.some((header, i) => header !== expected[i]) ||
    sheet.getRow(1).cellCount > expected.length
  )
    throw new PolicyError("Masterliste hat nicht die erwarteten Spalten.");
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values = expected.map((_, i) => {
      const cell = row.getCell(i + 1);
      if (
        cell.type !== ExcelJS.ValueType.String &&
        cell.type !== ExcelJS.ValueType.Null &&
        cell.type !== ExcelJS.ValueType.Hyperlink &&
        cell.type !== ExcelJS.ValueType.Date
      )
        throw new PolicyError(
          `Zeile ${index}: Nur Textzellen, keine Formeln oder Links.`,
        );
      return cell.value instanceof Date
        ? cell.value.toISOString().slice(0, 10)
        : cell.text.trim();
    });
    if (!values.some(Boolean)) return;
    const drive = expected === driveHeaders;
    const person = values[0].replace(/^(Dr\.|Prof\.)\s+/i, "").split(/\s+/);
    const originalName = values[0];
    const notes = [
      `Originalname: ${originalName}`,
      ...(drive
        ? [5, 6, 7, 9, 10, 11, 12, 13, 14]
        : [5, 6, 7, 8, 9, 12, 13, 14, 15]
      )
        .filter((i) => values[i])
        .map((i) => `${expected[i]}: ${values[i]}`),
    ].join("\n");
    rows.push({
      organisation: values[2],
      region: values[3],
      firstName: person[0] || "",
      lastName: person.slice(1).join(" "),
      position: values[1],
      email: values[4],
      sourceUrl: values[drive ? 8 : 11],
      hook: drive ? "" : values[10],
      notes,
    });
  });
  return rows;
}
export async function parseImport(buffer: Buffer, filename: string) {
  if (buffer.length > 2 * 1024 * 1024)
    throw new PolicyError("Import maximal 2 MB.");
  let rows: Record<string, unknown>[];
  if (filename.toLowerCase().endsWith(".csv")) {
    rows = parse(buffer, {
      columns: (headers: string[]) => {
        if (new Set(headers).size !== headers.length)
          throw new PolicyError("Doppelte Spaltennamen.");
        return headers;
      },
      bom: true,
      skip_empty_lines: true,
      max_record_size: 32768,
      trim: true,
    });
  } else if (filename.toLowerCase().endsWith(".xlsx")) {
    // Bound declared ZIP expansion before ExcelJS decompresses untrusted input.
    let expanded = 0,
      entries = 0;
    for (let i = 0; i < buffer.length - 46; i++)
      if (buffer.readUInt32LE(i) === 0x02014b50) {
        expanded += buffer.readUInt32LE(i + 24);
        entries++;
      }
    if (!entries || entries > 200 || expanded > 12 * 1024 * 1024)
      throw new PolicyError("XLSX-Archiv zu gross oder ungültig.");
    const book = new ExcelJS.Workbook();
    try {
      await book.xlsx.load((await compatibleXlsx(buffer)) as never);
    } catch {
      throw new PolicyError("XLSX-Datei konnte nicht gelesen werden.");
    }
    const master = book.worksheets.find(
      (sheet) =>
        sheet.name === "Masterkontakte" ||
        (sheet.name === "Kontakte" &&
          sheet.getCell("A1").text.trim() === "Person"),
    );
    if (master) {
      if (master.rowCount > 501 || master.columnCount > 30)
        throw new PolicyError("Maximal 500 Zeilen und 30 Spalten.");
      rows = masterRows(master);
      return validateRows(rows);
    }
    if (book.worksheets.length !== 1)
      throw new PolicyError("XLSX muss genau ein Tabellenblatt enthalten.");
    const sheet = book.worksheets[0];
    if (sheet.rowCount > 501 || sheet.columnCount > 30)
      throw new PolicyError("Maximal 500 Zeilen und 30 Spalten.");
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => {
      if (cell.type !== ExcelJS.ValueType.String)
        throw new PolicyError("Ungültiger Spaltenname.");
      headers[col - 1] = cell.text.trim();
    });
    if (new Set(headers).size !== headers.length)
      throw new PolicyError("Doppelte Spaltennamen.");
    rows = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const data: Record<string, unknown> = {};
      row.eachCell((cell, col) => {
        if (
          cell.type !== ExcelJS.ValueType.String &&
          cell.type !== ExcelJS.ValueType.Null
        )
          throw new PolicyError("Nur Textzellen, keine Formeln oder Links.");
        data[headers[col - 1]] = cell.text.trim();
      });
      rows.push(data);
    });
  } else throw new PolicyError("Nur CSV und XLSX erlaubt.");
  return validateRows(rows);
}
export function validateRows(rows: Record<string, unknown>[]) {
  if (!rows.length || rows.length > 500)
    throw new PolicyError("Import benötigt 1 bis 500 Kontakte.");
  const people = new Set<string>();
  return rows.map((row, index) => {
    for (const [key, value] of Object.entries(row)) {
      if (!columns.includes(key))
        throw new PolicyError(
          `Zeile ${index + 2}: Unzulässige Spalte ${key}. Import darf keine Status-, Einwilligungs- oder Freigabefelder setzen.`,
        );
      if (typeof value !== "string" || /^[=+@\-\t\r]/.test(value.trim()))
        throw new PolicyError(`Zeile ${index + 2}: Unsicherer Zellinhalt.`);
    }
    const parsed = contactInput.safeParse(row);
    if (!parsed.success)
      throw new PolicyError(
        `Zeile ${index + 2}: ${parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join(", ")}`,
      );
    const c = parsed.data;
    const key = personKey(c.firstName, c.lastName, c.organisation);
    if (people.has(key))
      throw new PolicyError(`Zeile ${index + 2}: Dublette im Import.`);
    people.add(key);
    return c;
  });
}
