import { db } from "../db";
import { normalizeEmail } from "../policy";
import { hubActor } from "./workflow";
import { MailchimpReadError, mailchimpConfiguration, mailchimpGet } from "./mailchimp";
import {
  addCustomerPerson,
  addPerson,
  classifyMailchimpMembers,
  emptyMailchimpCounts,
  unambiguousPreparationEmail,
  type KnownIdentities,
} from "./mailchimp-check";
import {
  publicContactReport,
  publicDiagnosis,
  type MailchimpContactReport,
  type MailchimpDiagnosis,
  type MailchimpErrorClass,
} from "./mailchimp-report";

const PAGE_SIZE = 100;
const MAX_LIST_PAGES = 10;
const MAX_MEMBER_PAGES = 20;
const LIST_ID = /^[a-z0-9]{1,32}$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pageTotal(reported: unknown, length: number) {
  if (typeof reported === "number" && Number.isInteger(reported) && reported >= length)
    return reported;
  if (length < PAGE_SIZE) return length;
  throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
}

function errorClassOf(error: unknown): MailchimpErrorClass {
  return error instanceof MailchimpReadError ? error.errorClass : "unreachable";
}

function query(path: string, params: Record<string, string>) {
  return `${path}?${new URLSearchParams(params)}`;
}

async function readAudiences() {
  const ids: string[] = [];
  let offset = 0;
  let total: number | null = null;
  let pages = 0;
  while (total === null || offset < total) {
    if (pages >= MAX_LIST_PAGES) return { ids, total: total ?? ids.length, complete: false };
    pages += 1;
    const record = asRecord(
      await mailchimpGet<unknown>(
        query("/lists", {
          fields: "lists.id,total_items",
          count: String(PAGE_SIZE),
          offset: String(offset),
        }),
      ),
    );
    const lists = record.lists;
    if (!Array.isArray(lists))
      throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
    const batch: string[] = [];
    for (const item of lists) {
      const id = asRecord(item).id;
      if (typeof id !== "string" || !LIST_ID.test(id))
        throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
      batch.push(id);
    }
    if (total === null) total = pageTotal(record.total_items, batch.length);
    if (batch.length === 0) return { ids, total, complete: offset >= total };
    ids.push(...batch);
    offset += batch.length;
  }
  return { ids: ids.slice(0, total ?? ids.length), total: total ?? ids.length, complete: true };
}

async function readMembers(listId: string, budget: { left: number }) {
  if (!LIST_ID.test(listId))
    throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
  const members: unknown[] = [];
  let offset = 0;
  let total: number | null = null;
  while (total === null || offset < total) {
    if (budget.left <= 0) return { members, complete: false };
    budget.left -= 1;
    const record = asRecord(
      await mailchimpGet<unknown>(
        query(`/lists/${encodeURIComponent(listId)}/members`, {
          count: String(PAGE_SIZE),
          offset: String(offset),
          fields:
            "members.email_address,members.status,members.merge_fields.FNAME,members.merge_fields.LNAME,members.merge_fields.COMPANY,total_items",
        }),
      ),
    );
    const page = record.members;
    if (!Array.isArray(page))
      throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
    if (total === null) total = pageTotal(record.total_items, page.length);
    if (page.length === 0) return { members, complete: offset >= total };
    members.push(...page);
    offset += page.length;
  }
  return { members, complete: true };
}

function blank(errorClass: MailchimpErrorClass, configured: boolean): MailchimpContactReport {
  return publicContactReport({
    configured,
    reachable: false,
    audienceCount: null,
    errorClass,
    imported: 0,
    persisted: false,
    sent: false,
    counts: emptyMailchimpCounts(),
  });
}

