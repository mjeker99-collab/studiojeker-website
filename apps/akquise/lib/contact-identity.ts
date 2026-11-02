export const normalizeEmail = (email: string) =>
  email.normalize("NFKC").trim().toLowerCase();
export const personKey = (first: string, last: string, org: string) =>
  [first, last, org]
    .map((v) => v.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
const infoAddress = /^info(?:[.+_-][^@]*)?@/i;
const teamAddress = /^(?:marketing|kommunikation)(?:[.+_-][^@]*)?@/i;
const roleName =
  /^(?:team|marketing|kommunikation|abteilung|info|unbekannt|kontakt|postfach)$/i;
export const isInfoAddress = (email: string) =>
  infoAddress.test(normalizeEmail(email));
export const isTeamMailbox = (email: string) =>
  teamAddress.test(normalizeEmail(email));
export function hasPersonName(first = "", last = "") {
  const parts = [first, last]
    .map((value) => value.normalize("NFKC").trim())
    .filter(Boolean);
  return parts.length >= 2 && parts.every((part) => !roleName.test(part));
}
