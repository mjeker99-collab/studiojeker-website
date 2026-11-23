import { PolicyError } from "../policy";
import { MailchimpReadError, mailchimpConfiguration, mailchimpGet } from "../hub/mailchimp";
import type { MailchimpErrorClass } from "../hub/mailchimp-report";
import { redactEmails } from "./sanitize";

const ID = /^[a-z0-9]{1,32}$/i;
const KEY_SHAPE = /\b[A-Za-z0-9_]{8,}-[a-z]{2,4}\d{1,3}\b/gi;
const MAX_LIMIT = 20;
const MAX_OFFSET = 10_000;
const QUERY_KEYS = new Set([
  "audienceOffset",
  "audienceLimit",
  "campaignOffset",
  "campaignLimit",
  "audienceId",
]);
const LIST_FIELDS =
  "lists.id,lists.name,lists.stats.member_count,lists.stats.unsubscribe_count,lists.stats.cleaned_count,lists.stats.total_contacts,total_items";
const LIST_ONE_FIELDS =
  "id,name,stats.member_count,stats.unsubscribe_count,stats.cleaned_count,stats.total_contacts";
const CAMPAIGN_FIELDS =
  "campaigns.id,campaigns.status,campaigns.type,campaigns.settings.title,campaigns.settings.subject_line,campaigns.send_time,campaigns.create_time,campaigns.emails_sent,campaigns.recipients.list_id,campaigns.recipients.list_name,total_items";
const CAMPAIGN_TYPES = new Set(["regular", "plaintext", "absplit", "rss", "variate", "automation"]);
const CAMPAIGN_STATUS = new Set([
  "save",
  "paused",
  "schedule",
  "sending",
  "sent",
  "canceled",
  "canceling",
  "archived",
]);

const messages: Record<MailchimpErrorClass, string> = {
  none: "",
  not_configured: "Mailchimp ist noch nicht verbunden.",
  invalid_configuration: "Die Mailchimp-Verbindung ist unvollständig.",
  auth: "Mailchimp hat den Zugang abgelehnt.",
  timeout: "Mailchimp hat nicht rechtzeitig geantwortet.",
  unreachable: "Mailchimp ist gerade nicht erreichbar.",
  rate_limited: "Mailchimp begrenzt gerade die Abfragen.",
  http: "Die Abfrage konnte nicht abgeschlossen werden.",
  invalid_response: "Die Abfrage konnte nicht abgeschlossen werden.",
  incomplete: "Die Abfrage umfasst nur einen Teil.",
};

export type MailchimpLiveQuery = {
  audienceOffset: number;
  audienceLimit: number;
  campaignOffset: number;
  campaignLimit: number;
  audienceId?: string;
};

export type MailchimpLiveError = {
  class: MailchimpErrorClass;
  part: "configuration" | "audiences" | "campaigns" | "status";
  message: string;
};

export type MailchimpStatusCounts = {
  subscribed: number | null;
  unsubscribed: number | null;
  cleaned: number | null;
  pending: number | null;
  transactional: number | null;
};

export type MailchimpLiveAudience = {
  id: string;
  name: string;
  memberCount: number | null;
  statusCounts: MailchimpStatusCounts;
};

export type MailchimpLiveCampaign = {
  id: string;
  status: string;
  type: string;
  title: string;
  subject: string;
  sendTime: string | null;
  createTime: string | null;
  emailsSent: number | null;
  audienceId: string | null;
  audienceName: string;
};

export type MailchimpPagingSlice = {
  offset: number;
  limit: number;
  total: number | null;
  returned: number;
  hasMore: boolean;
};

