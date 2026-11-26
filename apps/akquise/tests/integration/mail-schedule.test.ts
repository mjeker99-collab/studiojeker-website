import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur isolierte lokale Testdatenbank.");
const schema = "test_mail_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
Object.assign(process.env, {
  MAIL_MODE: "production",
  ENABLE_EMAIL_SENDING: "true",
  SMTP_CONFIGURATION_CONFIRMED: "true",
  SMTP_HOST: "jovinus.metanet.ch",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "njeker@studiojeker.ch",
  MAIL_FROM: "njeker@studiojeker.ch",
  SMTP_PASSWORD: "synthetic-unused",
  DAILY_SEND_LIMIT: "25",
});
const { db } = await import("../../lib/db");
const {
  saveContact,
  newDraft,
  reviewDraft,
  legalReview,
  suppress,
  recordContactReply,
} = await import("../../lib/workflow");
const {
  mailScheduleMutation: mutate,
  runMailSchedule,
  mailScheduleState,
} = await import("../../lib/mail-schedule");
const { dispatchApproved } = await import("../../lib/delivery");
let user: string;
let calls = 0;
const sender = async (mail: { envelopeRecipients: string[] }) => {
  calls++;
  return { accepted: mail.envelopeRecipients, rejected: [] };
};
before(async () => {
  execFileSync(
    "node",
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      stdio: "pipe",
      timeout: 20000,
    },
  );
  user = (
    await db.user.create({
      data: {
        name: "Nora Jeker",
        email: "nora@example.test",
        passwordHash: "synthetic-unused",
      },
    })
  ).id;
});
beforeEach(async () => {
  calls = 0;
  process.env.MAIL_MODE = "production";
  process.env.DAILY_SEND_LIMIT = "25";
  await db.mailQueueItem.deleteMany();
  await db.delivery.deleteMany();
  await db.mailSchedule.deleteMany();
  await db.mailSchedule.create({
    data: {
      startHour: 0,
      endHour: 24,
      weekdaysOnly: false,
      intervalMinutes: 1,
    },
  });
});
after(async () => {
  await db.$disconnect();
  const cleanup = new PrismaClient({ datasourceUrl: url.toString() });
  await cleanup.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await cleanup.$disconnect();
});
async function prepared() {
  const suffix = randomBytes(6).toString("hex");
  const c = await saveContact(user, {
    organisation: "Synthetisch " + suffix,
    firstName: "Test",
    lastName: suffix,
    email: `${suffix}@example.test`,
    sourceUrl: "https://example.test/team",
    verifiedAt: new Date().toISOString(),
    confidence: "VERIFIED",
    hook: "Synthetischer dokumentierter Bedarf an Architekturbildern.",
    service: "Architekturfotografie",
  });
  const d = await newDraft(user, c.id);
  await legalReview(
    user,
    c.id,
    c.revision,
    true,
    "Synthetische explizite Einwilligung zum Test dokumentiert.",
    false,
  );
  await reviewDraft(user, d.id, 1, "APPROVED", true);
  return { c, d };
}
async function enqueue(d: { id: string; version: number }) {
  return mutate(user, "enqueue", {
    items: [{ draftId: d.id, version: d.version }],
    confirmDispatch: true,
  });
}
async function start(dailyLimit = 25) {
  const s = (await mailScheduleState()).schedule;
  await mutate(user, "settings", {
    revision: s.revision,
    enabled: true,
    dailyLimit,
    weekdaysOnly: false,
    startHour: 0,
    endHour: 24,
    intervalMinutes: 1,
    confirmDispatch: true,
  });
}
async function elapsed() {
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: { lastClaimAt: new Date(Date.now() - 600000) },
  });
}
test("Gleichzeitiger erster Browser- und Workerzugriff initialisiert genau einen Zeitplan", async () => {
  await db.mailSchedule.deleteMany();
  const states = await Promise.all(
    Array.from({ length: 5 }, () => mailScheduleState()),
  );
  assert.equal(await db.mailSchedule.count(), 1);
  assert.ok(
    states.every((s) => !s.schedule.enabled && s.schedule.dailyLimit === 25),
  );
});
test("Standard pausiert, Testmodus startet nicht und einplanen gibt nichts frei", async () => {
  const { d } = await prepared();
  await enqueue(d);
  await runMailSchedule(sender);
  assert.equal(calls, 0);
  process.env.MAIL_MODE = "test";
  process.env.TEST_MAIL_RECIPIENTS = "njeker@studiojeker.ch";
  await assert.rejects(start(), /Produktionsversand/);
  await runMailSchedule(sender);
  assert.equal(calls, 0);
  process.env.MAIL_MODE = "production";
  await reviewDraft(user, d.id, 1, "REJECTED", true);
  const result = await enqueue(d);
  assert.ok("results" in result && result.results?.[0].ok === false);
});
test("Parallele Ticks senden einmal, Neustart/Abstand und Tageslimit bleiben wirksam", async () => {
  const a = await prepared(),
    b = await prepared();
  await enqueue(a.d);
  await enqueue(b.d);
  await start(1);
  await Promise.all([
    runMailSchedule(sender),
    runMailSchedule(sender),
    runMailSchedule(sender),
  ]);
  assert.equal(calls, 1);
  await elapsed();
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  assert.equal(
    await db.mailQueueItem.count({ where: { status: "QUEUED" } }),
    1,
  );
  // Simulate a previous day's durable delivery, then the next day can progress.
  await db.delivery.updateMany({
    data: { createdAt: new Date(Date.now() - 86400000) },
  });
  await runMailSchedule(sender);
  assert.equal(calls, 2);
});
test("Abstand gilt auch bei freien Tagesplätzen und Pause stoppt nächsten Versand", async () => {
  const a = await prepared(),
    b = await prepared();
  await enqueue(a.d);
  await enqueue(b.d);
  await start();
  await runMailSchedule(sender);
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  await mutate(user, "pause", {});
  await elapsed();
  await runMailSchedule(sender);
  assert.equal(calls, 1);
});
test("Sperre und entzogene Freigabe werden nach Einplanung erneut geprüft", async () => {
  const a = await prepared(),
    b = await prepared();
  await enqueue(a.d);
  await enqueue(b.d);
  await start();
  await suppress(user, a.c.email, "Synthetischer Widerspruch");
  await reviewDraft(user, b.d.id, 1, "REJECTED", true);
  await runMailSchedule(sender);
  await runMailSchedule(sender);
  assert.equal(calls, 0);
  assert.equal(
    await db.mailQueueItem.count({ where: { status: "BLOCKED" } }),
    2,
  );
});
test("Einzelversand zählt mit und kein Duplikat aus der Warteschlange", async () => {
  const a = await prepared(),
    b = await prepared();
  await enqueue(a.d);
  await enqueue(b.d);
  await start(1);
  await dispatchApproved(user, a.d.id, 1, sender);
  assert.ok((await mailScheduleState()).schedule.lastClaimAt);
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  await start(25);
  await runMailSchedule(sender);
  // Sending now also counts toward the schedule's spacing. The next queued
  // recipient must wait, while A is already marked as sent.
  assert.equal(calls, 1);
  assert.equal(
    (
      await db.mailQueueItem.findUniqueOrThrow({
        where: { draftId_version: { draftId: a.d.id, version: 1 } },
      })
    ).status,
    "SENT",
  );
  assert.equal(await db.delivery.count({ where: { recipient: a.c.email } }), 1);
  assert.equal(await db.delivery.count({ where: { recipient: b.c.email } }), 0);
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  await elapsed();
  await runMailSchedule(sender);
  assert.equal(calls, 2);
  assert.equal(await db.delivery.count({ where: { recipient: b.c.email } }), 1);
});
test("Unklarer SMTP-Ausgang pausiert dauerhaft; Abgleich erlaubt keine Wiederholung", async () => {
  const a = await prepared();
  await enqueue(a.d);
  await start();
  await runMailSchedule(async () => {
    calls++;
    throw new Error("synthetic timeout");
  });
  assert.equal(calls, 1);
  const state = await mailScheduleState();
  assert.equal(state.schedule.enabled, false);
  assert.equal(state.items[0].status, "UNKNOWN");
  await assert.rejects(start(), /Unklare/);
  await mutate(user, "resolve", {
    id: state.items[0].id,
    rationale: "Synthetisch im SMTP-Protokoll abgeglichen.",
  });
  await start();
  await elapsed();
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  const result = await enqueue(a.d);
  assert.ok("results" in result && result.results?.[0].ok === false);
});
test("Abgebrochener Claim nach Serverneustart wird nie wiederholt", async () => {
  const a = await prepared();
  await enqueue(a.d);
  await start();
  // Recovery must work even if someone paused during the interrupted attempt.
  await mutate(user, "pause", {});
  await db.mailQueueItem.updateMany({
    data: { status: "SENDING", updatedAt: new Date(Date.now() - 300000) },
  });
  await runMailSchedule(sender);
  assert.equal(calls, 0);
  assert.equal((await mailScheduleState()).schedule.enabled, false);
  assert.equal((await mailScheduleState()).items[0].status, "UNKNOWN");
});
test("Stale Einstellungen und Serverlimit werden abgewiesen", async () => {
  const s = (await mailScheduleState()).schedule;
  await mutate(user, "pause", {});
  await assert.rejects(
    mutate(user, "settings", {
      revision: s.revision,
      enabled: true,
      dailyLimit: 25,
      weekdaysOnly: false,
      startHour: 0,
      endHour: 24,
      intervalMinutes: 1,
      confirmDispatch: true,
    }),
    /Zeitplan wurde geändert/,
  );
  process.env.DAILY_SEND_LIMIT = "20";
  await assert.rejects(start(25), /Serverlimit/);
});

