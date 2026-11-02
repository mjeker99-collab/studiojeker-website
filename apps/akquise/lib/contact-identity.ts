export const normalizeEmail = (email: string) =>
  email.normalize("NFKC").trim().toLowerCase();
export const personKey = (first: string, last: string, org: string) =>
  [first, last, org]
    .map((v) => v.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