export type MailchimpLiveSnapshot = {
  retrievedAt: string;
  source: "mailchimp";
  live: boolean;
  readOnly: true;
  sent: false;
  persisted: false;
  error: MailchimpLiveError | null;
  paging: {
    audiences: MailchimpPagingSlice;
    campaigns: MailchimpPagingSlice;
  };
  audiences: MailchimpLiveAudience[];
  campaigns: MailchimpLiveCampaign[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function messageFor(errorClass: MailchimpErrorClass) {
  return messages[errorClass] || messages.http;
}

export function redactLiveText(value: string) {
  let out = value;
  for (const name of [
    "MAILCHIMP_API_KEY",
    "CHATGPT_CONNECTOR_TOKEN",
    "CHATGPT_CONNECTOR_WRITE_TOKEN",
  ] as const) {
    const secret = process.env[name]?.trim();
    if (!secret || secret.length < 8 || !out.includes(secret)) continue;
    out = out.split(secret).join("[redacted]");
  }
  return redactEmails(out).replace(KEY_SHAPE, "[redacted]");
}

function publicText(value: unknown, max: number, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = redactLiveText(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return cleaned || fallback;
}

function countOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function requireId(value: unknown) {
  if (typeof value !== "string" || !ID.test(value))
    throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
  return value;
}

function isoOrNull(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  )
    return null;
  return value;
}

function integerParam(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") {
    if (!/^\d+$/.test(value.trim())) throw new PolicyError("Ungültige Anfrage.", 400);
    value = Number(value.trim());
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new PolicyError("Ungültige Anfrage.", 400);
  return value;
}

function idParam(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ID.test(value.trim()))
    throw new PolicyError("Ungültige Anfrage.", 400);
  return value.trim();
}

export function parseMailchimpLiveQuery(input: unknown): MailchimpLiveQuery {
  if (input === undefined || input === null) input = {};
  if (typeof input !== "object" || Array.isArray(input))
    throw new PolicyError("Ungültige Anfrage.", 400);
  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!QUERY_KEYS.has(key)) throw new PolicyError("Ungültige Anfrage.", 400);
  }
  const audienceId = idParam(record.audienceId);
  return {
    audienceOffset: integerParam(record.audienceOffset, 0, 0, MAX_OFFSET),
    audienceLimit: integerParam(record.audienceLimit, MAX_LIMIT, 1, MAX_LIMIT),
    campaignOffset: integerParam(record.campaignOffset, 0, 0, MAX_OFFSET),
    campaignLimit: integerParam(record.campaignLimit, MAX_LIMIT, 1, MAX_LIMIT),
    ...(audienceId ? { audienceId } : {}),
  };
}

export function queryFromRequest(req: Request) {
  const url = new URL(req.url);
  const record: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(record, key))
      throw new PolicyError("Ungültige Anfrage.", 400);
    record[key] = value;
  }
  return parseMailchimpLiveQuery(record);
}

function blankPaging(offset: number, limit: number): MailchimpPagingSlice {
  return { offset, limit, total: null, returned: 0, hasMore: false };
}

function pageTotal(reported: unknown, length: number, offset: number, limit: number) {
  if (
    typeof reported === "number" &&
    Number.isInteger(reported) &&
    reported >= offset + length
  )
    return reported;
  if (length < limit) return offset + length;
  throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
}

function pagingFor(offset: number, limit: number, total: number, returned: number): MailchimpPagingSlice {
  return {
    offset,
    limit,
    total,
    returned,
    hasMore: returned > 0 && offset + returned < total,
  };
}

function path(pathname: string, params: Record<string, string>) {
  return `${pathname}?${new URLSearchParams(params).toString()}`;
}

function toError(error: unknown, part: MailchimpLiveError["part"]): MailchimpLiveError {
  const errorClass = error instanceof MailchimpReadError ? error.errorClass : "unreachable";
  return { class: errorClass, part, message: messageFor(errorClass) };
}

function audienceOf(item: unknown): MailchimpLiveAudience {
  const record = asRecord(item);
  const stats = asRecord(record.stats);
  return {
    id: requireId(record.id),
    name: publicText(record.name, 200, "Ohne Namen"),
    memberCount: countOrNull(stats.total_contacts),
    statusCounts: {
      subscribed: countOrNull(stats.member_count),
      unsubscribed: countOrNull(stats.unsubscribe_count),
      cleaned: countOrNull(stats.cleaned_count),
      pending: null,
      transactional: null,
    },
  };
}

function campaignOf(item: unknown): MailchimpLiveCampaign {
  const record = asRecord(item);
  const settings = asRecord(record.settings);
  const recipients = asRecord(record.recipients);
  const audienceId = recipients.list_id;
  return {
    id: requireId(record.id),
    status:
      typeof record.status === "string" && CAMPAIGN_STATUS.has(record.status)
        ? record.status
        : "unknown",
    type:
      typeof record.type === "string" && CAMPAIGN_TYPES.has(record.type) ? record.type : "unknown",
    title: publicText(settings.title, 300, "Ohne Titel"),
    subject: publicText(settings.subject_line, 300, ""),
    sendTime: isoOrNull(record.send_time),
    createTime: isoOrNull(record.create_time),
    emailsSent: countOrNull(record.emails_sent),
    audienceId: typeof audienceId === "string" && ID.test(audienceId) ? audienceId : null,
    audienceName: publicText(recipients.list_name, 200, ""),
  };
}

async function mapPool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index]!);
    }
  }
  const workers = Math.min(limit, items.length);
  if (workers === 0) return results;
  await Promise.all(Array.from({ length: workers }, () => run()));
  return results;
}

async function memberTotal(listId: string, status: "pending" | "transactional") {
  const record = asRecord(
    await mailchimpGet<unknown>(
      path(`/lists/${encodeURIComponent(listId)}/members`, {
        status,
        count: "1",
        fields: "total_items",
      }),
    ),
  );
  const total = countOrNull(record.total_items);
  if (total === null)
    throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
  return total;
}

