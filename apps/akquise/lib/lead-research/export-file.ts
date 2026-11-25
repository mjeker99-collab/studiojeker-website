import ExcelJS from "exceljs";
import { toExportRow } from "./candidate";
import { spreadsheetLiteral } from "./normalize";
import { EXPORT_HEADERS, type Candidate } from "./types";

function csvCell(value: string): string {
  const safe = spreadsheetLiteral(value);
  if (/[";\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv(candidates: Candidate[]): string {
  const lines = [
    [...EXPORT_HEADERS],
    ...candidates.map(toExportRow),
  ];
  return `\uFEFF${lines.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export async function toXlsx(candidates: Candidate[]): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Lead-Recherche");
  sheet.addRow([...EXPORT_HEADERS]);
  for (const row of candidates.map(toExportRow)) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
}
