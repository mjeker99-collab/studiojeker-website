export function zurichDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function swissDate(dayKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return dayKey;
  return `${Number(match[3])}. ${month} ${match[1]}`;
}

export function promoActive(dayKey: string, until: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey) &&
    /^\d{4}-\d{2}-\d{2}$/.test(until) &&
    dayKey <= until;
}

export function promoLabel(until: string, active: boolean): string {
  return active
    ? `Aktion bis ${swissDate(until)}: Beratung, Analyse und Konzept kostenlos bei Ausführung.`
    : `Die Aktion bis ${swissDate(until)} ist abgelaufen. Kein kostenloses Paket.`;
}