async function readAudiencePage(query: MailchimpLiveQuery) {
  let items: unknown[];
  let total: number;
  if (query.audienceId) {
    const one = asRecord(
      await mailchimpGet<unknown>(
        path(`/lists/${encodeURIComponent(query.audienceId)}`, { fields: LIST_ONE_FIELDS }),
      ),
    );
    items = query.audienceOffset > 0 ? [] : [one];
    total = 1;
  } else {
    const record = asRecord(
      await mailchimpGet<unknown>(
        path("/lists", {
          count: String(query.audienceLimit),
          offset: String(query.audienceOffset),
          fields: LIST_FIELDS,
        }),
      ),
    );
    if (!Array.isArray(record.lists))
      throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
    items = record.lists.slice(0, query.audienceLimit);
    total = pageTotal(record.total_items, items.length, query.audienceOffset, query.audienceLimit);
  }
  let statusError: MailchimpReadError | null = null;
  const audiences = await mapPool(items, 4, async (item) => {
    const audience = audienceOf(item);
    const [pending, transactional] = await Promise.allSettled([
      memberTotal(audience.id, "pending"),
      memberTotal(audience.id, "transactional"),
    ]);
    for (const result of [pending, transactional]) {
      if (result.status === "rejected" && !statusError) {
        statusError =
          result.reason instanceof MailchimpReadError
            ? result.reason
            : new MailchimpReadError("Mailchimp ist gerade nicht erreichbar.", "unreachable");
      }
    }
    return {
      ...audience,
      statusCounts: {
        ...audience.statusCounts,
        pending: pending.status === "fulfilled" ? pending.value : null,
        transactional: transactional.status === "fulfilled" ? transactional.value : null,
      },
    };
  });
  return {
    audiences,
    paging: pagingFor(query.audienceOffset, query.audienceLimit, total, audiences.length),
    statusError,
  };
}

async function readCampaignPage(query: MailchimpLiveQuery) {
  const params: Record<string, string> = {
    count: String(query.campaignLimit),
    offset: String(query.campaignOffset),
    sort_field: "create_time",
    sort_dir: "DESC",
    fields: CAMPAIGN_FIELDS,
  };
  if (query.audienceId) params.list_id = query.audienceId;
  const record = asRecord(await mailchimpGet<unknown>(path("/campaigns", params)));
  if (!Array.isArray(record.campaigns))
    throw new MailchimpReadError("Mailchimp-Antwort war ungültig.", "invalid_response");
  const items = record.campaigns.slice(0, query.campaignLimit);
  const campaigns = items.map(campaignOf);
  const total = pageTotal(
    record.total_items,
    items.length,
    query.campaignOffset,
    query.campaignLimit,
  );
  return {
    campaigns,
    paging: pagingFor(query.campaignOffset, query.campaignLimit, total, campaigns.length),
  };
}

/** Live Mailchimp read. Uses mailchimpGet, which is GET-only. No contact payload is copied. */
export async function readMailchimpLive(raw: unknown = {}): Promise<MailchimpLiveSnapshot> {
  const query = parseMailchimpLiveQuery(raw);
  const snapshot: MailchimpLiveSnapshot = {
    retrievedAt: new Date().toISOString(),
    source: "mailchimp",
    live: false,
    readOnly: true,
    sent: false,
    persisted: false,
    error: null,
    paging: {
      audiences: blankPaging(query.audienceOffset, query.audienceLimit),
      campaigns: blankPaging(query.campaignOffset, query.campaignLimit),
    },
    audiences: [],
    campaigns: [],
  };
  const cfg = mailchimpConfiguration();
  if (!cfg.ok) {
    snapshot.error = {
      class: cfg.errorClass,
      part: "configuration",
      message: messageFor(cfg.errorClass),
    };
    return snapshot;
  }
  const [audiences, campaigns] = await Promise.all([
    readAudiencePage(query).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    readCampaignPage(query).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);
  snapshot.live = true;
  if (audiences.ok) {
    snapshot.audiences = audiences.value.audiences;
    snapshot.paging.audiences = audiences.value.paging;
  }
  if (campaigns.ok) {
    snapshot.campaigns = campaigns.value.campaigns;
    snapshot.paging.campaigns = campaigns.value.paging;
  }
  if (!audiences.ok) snapshot.error = toError(audiences.error, "audiences");
  else if (!campaigns.ok) snapshot.error = toError(campaigns.error, "campaigns");
  else if (audiences.value.statusError) snapshot.error = toError(audiences.value.statusError, "status");
  return snapshot;
}