test("Gemeinsame Freigabe und Einplanung verlangt Bestätigung und bleibt versionsgebunden", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const { d } = await prepared();
  const preview = await mailReview(user, "preview", { ids: [d.id] });
  if (!("rows" in preview) || !preview.rows) throw new Error("Vorschau fehlt");
  const { id, version, hash, contactRevision } = preview.rows[0];
  const body = { items: [{ id, version, hash, contactRevision }], read: true };
  await assert.rejects(
    mailReview(user, "approve-and-enqueue", body),
    /bestätigen/,
  );
  assert.equal(await db.mailQueueItem.count(), 0);
  const result = await mailReview(user, "approve-and-enqueue", {
    ...body,
    confirmDispatch: true,
  });
  assert.ok("results" in result && result.results?.[0].ok);
  assert.equal(
    await db.mailQueueItem.count({
      where: { draftId: d.id, version, status: "QUEUED" },
    }),
    1,
  );
  assert.equal(await db.delivery.count(), 0);
  await mailReview(user, "approve-and-enqueue", {
    ...body,
    confirmDispatch: true,
  });
  assert.equal(await db.mailQueueItem.count({ where: { draftId: d.id } }), 1);
  assert.equal((await mailScheduleState()).schedule.enabled, false);
});

test("Antwort stoppt Warteschlange und Direktversand; Wiedervorlage sendet nichts", async () => {
  const { c, d } = await prepared();
  await enqueue(d);
  await start();
  await recordContactReply(user, c.id, {
    revision: c.revision,
    outcome: "NO_NEED",
    note: "Derzeit kein Bedarf",
    followUpOn: "2027-04-29",
  });
  const saved = await db.contact.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(saved.status, "REPLIED");
  assert.equal(saved.replyOutcome, "NO_NEED");
  assert.equal(saved.followUpOn, "2027-04-29");
  assert.equal(
    (await db.mailQueueItem.findFirstOrThrow({ where: { draftId: d.id } }))
      .status,
    "CANCELLED",
  );
  await runMailSchedule(sender);
  await assert.rejects(dispatchApproved(user, d.id, d.version, sender));
  assert.equal(calls, 0);
  await assert.rejects(
    recordContactReply(user, c.id, {
      revision: c.revision,
      outcome: "INTERESTED",
    }),
    /geändert/,
  );
});

