import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
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
    email: z.string().trim().email().max(254).transform(normalizeEmail),
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
    await book.xlsx.load(buffer as never);
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
  const emails = new Set<string>(),
    people = new Set<string>();
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
    if (emails.has(c.email) || people.has(key))
      throw new PolicyError(`Zeile ${index + 2}: Dublette im Import.`);
    emails.add(c.email);
    people.add(key);
    return c;
  });
}
