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
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  await start(25);
  await runMailSchedule(sender);
  assert.equal(calls, 1);
  assert.equal(
    (
      await db.mailQueueItem.findUniqueOrThrow({
        where: { draftId_version: { draftId: a.d.id, version: 1 } },
      })
    ).status,
    "SKIPPED",
  );
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