test("Nicht mehr kontaktieren sperrt auch doppelte Kontaktadresse und bleibt gesperrt", async () => {
  const { c } = await prepared();
  const duplicate = await db.contact.create({
    data: {
      organisation: "Zweiter Datensatz",
      firstName: "Duplikat",
      lastName: "Test",
      email: c.email,
      personKey: "duplicate-" + c.id,
    },
  });
  await recordContactReply(user, c.id, {
    revision: c.revision,
    outcome: "DO_NOT_CONTACT",
  });
  assert.ok(await db.suppression.findUnique({ where: { email: c.email } }));
  assert.equal(
    (await db.contact.findUniqueOrThrow({ where: { id: duplicate.id } }))
      .status,
    "DO_NOT_CONTACT",
  );
  await recordContactReply(user, c.id, {
    revision: c.revision + 1,
    outcome: "INTERESTED",
    followUpOn: "2027-04-29",
  });
  const saved = await db.contact.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(saved.replyOutcome, "DO_NOT_CONTACT");
  assert.equal(saved.followUpOn, "");
});

test("Interessiert dokumentiert Antwort; gesendete Mail wird als beantwortet markiert", async () => {
  const { c, d } = await prepared();
  await dispatchApproved(user, d.id, d.version, sender);
  await recordContactReply(user, c.id, {
    revision: c.revision,
    outcome: "INTERESTED",
    note: "Bitte anrufen",
  });
  assert.equal(
    (await db.delivery.findFirstOrThrow({ where: { draftId: d.id } })).status,
    "REPLIED",
  );
  assert.equal(
    (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).replyNote,
    "Bitte anrufen",
  );
  assert.equal(calls, 1);
});

