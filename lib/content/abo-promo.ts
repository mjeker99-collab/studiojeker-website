/**
 * Dynamic validity for the Content-Abo promotion window.
 * Dates are calendar days in Europe/Zurich (inclusive start and end).
 */

export type AboPromoWindow = {
  enabled: boolean;
  /** Inclusive start, ISO calendar date `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive end, ISO calendar date `YYYY-MM-DD`. */
  endDate: string;
};

const ZURICH = "Europe/Zurich";

/** Calendar `YYYY-MM-DD` for an instant in Europe/Zurich. */
export function zurichCalendarDate(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function isIsoCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Returns true when the promo is enabled and `now` falls on an inclusive
 * calendar day between startDate and endDate (Zurich time).
 */
export function isAboPromoActive(
  promo: AboPromoWindow,
  now: Date = new Date(),
): boolean {
  if (!promo.enabled) return false;
  if (!isIsoCalendarDate(promo.startDate) || !isIsoCalendarDate(promo.endDate)) {
    return false;
  }
  if (promo.startDate > promo.endDate) return false;

  const today = zurichCalendarDate(now);
  return today >= promo.startDate && today <= promo.endDate;
}
