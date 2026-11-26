import { PLACES } from "./geo";
import { hostOf, normalizeEmail } from "./normalize";
import { injectionLine, splitCleanLines } from "./safety";
import type { Evidence, FetchedPage } from "./types";

const name = String.raw`[\p{Lu}][\p{L}'’\-]+(?:[ \t]+[\p{Lu}][\p{L}'’\-]+){1,3}`;
const role = "Geschäftsführerin|Geschäftsführer|Inhaberin|Inhaber|Mitinhaberin|Mitinhaber";
const email = /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi;
const company = /^[\p{L}\p{N}][\p{L}\p{N} &'’.,-]{2,90}\s(?:AG|GmbH|Sàrl|Sagl)$/u;
const postcode = /\b[1-9]\d{3}\s+/u;

export function websiteFields(pages: FetchedPage[], industry: string) {
  const contacts = new Map<string, { person: string; role: string; email: string; source: Evidence }>();
  const companies = new Map<string, Evidence>();
  const locations = new Map<string, Evidence>();
  const hooks = new Map<string, Evidence>();
  let industryEvidence = false;
  for (const page of pages) {
    const { clean } = splitCleanLines(page.text);
    const makeEvidence = (label: string, excerpt: string) => ({ label, excerpt, url: page.url });
    for (const [index, line] of clean.entries()) {
      if (company.test(line)) companies.set(line, makeEvidence("Firma", line));
      const place = PLACES.find(({ name: placeName }) =>
        postcode.test(line) && line.replace(postcode, "\n").split("\n").at(-1)?.trim() === placeName);
      if (place) locations.set(place.name, makeEvidence("Adresse", line));
      const block = clean.slice(index, index + 3).join(" ");
      const person = new RegExp(`^(${name})\\s*(?:[,–—-]\\s*)?(${role})\\b`, "u").exec(block);
      if (person) {
        const mailbox = person[1].normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().split(/\s+/);
        const addresses = [...new Set((block.match(email) ?? []).map(normalizeEmail))];
        const address = addresses.find((value) => {
          const local = value.split("@")[0].normalize("NFKD").replace(/\p{M}/gu, "");
          return local.includes(mailbox[0]) && local.includes(mailbox[mailbox.length - 1]);
        });
        if (address) contacts.set(address, {
          person: person[1], role: person[2], email: address,
          source: makeEvidence("Ansprechperson und E-Mail", block),
        });
      }

      const industryWords = industry.toLowerCase().match(/\p{L}{4,}/gu) ?? [];
      if (industryWords.some((word) => line.toLowerCase().includes(word))) industryEvidence = true;
      if (
        line.length >= 35 && line.length <= 180 &&
        /\b(projekt|referenz|werkstatt|fertigung|produktion|ausstellung|lehrstelle|sanierung|montage|sortiment|spezialisiert|hergestellt)\w*/i.test(line) &&
        !/@|https?:|cookie|datenschutz|impressum|javascript/i.test(line) &&
        !injectionLine(line)
      ) {
        hooks.set(line.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""), makeEvidence("Anknüpfung", line));
      }
    }
  }
  const contact = contacts.size === 1 ? [...contacts.values()][0] : undefined;
  const organisation = companies.size === 1 ? [...companies.entries()][0] : undefined;
  const place = locations.size === 1 ? [...locations.entries()][0] : undefined;
  return {
    organisation: organisation?.[0] ?? "",
    place: place?.[0] ?? "",
    person: contact?.person ?? "",
    role: contact?.role ?? "",
    email: contact?.email ?? "",
    industry: industryEvidence ? industry : "",
    hooks: [...hooks.values()].slice(0, 2),
    sources: [organisation?.[1], place?.[1], contact?.source].filter((item): item is Evidence => Boolean(item)),
    website: new URL("/", pages[0].url).href,
  };
}

export function groupWebsitePages(pages: FetchedPage[]): FetchedPage[][] {
  const groups = new Map<string, FetchedPage[]>();
  for (const page of pages) {
    const host = hostOf(page.url);
    if (!host || page.blockedReason) continue;
    const group = groups.get(host) ?? [];
    group.push(page);
    groups.set(host, group);
  }
  return [...groups.values()];
}