test("Jetzt senden aktualisiert eingeplante Mail und verhindert erneuten Versand", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const { d } = await prepared();
  await enqueue(d);
  const preview = await mailReview(user, "preview", { ids: [d.id] });
  if (!("rows" in preview) || !preview.rows) throw new Error("Vorschau fehlt");
  const { id, version, hash, contactRevision } = preview.rows[0];
  const result = await mailReview(
    user,
    "approve-and-send",
    {
      items: [{ id, version, hash, contactRevision }],
      read: true,
      confirmDispatch: true,
    },
    sender,
  );
  assert.ok("results" in result && result.results?.[0].ok);
  assert.equal(calls, 1);
  const queued = await db.mailQueueItem.findFirstOrThrow({
    where: { draftId: d.id },
  });
  assert.equal(queued.status, "SENT");
  assert.ok(queued.deliveryId);
  await start();
  await runMailSchedule(sender);
  assert.equal(calls, 1);
});

test("Sofortversand unterscheidet sichere Prüfrückstellung von unklarem SMTP", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const { d } = await prepared();
  const preview = await mailReview(user, "preview", { ids: [d.id] });
  if (!("rows" in preview) || !preview.rows) throw new Error("Vorschau fehlt");
  const { id, version, hash, contactRevision } = preview.rows[0];
  const body = {
    items: [{ id, version, hash, contactRevision }],
    read: true,
    confirmDispatch: true,
  };
  const stale = await mailReview(
    user,
    "approve-and-send",
    {
      ...body,
      items: [{ ...body.items[0], contactRevision: contactRevision + 1 }],
    },
    sender,
  );
  assert.ok("results" in stale && stale.results);
  assert.equal(stale.results?.[0].ok, false);
  assert.equal(
    "stopBatch" in stale.results[0] && stale.results[0].stopBatch,
    false,
  );
  assert.equal(calls, 0);
  const uncertain = await mailReview(
    user,
    "approve-and-send",
    body,
    async () => {
      calls++;
      throw new Error("Synthetic SMTP timeout");
    },
  );
  assert.ok("results" in uncertain && uncertain.results);
  assert.equal(uncertain.results[0].ok, false);
  assert.equal(
    "stopBatch" in uncertain.results[0] && uncertain.results[0].stopBatch,
    true,
  );
  assert.equal(calls, 1);
});

test("Sofortversand beansprucht die Warteschlange vor SMTP und pausiert bei unklarem Ergebnis", async () => {
  const { d } = await prepared();
  await enqueue(d);
  await start();
  let claimedStatus = "";
  let claimedDeliveryId: string | null = null;
  const result = await dispatchApproved(user, d.id, d.version, async () => {
    calls++;
    const queued = await db.mailQueueItem.findFirstOrThrow({
      where: { draftId: d.id },
    });
    claimedStatus = queued.status;
    claimedDeliveryId = queued.deliveryId;
    throw new Error("Synthetic SMTP timeout");
  });
  assert.equal(claimedStatus, "SENDING");
  assert.ok(claimedDeliveryId);
  assert.equal(result.delivery.status, "UNKNOWN");
  assert.equal((await mailScheduleState()).schedule.enabled, false);
  assert.equal(
    (await db.mailQueueItem.findFirstOrThrow({ where: { draftId: d.id } }))
      .status,
    "UNKNOWN",
  );
  await runMailSchedule(sender);
  assert.equal(calls, 1);
});

