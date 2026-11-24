import { JWT } from "google-auth-library";
import type { SheetTab } from "./dedupe";
import { sheetsFailureFromStatus, type SheetsFailure, type SheetsGateway } from "./sheets";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const READONLY = "https://www.googleapis.com/auth/spreadsheets.readonly";

function credentials(env: NodeJS.ProcessEnv): { email: string; key: string; id: string } | null {
  const id = env.GOOGLE_SHEET_ID || "";
  const email = env.GOOGLE_CLIENT_EMAIL || "";
  const key = env.GOOGLE_PRIVATE_KEY || "";
  if (!id || !email || !key || !/^[\w-]+$/.test(id)) return null;
  return { id, email, key: key.replace(/\\n/g, "\n") };
}

async function authorized(env: NodeJS.ProcessEnv, write: boolean): Promise<{ token: string; id: string } | SheetsFailure> {
  const creds = credentials(env);
  if (!creds) {
    return sheetsFailureFromStatus(0, false);
  }
  const auth = new JWT({
    email: creds.email,
    key: creds.key,
    scopes: [write ? SCOPE : READONLY],
  });
  const token = await auth.getAccessToken();
  if (!token.token) return sheetsFailureFromStatus(0, false);
  return { token: token.token, id: creds.id };
}

async function googleFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
}

export function createGoogleSheetsGateway(env: NodeJS.ProcessEnv, write: boolean): SheetsGateway | null {
  if (!env.GOOGLE_SHEET_ID && !env.GOOGLE_CLIENT_EMAIL && !env.GOOGLE_PRIVATE_KEY) return null;
  return {
    async readTabs() {
      const auth = await authorized(env, false);
      if ("kind" in auth) return { tabs: [], failure: auth };
      const meta = await googleFetch(
        auth.token,
        `https://sheets.googleapis.com/v4/spreadsheets/${auth.id}?fields=sheets.properties.title`,
      );
      if (!meta.ok) return { tabs: [], failure: sheetsFailureFromStatus(meta.status, true) };
      const body = await meta.json() as { sheets?: { properties?: { title?: string } }[] };
      const titles = (body.sheets ?? []).map((sheet) => sheet.properties?.title || "").filter(Boolean).slice(0, 8);
      const tabs: SheetTab[] = [];
      for (const title of titles) {
        const range = encodeURIComponent(`${title}!A1:O5001`);
        const values = await googleFetch(
          auth.token,
          `https://sheets.googleapis.com/v4/spreadsheets/${auth.id}/values/${range}`,
        );
        if (!values.ok) return { tabs: [], failure: sheetsFailureFromStatus(values.status, true) };
        const table = await values.json() as { values?: string[][] };
        tabs.push({ title, rows: table.values ?? [] });
      }
      return { tabs, failure: null };
    },
    async readContacts() {
      const auth = await authorized(env, false);
      if ("kind" in auth) return { rows: [], failure: auth };
      const values = await googleFetch(
        auth.token,
        `https://sheets.googleapis.com/v4/spreadsheets/${auth.id}/values/${encodeURIComponent("Kontakte!A1:O5001")}`,
      );
      if (!values.ok) return { rows: [], failure: sheetsFailureFromStatus(values.status, true) };
      const table = await values.json() as { values?: string[][] };
      return { rows: table.values ?? [], failure: null };
    },
    async appendRows(rows: string[][]) {
      if (!write) {
        return {
          failure: {
            kind: "config",
            message: "Schreiben in Google Sheets ist serverseitig nicht freigegeben.",
          } satisfies SheetsFailure,
        };
      }
      const auth = await authorized(env, true);
      if ("kind" in auth) return { failure: auth };
      const response = await googleFetch(
        auth.token,
        `https://sheets.googleapis.com/v4/spreadsheets/${auth.id}/values/${encodeURIComponent("Kontakte!A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: rows }),
        },
      );
      if (!response.ok) return { failure: sheetsFailureFromStatus(response.status, true) };
      return { failure: null };
    },
  };
}