export async function diagnoseMailchimp(): Promise<MailchimpDiagnosis> {
  const cfg = mailchimpConfiguration();
  if (!cfg.ok)
    return publicDiagnosis({
      configured: false,
      reachable: false,
      audienceCount: null,
      errorClass: cfg.errorClass,
    });
  try {
    await mailchimpGet("/ping");
  } catch (error) {
    return publicDiagnosis({
      configured: true,
      reachable: false,
      audienceCount: null,
      errorClass: errorClassOf(error),
    });
  }
  try {
    const lists = await readAudiences();
    return publicDiagnosis({
      configured: true,
      reachable: true,
      audienceCount: lists.total,
      errorClass: lists.complete ? "none" : "incomplete",
    });
  } catch (error) {
    return publicDiagnosis({
      configured: true,
      reachable: true,
      audienceCount: null,
      errorClass: errorClassOf(error),
    });
  }
}

export async function reviewMailchimpContacts(known: KnownIdentities): Promise<MailchimpContactReport> {
  const cfg = mailchimpConfiguration();
  if (!cfg.ok) return blank(cfg.errorClass, false);
  let lists: Awaited<ReturnType<typeof readAudiences>>;
  try {
    await mailchimpGet("/ping");
    lists = await readAudiences();
  } catch (error) {
    return blank(errorClassOf(error), true);
  }
  const members: unknown[] = [];
  const budget = { left: MAX_MEMBER_PAGES };
  let complete = lists.complete;
  try {
    for (const id of lists.ids) {
      const page = await readMembers(id, budget);
      members.push(...page.members);
      if (!page.complete) {
        complete = false;
        break;
      }
    }
  } catch (error) {
    return publicContactReport({
      configured: true,
      reachable: true,
      audienceCount: lists.total,
      errorClass: errorClassOf(error),
      imported: 0,
      persisted: false,
      sent: false,
      counts: classifyMailchimpMembers(members, known),
    });
  }
  return publicContactReport({
    configured: true,
    reachable: true,
    audienceCount: lists.total,
    errorClass: complete ? "none" : "incomplete",
    imported: 0,
    persisted: false,
    sent: false,
    counts: classifyMailchimpMembers(members, known),
  });
}

export async function loadKnownMailchimpIdentities(): Promise<KnownIdentities> {
  const [contacts, customers, suppressions, recipients] = await Promise.all([
    db.contact.findMany({
      select: { email: true, firstName: true, lastName: true, organisation: true, notes: true },
    }),
    db.customer.findMany({ select: { contactEmail: true, contactName: true, name: true } }),
    db.suppression.findMany({ select: { email: true } }),
    db.draftVersion.findMany({ distinct: ["recipient"], select: { recipient: true } }),
  ]);
  const emails = new Set<string>();
  const people = new Set<string>();
  const addEmail = (value: string) => {
    const email = normalizeEmail(value);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
  };
  for (const contact of contacts) {
    addEmail(contact.email);
    addEmail(unambiguousPreparationEmail(contact.notes, contact.email));
    addPerson(people, contact.firstName, contact.lastName, contact.organisation);
  }
  for (const customer of customers) {
    addEmail(customer.contactEmail);
    addCustomerPerson(people, customer.contactName, customer.name);
  }
  for (const row of suppressions) addEmail(row.email);
  for (const row of recipients) addEmail(row.recipient);
  return { emails, people };
}

export async function mailchimpDiagnosis(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  return diagnoseMailchimp();
}

export async function mailchimpContactCheck(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const report = mailchimpConfiguration().ok
    ? await reviewMailchimpContacts(await loadKnownMailchimpIdentities())
    : await reviewMailchimpContacts({ emails: new Set(), people: new Set() });
  try {
    await db.audit.create({
      data: {
        userId: actor,
        action: "MAILCHIMP_READONLY_CHECK",
        entityId: "mailchimp",
        detail: {
          configured: report.configured,
          reachable: report.reachable,
          audienceCount: report.audienceCount,
          errorClass: report.errorClass,
          imported: 0,
          persisted: false,
          sent: false,
          counts: report.counts,
        },
      },
    });
  } catch {
    // The read result remains usable when the audit row cannot be stored.
  }
  return report;
}
