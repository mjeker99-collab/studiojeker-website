import ExcelJS from "exceljs";
import { JWT } from "google-auth-library";
import { validateRows } from "./import";
import { mapMasterSheet } from "./sheet-master";
import { sheetAccessWithinSelectedFolder } from "./drive/service";
import { PolicyError } from "./policy";
// Read-only snapshot import. No spreadsheet field can trigger approval or delivery.
export async function readSheetContacts(actorId?: string) {
  const id = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!id) throw new PolicyError("Google-Sheets-ID ist nicht konfiguriert.", 503);
  if (!/^[\w-]+$/.test(id)) throw new PolicyError("Ungültige Sheet-ID.");
  const range = process.env.GOOGLE_SHEET_RANGE ?? "Kontakte!A1:O501";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`;
  let values: string[][] | undefined;
  if (email || key) {
    if (!email || !key)
      throw new PolicyError("Unvollständige Service-Account-Konfiguration.", 503);
    const auth = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const result = await auth.request<{ values?: string[][] }>({
      url, timeout: 15000, maxContentLength: 2 * 1024 * 1024,
    });
    values = result.data.values;
  } else {
    if (!actorId)
      throw new PolicyError("Google-Sheets-Lesezugriff fehlt.", 503);
    const token = await sheetAccessWithinSelectedFolder(actorId, id);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // Drive export uses the existing read-only grant when the separate Sheets
      // API is unavailable. Folder ancestry was verified above.
      if (range !== "Kontakte!A1:O501")
        throw new PolicyError(`Google Sheets meldet HTTP ${response.status}. Tabellenzugriff prüfen.`, 502);
      const exported = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) },
      );
      if (!exported.ok)
        throw new PolicyError(`Masterliste konnte auch über Google Drive nicht gelesen werden (HTTP ${exported.status}).`, 502);
      const bytes = await exported.arrayBuffer();
      if (bytes.byteLength > 2 * 1024 * 1024)
        throw new PolicyError("Masterliste zu gross.", 413);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes);
      const sheet = workbook.getWorksheet("Kontakte");
      if (!sheet) throw new PolicyError("Tabellenblatt Kontakte fehlt.");
      if (sheet.actualRowCount > 501)
        throw new PolicyError("Masterliste enthält mehr als 500 Datenzeilen.");
      const cells: string[][] = [];
      for (let row = 1; row <= sheet.rowCount; row++) {
        cells.push(Array.from({ length: 15 }, (_, col) => {
          const cell = sheet.getRow(row).getCell(col + 1);
          if (cell.type === ExcelJS.ValueType.Formula)
            throw new PolicyError(`Masterliste Zeile ${row}: Formel statt Kontaktwert.`);
          return cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text.trim();
        }));
      }
      return validateRows(mapMasterSheet(cells));
    }
    if (Number(response.headers.get("content-length") || 0) > 2 * 1024 * 1024)
      throw new PolicyError("Masterliste zu gross.", 413);
    const raw = await response.text();
    if (raw.length > 2 * 1024 * 1024)
      throw new PolicyError("Masterliste zu gross.", 413);
    const payload = JSON.parse(raw) as { values?: string[][] };
    values = payload.values;
  }
  const [headers, ...rows] = values ?? [];
  if (!headers || new Set(headers).size !== headers.length)
    throw new PolicyError("Fehlende oder doppelte Spalten.");
  // The live master list uses 15 German columns, unlike generic CSV imports.
  // No status, newsletter opt-in or legal approval is transferred.
  if (headers[0] === "Person") return validateRows(mapMasterSheet([headers, ...rows]));
  return validateRows(
    rows.map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    ),
  );
}
