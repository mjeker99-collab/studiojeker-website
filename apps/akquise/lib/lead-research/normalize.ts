const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "bluewin.ch",
  "gmx.ch",
  "gmx.net",
  "gmx.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "yahoo.de",
]);

const LEGAL_FORM =
  /\b(ag|gmbh|sarl|sagl|sa|kg|se|genossenschaft|einzelfirma)\b/gi;

export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

export function emailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  return at >= 0 ? normalized.slice(at + 1) : "";
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL.has(domain.toLowerCase());
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function sameOrganisationHost(email: string, website: string): boolean {
  const domain = emailDomain(email);
  const host = hostOf(website);
  if (!domain || !host || isFreeMailDomain(domain)) return false;
  return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
}

export function normalizeCompany(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("de-CH")
    .replace(/&/g, " und ")
    .replace(LEGAL_FORM, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePerson(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("de-CH")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function personCompanyKey(person: string, company: string): string {
  return `${normalizePerson(person)}|${normalizeCompany(company)}`;
}

export function spreadsheetLiteral(value: string): string {
  const flat = value.replace(/\t/g, " ").replace(/\r/g, "");
  return /^[=+\-@]/.test(flat) ? `'${flat}` : flat;
}