test("discard removes only unsent selected drafts, cancels their queue and keeps contacts", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const a = await prepared();
  const b = await prepared();
  await enqueue(a.d);
  await assert.rejects(
    mailReview(user, "discard", { items: [{ id: a.d.id, version: 1 }] }),
  );
  const result = await mailReview(user, "discard", {
    confirmed: true,
    items: [{ id: a.d.id, version: 1 }],
  });
  assert.equal("results" in result && result.results?.[0].ok, true);
  assert.equal(await db.draft.findUnique({ where: { id: a.d.id } }), null);
  assert.ok(await db.contact.findUnique({ where: { id: a.c.id } }));
  assert.ok(await db.draft.findUnique({ where: { id: b.d.id } }));
  assert.equal(
    (await db.mailQueueItem.findFirstOrThrow({ where: { draftId: a.d.id } }))
      .status,
    "CANCELLED",
  );
  const stale = await mailReview(user, "discard", {
    confirmed: true,
    items: [{ id: b.d.id, version: 2 }],
  });
  assert.equal("results" in stale && stale.results?.[0].ok, false);
  await dispatchApproved(user, b.d.id, 1, sender);
  const sent = await mailReview(user, "discard", {
    confirmed: true,
    items: [{ id: b.d.id, version: 1 }],
  });
  assert.equal("results" in sent && sent.results?.[0].ok, false);
  assert.ok(await db.draft.findUnique({ where: { id: b.d.id } }));
  assert.equal(await db.delivery.count({ where: { draftId: b.d.id } }), 1);
});

test("missing contact and draft do not abort the remaining previews", async () => {
  const { c, d } = await prepared();
  const { prepareContacts } =
    await import("../../lib/contact-preparation-service");
  const { mailReview } = await import("../../lib/mail-review");
  const preview = await prepareContacts(user, "preview", {
    ids: ["deleted-contact", c.id],
  });
  assert.ok(preview.contacts);
  assert.equal(preview.contacts.length, 1);
  const review = await mailReview(user, "preview", {
    ids: ["deleted-draft", d.id],
  });
  assert.ok(review.rows);
  assert.ok(review.unavailable);
  assert.equal(review.rows.length, 1);
  assert.equal(review.rows[0].id, d.id);
  assert.equal(review.unavailable.length, 1);
});

test("queued group starts durably once and recipient rejection leaves other mails running", async () => {
  const first = await prepared();
  const second = await prepared();
  await enqueue(first.d);
  await enqueue(second.d);
  // Repeat queue request is idempotent, not a second job.
  await enqueue(first.d);
  assert.equal(
    await db.mailQueueItem.count({ where: { status: "QUEUED" } }),
    2,
  );
  await mutate(user, "start", { confirmDispatch: true });
  await runMailSchedule(async (mail) => ({
    accepted: [],
    rejected: mail.envelopeRecipients,
  }));
  assert.equal((await mailScheduleState()).schedule.enabled, true);
  assert.equal(
    await db.mailQueueItem.count({ where: { status: "FAILED" } }),
    1,
  );
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: { lastClaimAt: null },
  });
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  assert.equal(await db.mailQueueItem.count({ where: { status: "SENT" } }), 1);
});

test("archive cancels pending mail and restore never restores approval", async () => {
  const { c, d } = await prepared();
  await enqueue(d);
  const { archiveContact } = await import("../../lib/workflow");
  await archiveContact(user, c.id, c.revision, true);
  assert.equal(
    await db.mailQueueItem.count({
      where: { draftId: d.id, status: "CANCELLED" },
    }),
    1,
  );
  assert.ok(
    (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).archivedAt,
  );
  await archiveContact(user, c.id, c.revision + 1, false);
  assert.equal(
    (await db.contact.findUniqueOrThrow({ where: { id: c.id } })).archivedAt,
    null,
  );
  assert.equal(
    await db.approval.count({ where: { draftId: d.id, status: "APPROVED" } }),
    0,
  );
});

