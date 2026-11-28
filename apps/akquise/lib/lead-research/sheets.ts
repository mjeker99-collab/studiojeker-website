import type { SheetTab } from "./dedupe";
import { toSheetRow } from "./candidate";
import { SHEET_HEADERS, type Candidate, type JobRecord } from "./types";

export type SheetsFailureKind = "permission" | "config" | "provider";

export interface SheetsFailure {
  kind: SheetsFailureKind;
  message: string;
}

export interface SheetsGateway {
  readTabs(): Promise<{ tabs: SheetTab[]; failure: SheetsFailure | null }>;
  appendRows(rows: string[][]): Promise<{ failure: SheetsFailure | null }>;
  readContacts(): Promise<{ rows: string[][]; failure: SheetsFailure | null }>;
}

export function sheetsFailureFromStatus(status: number, configured: boolean): SheetsFailure {
  if (!configured) {
    return {
      kind: "config",
      message: "Google-Sheets ist nicht konfiguriert. Tabellen-ID oder Service-Konto fehlen auf dem Server.",
    };
  }
  if (status === 401 || status === 403 || status === 404) {
    return {
      kind: "permission",
      message: status === 404
        ? "Die Google-Datei ist nicht sichtbar. Das ist eine Dateiberechtigung, keine fehlende Programm-Konfiguration."
        : "Google verweigert den Zugriff auf die Datei. Die Freigabe für das Service-Konto prüfen. Das ist eine Dateiberechtigung, keine fehlende Programm-Konfiguration.",
    };
  }
  return {
    kind: "provider",
    message: `Google Sheets antwortet mit HTTP ${status}. Es wurde nichts bestätigt.`,
  };
}

export function memorySheets(tabs: SheetTab[], options?: {
  permission?: boolean;
  dropReadback?: boolean;
}): SheetsGateway & { appended: string[][] } {
  const contacts = tabs.find((tab) => tab.title === "Kontakte");
  if (!contacts) throw new Error("Test braucht das Blatt Kontakte.");
  const appended: string[][] = [];
  let suppressNextData = options?.dropReadback ?? false;
  return {
    appended,
    async readTabs() {
      if (options?.permission) {
        return { tabs: [], failure: sheetsFailureFromStatus(403, true) };
      }
      return { tabs, failure: null };
    },
    async appendRows(rows) {
      if (options?.permission) return { failure: sheetsFailureFromStatus(403, true) };
      appended.push(...rows);
      contacts.rows.push(...rows);
      return { failure: null };
    },
    async readContacts() {
      if (options?.permission) return { rows: [], failure: sheetsFailureFromStatus(403, true) };
      const strip = suppressNextData && contacts.rows.length > 1;
      if (strip) suppressNextData = false;
      return {
        rows: contacts.rows.map((row, rowIndex) =>
          row.map((cell, index) =>
            strip && rowIndex > 0 && (index === 11 || index === 12) ? "" : cell,
          ),
        ),
        failure: null,
      };
    },
  };
}

function marker(row: string[]): string {
  return (row[14] ?? "").match(/Recherche-ID:\s*([a-f0-9]+)/)?.[1] ?? "";
}

export function confirmRows(expected: string[][], actual: string[][]): {
  confirmed: string[];
  uncertain: string[];
} {
  const confirmed: string[] = [];
  const uncertain: string[] = [];
  for (const row of expected) {
    const id = marker(row);
    const matches = actual.filter((candidate) => marker(candidate) === id);
    const found = matches.length === 1 ? matches[0] : null;
    const same = found &&
      found[4] === row[4] &&
      found[9] === row[9] &&
      found[10] === row[10] &&
      found[11] === row[11] &&
      found[12] === row[12];
    if (same && id) confirmed.push(id);
    else uncertain.push(id || "ohne-id");
  }
  return { confirmed, uncertain };
}

function addBlocker(job: JobRecord, id: string, message: string) {
  if (!job.blockers.some((blocker) => blocker.id === id)) {
    job.blockers.push({ id, message });
  }
}

export async function syncSheets(job: JobRecord, gateway: SheetsGateway): Promise<void> {
  const pending = job.candidates.filter(
    (candidate) =>
      candidate.status === "QUALIFIED" &&
      !candidate.legacy &&
      !candidate.holdAdmission &&
      !candidate.sheetsConfirmed,
  );
  if (!pending.length && job.sheetsPhase !== "reread") return;
  if (job.sheetsPhase === "stopped") return;
  const readFirst = await gateway.readContacts();
  if (readFirst.failure) {
    addBlocker(job, `sheets_${readFirst.failure.kind}`, readFirst.failure.message);
    job.sheetsPhase = "stopped";
    return;
  }
  if (!sheetHeadersMatch(readFirst.rows[0] ?? [])) {
    addBlocker(job, "sheets_columns", "Die Spalten im Blatt Kontakte sind unklar. Es wird nicht geschrieben.");
    job.sheetsPhase = "stopped";
    return;
  }
  const existing = pending.filter((candidate) =>
    readFirst.rows.some((row) => marker(row) === candidate.idempotencyKey));
  const checked = confirmRows(existing.map(toSheetRow), readFirst.rows);
  for (const candidate of existing) {
    candidate.sheetsConfirmed = checked.confirmed.includes(candidate.idempotencyKey);
  }
  if (checked.uncertain.length || (job.sheetsPhase === "reread" && !existing.length)) {
    addBlocker(job, "sheets_uncertain", "Vorheriger Schreibversuch ist unklar. Keine weiteren Anhänge ohne Abgleich.");
    job.sheetsPhase = "stopped";
    return;
  }
  const toWrite = pending.filter((candidate) => !candidate.sheetsConfirmed).slice(0, job.config.blockSize);
  if (!toWrite.length) {
    job.sheetsPhase = "idle";
    return;
  }
  const rows = toWrite.map(toSheetRow);
  const appended = await gateway.appendRows(rows);
  if (appended.failure) {
    addBlocker(job, `sheets_${appended.failure.kind}`, appended.failure.message);
    job.sheetsPhase = "stopped";
    return;
  }
  const readBack = await gateway.readContacts();
  if (readBack.failure) {
    addBlocker(job, "sheets_uncertain", "Nach dem Schreiben ist die Rücklesung fehlgeschlagen. Kein weiterer Schreibversuch, bevor die Zeilen gelesen wurden.");
    job.sheetsPhase = "reread";
    return;
  }
  const check = confirmRows(rows, readBack.rows);
  for (const id of check.confirmed) {
    const candidate = toWrite.find((item) => item.idempotencyKey === id);
    if (candidate) candidate.sheetsConfirmed = true;
  }
  if (check.uncertain.length) {
    addBlocker(
      job,
      "sheets_uncertain",
      "Schreiben ist unklar. Zuerst Rücklesen, kein blindes erneutes Anhängen.",
    );
    job.sheetsPhase = "reread";
    return;
  }
  job.sheetsPhase = "idle";
}

export function sheetHeadersMatch(row: string[]): boolean {
  return SHEET_HEADERS.every((header, index) => row[index] === header);
}

export type { Candidate };
