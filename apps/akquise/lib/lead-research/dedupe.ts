import {
  emailDomain,
  isFreeMailDomain,
  normalizeCompany,
  normalizeEmail,
  normalizePerson,
  personCompanyKey,
} from "./normalize";

export interface DedupeRecord {
  email: string;
  organisation: string;
  person: string;
  domain: string;
  source: "suppression" | "customer" | "contact" | "sheet" | "supplement" | "legacy";
  label: string;
}

export type DedupeHit =
  | { kind: "new" }
  | { kind: "duplicate" | "excluded" | "review"; source: string; reason: string };

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (a.length > 80 || b.length > 80) return Math.max(a.length, b.length);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = current;
    }
  }
  return row[b.length];
}

function similar(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const distance = levenshtein(a, b);
  const ratio = 1 - distance / Math.max(a.length, b.length);
  return ratio >= 0.86;
}

export function matchCandidate(
  input: { email: string; organisation: string; person: string },
  records: DedupeRecord[],
): DedupeHit {
  const email = normalizeEmail(input.email);
  const company = normalizeCompany(input.organisation);
  const person = normalizePerson(input.person);
  const domain = emailDomain(email);
  const identity = personCompanyKey(person, company);
  for (const record of records) {
    if (record.source !== "suppression" && record.source !== "customer") continue;
    const sameEmail = email && normalizeEmail(record.email) === email;
    const sameCompany = company && normalizeCompany(record.organisation) === company;
    if (sameEmail || sameCompany) {
      const reason = record.source === "suppression"
        ? `Auf der Sperrliste (${record.label}).`
        : `Bestandskunde (${record.label}).`;
      return { kind: "excluded", source: record.label, reason };
    }
  }
  for (const record of records) {
    if (record.source === "suppression" || record.source === "customer") continue;
    const sameEmail = email && normalizeEmail(record.email) === email;
    const sameIdentity =
      person &&
      company &&
      personCompanyKey(record.person, record.organisation) === identity;
    const sameDomain =
      domain &&
      !isFreeMailDomain(domain) &&
      record.domain &&
      record.domain === domain;
    const sameCompany = company && normalizeCompany(record.organisation) === company;
    if (sameEmail || sameIdentity || sameDomain || sameCompany) {
      return {
        kind: "duplicate",
        source: record.label,
        reason: `Bereits vorhanden in ${record.label}.`,
      };
    }
  }
  for (const record of records) {
    const left = company;
    const right = normalizeCompany(record.organisation);
    const personLeft = person;
    const personRight = normalizePerson(record.person);
    if (
      (left && right && similar(left, right)) ||
      (personLeft && personRight && left && right && similar(`${personLeft} ${left}`, `${personRight} ${right}`))
    ) {
      return {
        kind: "review",
        source: record.label,
        reason: `Ähnlicher Eintrag in ${record.label}. Bitte prüfen, nicht still übernehmen.`,
      };
    }
  }
  return { kind: "new" };
}

export interface SheetTab {
  title: string;
  rows: string[][];
}

const EMAIL_HEADER = /e-?mail|mailadresse/i;
const ORG_HEADER = /organisation|firma|unternehmen|betrieb/i;
const PERSON_HEADER = /^person$|^name$|kontaktperson/i;

function headerIndex(headers: string[], pattern: RegExp): number {
  return headers.findIndex((header) => pattern.test(header.trim()));
}

export function recordsFromTab(tab: SheetTab): DedupeRecord[] {
  const [headers = [], ...rows] = tab.rows;
  const emailIndex = headerIndex(headers, EMAIL_HEADER);
  const orgIndex = headerIndex(headers, ORG_HEADER);
  const personIndex = headerIndex(headers, PERSON_HEADER);
  const records: DedupeRecord[] = [];
  for (const row of rows) {
    if (!row.some((cell) => cell.trim())) continue;
    const email = emailIndex >= 0 ? normalizeEmail(row[emailIndex] ?? "") : "";
    const fallbackEmail = email || (row.map(normalizeEmail).find((cell) => cell.includes("@")) ?? "");
    const organisation = orgIndex >= 0 ? (row[orgIndex] ?? "").trim() : "";
    const person = personIndex >= 0 ? (row[personIndex] ?? "").trim() : "";
    if (!fallbackEmail && !organisation && !person) continue;
    records.push({
      email: fallbackEmail,
      organisation,
      person,
      domain: emailDomain(fallbackEmail),
      source: "sheet",
      label: `Blatt ${tab.title}`,
    });
  }
  return records;
}

export function assessTabs(tabs: SheetTab[], headers: readonly string[]): {
  complete: boolean;
  blocker: string;
  records: DedupeRecord[];
  writeHeadersOk: boolean;
} {
  const records = tabs.flatMap(recordsFromTab);
  const contacts = tabs.find((tab) => tab.title.trim() === "Kontakte");
  const headerRow = contacts?.rows[0]?.map((cell) => cell.trim()) ?? [];
  const writeHeadersOk =
    headerRow.length === headers.length &&
    headers.every((header, index) => headerRow[index] === header);
  if (tabs.length < 4) {
    return {
      complete: false,
      writeHeadersOk,
      records,
      blocker: `Die Masterliste hat ${tabs.length} statt mindestens 4 Tabellenblätter. Neue Leads werden nicht aufgenommen. Die Recherche läuft weiter.`,
    };
  }
  if (!contacts || !writeHeadersOk) {
    return {
      complete: false,
      writeHeadersOk,
      records,
      blocker: "Die Spalten im Blatt Kontakte entsprechen nicht der Masterliste. Es wird nichts geschrieben.",
    };
  }
  return { complete: true, writeHeadersOk: true, records, blocker: "" };
}
