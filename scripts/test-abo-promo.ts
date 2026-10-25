/** Promo date-window checks: npx tsx scripts/test-abo-promo.ts */
import assert from "node:assert/strict";
import {
  isAboPromoActive,
  zurichCalendarDate,
} from "../lib/content/abo-promo";
import { ABO_PROMO_DEFAULT_WINDOW, getAboPageContent } from "../lib/content/abo-page";

const window = {
  enabled: true,
  startDate: ABO_PROMO_DEFAULT_WINDOW.startDate,
  endDate: ABO_PROMO_DEFAULT_WINDOW.endDate,
};

// After 2026-10-25 Zurich is on CET (UTC+1); use Zurich-local wall times.
assert.equal(
  isAboPromoActive(window, new Date("2026-10-27T12:00:00+01:00")),
  false,
  "day before start is inactive",
);
assert.equal(
  isAboPromoActive(window, new Date("2026-10-28T00:30:00+01:00")),
  true,
  "start day (Zurich) is active",
);
assert.equal(
  isAboPromoActive(window, new Date("2026-11-15T12:00:00+01:00")),
  true,
  "mid-window is active",
);
assert.equal(
  isAboPromoActive(window, new Date("2026-11-30T23:30:00+01:00")),
  true,
  "end day (Zurich) is still active",
);
assert.equal(
  isAboPromoActive(window, new Date("2026-12-01T00:30:00+01:00")),
  false,
  "day after end is inactive",
);
assert.equal(
  isAboPromoActive({ ...window, enabled: false }, new Date("2026-11-01T12:00:00+01:00")),
  false,
  "disabled promo never activates",
);
assert.equal(
  isAboPromoActive(
    { enabled: true, startDate: "bad", endDate: "2026-11-30" },
    new Date("2026-11-01T12:00:00+01:00"),
  ),
  false,
  "invalid dates stay inactive",
);

const de = getAboPageContent("de");
assert.equal(de.promo.startDate, "2026-10-28");
assert.equal(de.promo.endDate, "2026-11-30");
assert.ok(de.promo.terms.length >= 3);
assert.match(de.packages.vatNote, /MWST/i);
assert.equal(de.packages.items.length, 3);
assert.equal(de.packages.items[0].price, "CHF 650.–");
assert.equal(de.packages.items[1].price, "CHF 1’250.–");
assert.match(de.packages.items[2].price, /Anfrage/i);
assert.ok(!/\d+\s*(Posts|Reels|Stück)/i.test(de.packages.items.flatMap((p) => p.features).join(" ")));

const today = zurichCalendarDate();
assert.match(today, /^\d{4}-\d{2}-\d{2}$/);

console.log("OK: abo promo window, packages fallback and MWST review note.");
