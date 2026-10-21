import { JWT } from "google-auth-library";
import { validateRows } from "./import";
import { mapMasterSheet } from "./sheet-master";
import { PolicyError } from "./policy";
// Read-only snapshot import. No spreadsheet field can trigger approval or delivery.
export async function readSheetContacts() {
  const id = process.env.GOOGLE_SHEET_ID,
    email = process.env.GOOGLE_CLIENT_EMAIL,
    key = process.env.GOOGLE_PRIVATE_KEY;
  if (!id || !email || !key)
    throw new PolicyError(
      "Google-Sheets-Zugang ist noch nicht konfiguriert.",
      503,
    );
  if (!/^[\w-]+$/.test(id)) throw new PolicyError("Ungültige Sheet-ID.");
  const auth = new JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const range = process.env.GOOGLE_SHEET_RANGE ?? "Kontakte!A1:O501";
  const result = await auth.request<{ values?: string[][] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`,
    timeout: 15000,
    maxContentLength: 2 * 1024 * 1024,
  });
  const [headers, ...rows] = result.data.values ?? [];
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
