import { normalizeEmail, personKey } from "../policy";
import type { MailchimpContactCounts } from "./mailchimp-report";

export type KnownIdentities = {
  emails: ReadonlySet<string>;
  people: ReadonlySet<string>;
};

const EMAIL_LABELS = new Set([
  "direkte e-mail",
  "e-mail",
  "e-mail-adresse",
  "geschäftliche e-mail-adresse",
]);

export function emptyMailchimpCounts(): MailchimpContactCounts {
  return {
    read: 0,
    subscribed: 0,
    unsubscribed: 0,
    cleaned: 0,
    pending: 0,
    excluded: 0,
    duplicates: 0,
    existing: 0,
    newContacts: 0,
    errors: 0,
  };
}

// Same labelled note fields as Akquise-Vorbereitung. Only a single address is
// used, and only while the contact itself has no stored email. Nothing is written.
export function unambiguousPreparationEmail(notes: string, currentEmail: string) {
  if (currentEmail.trim()) return "";
  const before = notes.split(/^\s*E-Mail-Entwurf\s*:/im)[0] ?? "";
  const found = new Set<string>();
  for (const line of before.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const label = line
      .slice(0, colon)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!EMAIL_LABELS.has(label)) continue;
    const email = normalizeEmail(line.slice(colon + 1).trim().replace(/^mailto:/i, ""));
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) found.add(email);
  }
  return found.size === 1 ? [...found][0] : "";
}

export function addPerson(people: Set<string>, first: string, last: string, org: string) {
  if (!first.trim() || !last.trim() || !org.trim()) return;
  people.add(personKey(first, last, org));
}

export function addCustomerPerson(people: Set<string>, contactName: string, company: string) {
  const parts = contactName.normalize("NFKC").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return;
  const last = parts.pop() ?? "";
  addPerson(people, parts.join(" "), last, company);
}

type Kept = {
  status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "excluded" | "invalid";
  person: string;
  records: number;
};

const rank: Record<Kept["status"], number> = {
  invalid: 0,
  subscribed: 1,
  excluded: 2,
  pending: 3,
  unsubscribed: 4,
  cleaned: 5,
};

function memberStatus(value: unknown): Kept["status"] {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  if (status === "subscribed") return "subscribed";
  if (status === "unsubscribed") return "unsubscribed";
  if (status === "cleaned") return "cleaned";
  if (status === "pending") return "pending";
  if (status === "archived" || status === "transactional") return "excluded";
  return "invalid";
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

// Counts only. Cleaned or unsubscribed wins over a subscribed duplicate.
// Newsletter membership is not treated as consent for personal outreach.
export function classifyMailchimpMembers(members: unknown[], known: KnownIdentities) {
  const counts = emptyMailchimpCounts();
  const grouped = new Map<string, Kept>();
  for (const member of members) {
    counts.read += 1;
    const record =
      member && typeof member === "object" ? (member as Record<string, unknown>) : {};
    const email = normalizeEmail(text(record, "email_address"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      counts.errors += 1;
      continue;
    }
    const merge =
      record.merge_fields && typeof record.merge_fields === "object"
        ? (record.merge_fields as Record<string, unknown>)
        : {};
    const person = personKey(text(merge, "FNAME"), text(merge, "LNAME"), text(merge, "COMPANY"));
    const status = memberStatus(record.status);
    const current = grouped.get(email);
    if (!current) {
      grouped.set(email, { status, person: status === "subscribed" ? person : "", records: 1 });
      continue;
    }
    current.records += 1;
    if (rank[status] > rank[current.status]) current.status = status;
    if (status === "subscribed" && person !== "||") current.person = person;
  }
  for (const [email, entry] of grouped) {
    counts.duplicates += Math.max(0, entry.records - 1);
    if (entry.status === "invalid") {
      counts.errors += 1;
      continue;
    }
    if (entry.status !== "subscribed") {
      counts.excluded += 1;
      if (entry.status === "unsubscribed") counts.unsubscribed += 1;
      if (entry.status === "cleaned") counts.cleaned += 1;
      if (entry.status === "pending") counts.pending += 1;
      continue;
    }
    counts.subscribed += 1;
    if (known.emails.has(email) || (entry.person !== "||" && known.people.has(entry.person)))
      counts.existing += 1;
    else counts.newContacts += 1;
  }
  return counts;
}
