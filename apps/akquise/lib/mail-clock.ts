export const mailTimezone = "Europe/Zurich";
export function localMailTime(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: mailTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: parts.weekday,
  };
}
export function zurichFields(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: mailTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
// Wall-clock Europe/Zurich to one UTC instant. Missing DST times throw.
// A repeated time on the autumn change uses the earlier instant.
export function zurichInstant(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Datum oder Uhrzeit ist ungültig.");
  const [hour, minute] = time.split(":").map(Number);
  const wanted = hour * 60 + minute;
  const anchor = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(anchor)) throw new Error("Datum oder Uhrzeit ist ungültig.");
  const matches: Date[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const candidate = new Date(anchor + offset * 3600000);
    const local = localMailTime(candidate);
    if (local.date === date && local.minute === wanted) matches.push(candidate);
  }
  if (!matches.length)
    throw new Error("Diese Uhrzeit gibt es in der Schweiz an diesem Tag nicht.");
  matches.sort((a, b) => a.getTime() - b.getTime());
  return matches[0];
}
export function futureZurichInstant(date: string, time: string, now = new Date()) {
  const instant = zurichInstant(date, time);
  if (instant.getTime() + 60000 <= now.getTime())
    throw new Error("Der Zeitpunkt liegt in der Vergangenheit.");
  return instant;
}
export function formatZurich(instant: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: mailTimezone,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}
export function nextZurichMidnight(now = new Date()) {
  return mailDayStart(new Date(mailDayStart(now).getTime() + 26 * 3600000));
}
export function mailDayStart(now = new Date()) {
  const date = localMailTime(now).date;
  // Zurich midnight is between 21:00 UTC on the previous day and 01:00 UTC.
  const midnight = Date.parse(`${date}T00:00:00Z`);
  for (let offset = -3; offset <= 1; offset++) {
    const candidate = new Date(midnight + offset * 3600000);
    const local = localMailTime(candidate);
    if (local.date === date && local.minute === 0) return candidate;
  }
  throw new Error("Schweizer Tagesbeginn nicht bestimmbar.");
}
export function insideMailWindow(
  schedule: { weekdaysOnly: boolean; startHour: number; endHour: number },
  now = new Date(),
) {
  const local = localMailTime(now);
  return (
    (!schedule.weekdaysOnly || !["Sat", "Sun"].includes(local.weekday)) &&
    local.minute >= schedule.startHour * 60 &&
    local.minute < schedule.endHour * 60
  );
}

// Estimate only: the worker rechecks quota, approvals and suppression before sending.
export function nextMailSlot(
  schedule: {
    weekdaysOnly: boolean;
    startHour: number;
    endHour: number;
    intervalMinutes: number;
    lastClaimAt?: Date | string | null;
  },
  exhausted: boolean,
  now = new Date(),
) {
  const earliest = Math.max(
    now.getTime(),
    schedule.lastClaimAt
      ? new Date(schedule.lastClaimAt).getTime() +
          schedule.intervalMinutes * 60000
      : 0,
  );
  let candidate = new Date(earliest);
  const today = localMailTime(now).date;
  for (let hour = 0; hour < 8 * 24; hour++) {
    if (
      (!exhausted || localMailTime(candidate).date !== today) &&
      insideMailWindow(schedule, candidate)
    )
      return candidate;
    candidate = new Date(
      (Math.floor(candidate.getTime() / 3600000) + 1) * 3600000,
    );
  }
  return null;
}