function asPlan(value: unknown) {
  const result = value as {
    summary?: {
      queued: number;
      started: number;
      capped: boolean;
      message: string;
    };
    results?: { ok: boolean; message: string; body?: string }[];
  };
  if (!result.results) throw new Error("Unvollständige Versandantwort");
  return {
    summary: result.summary ?? {
      queued: 0,
      started: 0,
      capped: false,
      message: "",
    },
    results: result.results,
  };
}
async function planItem(entry: {
  c: { revision: number };
  d: { id: string; version: number };
}) {
  const version = await db.draftVersion.findUniqueOrThrow({
    where: {
      draftId_version: { draftId: entry.d.id, version: entry.d.version },
    },
  });
  return {
    id: entry.d.id,
    version: entry.d.version,
    hash: version.hash,
    contactRevision: entry.c.revision,
  };
}

test("Versand planen speichert die Zürcher Uhrzeit und wartet nicht auf das Tagesfenster", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const { zurichFields } = await import("../../lib/mail-clock");
  const entry = await prepared();
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: { enabled: false, weekdaysOnly: true, startHour: 9, endHour: 10 },
  });
  const fields = zurichFields(new Date(Date.now() + 3 * 86400000));
  const planned = asPlan(
    await mailReview(
      user,
      "approve-and-plan",
      {
        items: [await planItem(entry)],
        read: true,
        confirmDispatch: true,
        mode: "scheduled",
        localDate: fields.date,
        localTime: fields.time,
      },
      sender,
    ),
  );
  assert.equal(calls, 0);
  assert.equal(planned.summary.queued, 1);
  assert.match(planned.summary.message, /eingeplant/);
  const stored = await db.mailQueueItem.findFirstOrThrow({
    where: { draftId: entry.d.id },
  });
  assert.ok(
    stored.sendAfter && stored.sendAfter.getTime() > Date.now() + 86400000,
  );
  await runMailSchedule(sender);
  assert.equal(calls, 0);
  await db.mailQueueItem.update({
    where: { id: stored.id },
    data: { sendAfter: new Date(Date.now() - 1000) },
  });
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  const stale = await planItem(entry);
  await assert.rejects(
    () =>
      mailReview(
        user,
        "approve-and-plan",
        {
          items: [stale],
          read: true,
          confirmDispatch: true,
          mode: "scheduled",
          localDate: "2020-01-01",
          localTime: "08:00",
        },
        sender,
      ),
    /Vergangenheit/,
  );
});

test("Sofort senden startet eine Mail und ein fehlerhafter Kontakt blockiert die anderen nicht", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const { saveContact, newDraft } = await import("../../lib/workflow");
  const good = await prepared();
  const suffix = randomBytes(4).toString("hex");
  const badContact = await saveContact(user, {
    organisation: "Unvollständig " + suffix,
    firstName: "Eva",
    lastName: suffix,
    email: `${suffix}@example.test`,
    sourceUrl: "https://example.test/team",
    verifiedAt: new Date().toISOString(),
    confidence: "VERIFIED",
    hook: "Synthetischer dokumentierter Bedarf an Architekturbildern.",
    service: "Architekturfotografie",
  });
  const badDraft = await newDraft(user, badContact.id);
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: {
      enabled: false,
      weekdaysOnly: true,
      startHour: 9,
      endHour: 10,
      dailyLimit: 25,
    },
  });
  const result = asPlan(
    await mailReview(
      user,
      "approve-and-plan",
      {
        items: [
          await planItem(good),
          await planItem({ c: badContact, d: badDraft }),
        ],
        read: true,
        confirmDispatch: true,
        mode: "immediate",
      },
      sender,
    ),
  );
  assert.equal(
    result.results.filter((item: { ok: boolean }) => item.ok).length,
    1,
  );
  const failed = result.results.find((item) => !item.ok);
  if (!failed) throw new Error("Fehlerhafter Kontakt wurde nicht gemeldet");
  assert.match(failed.message, /rechtliche Versandprüfung/);
  assert.equal(calls, 1);
  assert.equal(result.summary.started, 1);
  assert.match(result.summary.message, /in den Versand gegangen/);
});

