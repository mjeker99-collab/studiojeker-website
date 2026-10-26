import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mailDayStart,
  insideMailWindow,
  localMailTime,
} from "../lib/mail-clock";
test("Schweizer Kalendertag, Sommerzeit und Winterzeit", () => {
  assert.equal(
    mailDayStart(new Date("2026-10-20T14:00:00Z")).toISOString(),
    "2026-10-19T22:00:00.000Z",
  );
  assert.equal(
    mailDayStart(new Date("2026-12-20T14:00:00Z")).toISOString(),
    "2026-12-19T23:00:00.000Z",
  );
  assert.equal(
    mailDayStart(new Date("2026-10-25T14:00:00Z")).toISOString(),
    "2026-10-24T22:00:00.000Z",
  );
  assert.equal(
    mailDayStart(new Date("2026-03-29T14:00:00Z")).toISOString(),
    "2026-03-28T23:00:00.000Z",
  );
  assert.equal(
    localMailTime(new Date("2026-10-20T23:00:00Z")).date,
    "2026-10-21",
  );
});
test("Versandfenster inklusive Start, exklusive Ende, Wochenende wählbar", () => {
  const s = { weekdaysOnly: true, startHour: 9, endHour: 17 };
  assert.equal(insideMailWindow(s, new Date("2026-10-20T07:00:00Z")), true);
  assert.equal(insideMailWindow(s, new Date("2026-10-20T06:59:00Z")), false);
  assert.equal(insideMailWindow(s, new Date("2026-10-20T15:00:00Z")), false);
  assert.equal(insideMailWindow(s, new Date("2026-10-24T08:00:00Z")), false);
  assert.equal(
    insideMailWindow(
      { ...s, weekdaysOnly: false },
      new Date("2026-10-24T08:00:00Z"),
    ),
    true,
  );
});

test("Nächster Slot berücksichtigt Tageslimit, Wochenende, Intervall und Zeitumstellung", async () => {
  const { nextMailSlot } = await import("../lib/mail-clock");
  const s = {
    weekdaysOnly: true,
    startHour: 8,
    endHour: 17,
    intervalMinutes: 5,
  };
  assert.equal(
    nextMailSlot(s, true, new Date("2026-10-23T08:00:00Z"))?.toISOString(),
    "2026-10-26T07:00:00.000Z",
  );
  assert.equal(
    nextMailSlot(s, false, new Date("2026-10-26T06:45:00Z"))?.toISOString(),
    "2026-10-26T07:00:00.000Z",
  );
  assert.equal(
    nextMailSlot(
      { ...s, lastClaimAt: "2026-10-26T09:00:00Z" },
      false,
      new Date("2026-10-26T09:01:00Z"),
    )?.toISOString(),
    "2026-10-26T09:05:00.000Z",
  );
});
