// Store UTC instants; never interpret a datetime-local value in the server's timezone.
export const zone = "Europe/Zurich";
export function zurichInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return parts.replace(" ", "T");
}
export function zurichInstant(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Datum und Uhrzeit in Europe/Zurich erforderlich.");
  const candidates = [60, 120]
    .map((offset) => new Date(Date.parse(value + "Z") - offset * 60000))
    .filter((d) => !Number.isNaN(d.valueOf()) && zurichInput(d) === value);
  if (candidates.length !== 1)
    throw new Error(
      "Diese Zürcher Uhrzeit ist wegen der Zeitumstellung ungültig oder doppeldeutig. Bitte einen eindeutigen Termin wählen.",
    );
  return candidates[0].toISOString();
}
export function displayTime(value: string | Date | null | undefined) {
  return value
    ? new Date(value).toLocaleString("de-CH", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Nicht geplant";
}