test("Tageslimit lässt weitere Sofortmails warten und nennt den nächsten Zeitpunkt", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const first = await prepared();
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: {
      enabled: false,
      dailyLimit: 1,
      weekdaysOnly: false,
      startHour: 0,
      endHour: 24,
    },
  });
  await mailReview(
    user,
    "approve-and-plan",
    {
      items: [await planItem(first)],
      read: true,
      confirmDispatch: true,
      mode: "immediate",
    },
    sender,
  );
  assert.equal(calls, 1);
  const second = await prepared();
  const capped = asPlan(
    await mailReview(
      user,
      "approve-and-plan",
      {
        items: [await planItem(second)],
        read: true,
        confirmDispatch: true,
        mode: "immediate",
      },
      sender,
    ),
  );
  assert.equal(calls, 1);
  assert.equal(capped.summary.started, 0);
  assert.equal(capped.summary.capped, true);
  assert.match(capped.summary.message, /Tageslimit von 1/);
  assert.equal(
    await db.mailQueueItem.count({
      where: { draftId: second.d.id, status: "QUEUED" },
    }),
    1,
  );
});

test("Globale Textänderung entwertet die Freigabe und lässt versendete Mails stehen", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const entry = await prepared();
  const preview = asPlan(
    await mailReview(user, "revise", {
      items: [{ id: entry.d.id, version: entry.d.version }],
      find: "unverbindlichen",
      replace: "kurzen",
      confirmed: false,
    }),
  );
  assert.equal(preview.results[0].ok, true);
  assert.match(preview.results[0].body || "", /kurzen/);
  assert.equal(
    await db.approval.count({
      where: { draftId: entry.d.id, status: "APPROVED" },
    }),
    1,
  );
  const applied = asPlan(
    await mailReview(user, "revise", {
      items: [{ id: entry.d.id, version: entry.d.version }],
      find: "unverbindlichen",
      replace: "kurzen",
      confirmed: true,
    }),
  );
  assert.equal(applied.results[0].ok, true);
  assert.equal(
    (await db.draft.findUniqueOrThrow({ where: { id: entry.d.id } })).version,
    2,
  );
  assert.equal(
    await db.approval.count({
      where: { draftId: entry.d.id, status: "APPROVED" },
    }),
    0,
  );
  const sent = await prepared();
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: { enabled: false, dailyLimit: 25 },
  });
  await mailReview(
    user,
    "approve-and-plan",
    {
      items: [await planItem(sent)],
      read: true,
      confirmDispatch: true,
      mode: "immediate",
    },
    sender,
  );
  const blocked = asPlan(
    await mailReview(user, "revise", {
      items: [{ id: sent.d.id, version: sent.d.version }],
      find: "unverbindlichen",
      replace: "kurzen",
      confirmed: true,
    }),
  );
  assert.equal(blocked.results[0].ok, false);
  assert.match(blocked.results[0].message, /versandt|eingeplant/i);
});

test("Globale Ergänzung hat Vorschau, neue Version und keine alte Freigabe", async () => {
  const { mailReview } = await import("../../lib/mail-review");
  const entry = await prepared();
  const change = {
    items: [{ id: entry.d.id, version: entry.d.version }],
    find: "",
    replace: "",
    append: "Zusätzliche gemeinsame Information.",
  };
  const preview = asPlan(
    await mailReview(user, "revise", { ...change, confirmed: false }),
  );
  assert.equal(preview.results[0].ok, true);
  assert.match(
    preview.results[0].body || "",
    /Zusätzliche gemeinsame Information/,
  );
  assert.equal(
    (await db.draft.findUniqueOrThrow({ where: { id: entry.d.id } })).version,
    entry.d.version,
  );
  const applied = asPlan(
    await mailReview(user, "revise", { ...change, confirmed: true }),
  );
  assert.equal(applied.results[0].ok, true);
  assert.equal(
    (await db.draft.findUniqueOrThrow({ where: { id: entry.d.id } })).version,
    entry.d.version + 1,
  );
  assert.equal(
    await db.approval.count({
      where: { draftId: entry.d.id, status: "APPROVED" },
    }),
    0,
  );
});
