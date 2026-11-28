import { createHash } from "node:crypto";
import { matchCandidate, type DedupeRecord } from "./dedupe";
import { classifyDistance } from "./geo";
import {
  emailDomain,
  hostOf,
  isFreeMailDomain,
  normalizeEmail,
  sameOrganisationHost,
  spreadsheetLiteral,
} from "./normalize";
import { websiteFields } from "./website";
import { splitCleanLines } from "./safety";
import { promoActive, swissDate } from "./time";
import {
  SHEET_HEADERS,
  type Candidate,
  type Evidence,
  type FetchedPage,
  type ResearchConfig,
} from "./types";

const GENERIC_LOCAL =
  /^(info|admin|office|kontakt|mail|postfach|sekretariat|support|service|sales|team|hello|contact)(?:[.+_-]|$)/i;
const TEAM_LOCAL = /^(marketing|kommunikation)(?:[.+_-]|$)/i;
const ROLE =
  /\b(Geschäftsführerin|Geschäftsführer|Inhaberin|Inhaber|Mitinhaberin|Mitinhaber|Geschäftsinhaberin|Geschäftsinhaber)\b/;
const GENERIC_HOOK = /^(tolle firma|hohe qualität|innovativ|führend|professionell)\b/i;

export interface Observation {
  organisation: string;
  place: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  website: string;
  industry: string;
  employees: number | null;
  coordinates: { lat: number; lon: number } | null;
  hooks: Evidence[];
  sources: Evidence[];
  injection: boolean;
  text: string;
}

function field(lines: string[], label: string): string {
  const pattern = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
  return lines.find((line) => pattern.test(line))?.replace(pattern, "$1").trim() ?? "";
}

function splitName(value: string): { firstName: string; lastName: string } {
  const parts = value.replace(/^(Frau|Herr|Dr\.|Prof\.)\s+/i, "").split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function concrete(text: string): boolean {
  const value = text.trim();
  return value.length >= 20 && !GENERIC_HOOK.test(value) && /\p{L}/u.test(value);
}

export function observePages(pages: FetchedPage[], industry: string, origin: string): Observation | null {
  const usable = pages.filter((page) => !page.blockedReason && page.text.trim());
  if (!usable.length) return null;
  const cleanLines: string[] = [];
  const quarantined: string[] = [];
  const sources: Evidence[] = [];
  for (const page of usable) {
    const split = splitCleanLines(page.text);
    cleanLines.push(...split.clean);
    quarantined.push(...split.quarantined);
    sources.push({
      label: origin,
      url: page.url,
      excerpt: split.clean.slice(0, 2).join(" ").slice(0, 240),
    });
  }
  if (usable.some((page) => page.websiteText)) {
    const fields = websiteFields(usable, industry);
    if (!fields.organisation && !fields.email) return null;
    return {
      ...fields,
      ...splitName(fields.person),
      employees: null,
      coordinates: null,
      injection: quarantined.length > 0,
      text: cleanLines.join("\n"),
    };
  }
  const organisation = field(cleanLines, "Firma") || field(cleanLines, "Organisation");
  const place = field(cleanLines, "Ort");
  const role = field(cleanLines, "Funktion") || field(cleanLines, "Rolle");
  const named = splitName(field(cleanLines, "Name"));
  const email = normalizeEmail(field(cleanLines, "E-Mail"));
  const website = field(cleanLines, "Website");
  const employeesRaw = field(cleanLines, "Mitarbeitende");
  const employees = /^\d{1,6}$/.test(employeesRaw) ? Number(employeesRaw) : null;
  const coordinateMatch = field(cleanLines, "Koordinaten").match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/,
  );
  const hooks: Evidence[] = [];
  for (const line of cleanLines) {
    const match = /^Anknüpfung\s*:\s*(.+)$/i.exec(line);
    if (!match) continue;
    const [excerpt, url] = match[1].split("|").map((part) => part.trim());
    if (!excerpt || !url || !/^https:\/\//.test(url) || !concrete(excerpt)) continue;
    hooks.push({ label: "Anknüpfung", url, excerpt });
  }
  if (!organisation && !email) return null;
  return {
    organisation,
    place,
    firstName: named.firstName,
    lastName: named.lastName,
    role,
    email,
    website,
    industry: field(cleanLines, "Branche") || industry,
    employees,
    coordinates: coordinateMatch
      ? { lat: Number(coordinateMatch[1]), lon: Number(coordinateMatch[2]) }
      : null,
    hooks,
    sources,
    injection: quarantined.length > 0,
    text: cleanLines.join("\n"),
  };
}

function ideaFor(industry: string, hook: string): string {
  const topic = hook.replace(/\.$/, "");
  if (/Lebensmittel/i.test(industry)) return `Produktbilder zu «${topic}»`;
  if (/Mobilität/i.test(industry)) return `ein kurzer Film zu «${topic}»`;
  if (/\bIT\b/i.test(industry)) return `ein Social-Media-Beitrag zu «${topic}»`;
  return `eine Fotoserie zu «${topic}»`;
}

export function draftIsSpecific(
  opening: [string, string] | null,
  organisation: string,
  hooks: string[],
): boolean {
  if (!opening || !organisation) return false;
  const idea = /Foto|Film|Produkt|Social-Media/i;
  return opening.every((sentence) => sentence.includes(organisation)) &&
    hooks.every((hook) => opening[0].includes(hook.slice(0, Math.min(24, hook.length)))) &&
    idea.test(opening[1]);
}

export function buildDraft(
  input: {
    organisation: string;
    place: string;
    firstName: string;
    lastName: string;
    industry: string;
    hooks: string[];
    priceChf: number;
    promoUntil: string;
    dayKey: string;
  },
): { subject: string; body: string; opening: [string, string] | null; complete: boolean } {
  const [first, second] = input.hooks;
  if (!input.organisation || !input.firstName || !input.lastName || !first || !second) {
    return { subject: "", body: "", opening: null, complete: false };
  }
  const idea = ideaFor(input.industry, first);
  const opening: [string, string] = [
    `${first} und ${second} belegen konkrete Arbeit der ${input.organisation} in ${input.place}.`,
    `Daraus lässt sich ${idea} für die ${input.organisation} entwickeln.`,
  ];
  const promo = promoActive(input.dayKey, input.promoUntil)
    ? `Bis zum ${swissDate(input.promoUntil)} sind Beratung, Analyse und Konzept kostenlos, wenn der Auftrag ausgeführt wird.\n\n`
    : "";
  const subject = `${input.organisation}: ${first}`.slice(0, 140);
  const body = [
    `Guten Tag ${input.firstName} ${input.lastName}`,
    "",
    opening[0],
    opening[1],
    "",
    "Vielen kleinen Betrieben ist kontinuierliche Kommunikation und Social Media wichtig. Im Tagesgeschäft fehlen oft Zeit, Know-how und Ressourcen. Studiojeker übernimmt Planung, Content-Produktion und Publikation. " +
      `Im Visibility Abo begleiten wir den Auftritt ab CHF ${input.priceChf} pro Monat.`,
    "",
    promo.trimEnd(),
    "Beste Grüsse",
    "Nora Jeker",
    "Studiojeker",
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
  const complete = draftIsSpecific(opening, input.organisation, [first, second]) &&
    body.startsWith(`Guten Tag ${input.firstName} ${input.lastName}`) &&
    body.includes("Beste Grüsse\nNora Jeker") &&
    !/gratis-monat/i.test(body) &&
    !body.toLowerCase().includes(`${input.organisation.toLowerCase()} fehlen`);
  return { subject, body, opening: complete ? opening : opening, complete };
}

function keyFor(email: string, organisation: string, place: string): string {
  const basis = normalizeEmail(email) || `${organisation}|${place}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

function officialHooks(hooks: Evidence[], email: string, website: string): boolean {
  const domain = emailDomain(email);
  const site = hostOf(website);
  const expected = !isFreeMailDomain(domain) && domain ? domain : site;
  if (!expected) return false;
  return hooks.length >= 2 && hooks.every((hook) => {
    const host = hostOf(hook.url);
    return host === expected || host.endsWith(`.${expected}`) || expected.endsWith(`.${host}`);
  });
}

export function evaluateObservation(
  observation: Observation,
  config: ResearchConfig,
  dayKey: string,
  corpus: DedupeRecord[],
  origin: string,
  nowIso: string,
): Candidate {
  const distance = classifyDistance(
    observation.place,
    observation.coordinates,
    config.center,
    config.radiusKm,
  );
  const base: Candidate = {
    idempotencyKey: keyFor(observation.email, observation.organisation, observation.place),
    legacy: false,
    dayKey,
    status: "OPEN",
    reason: "",
    organisation: observation.organisation,
    place: distance.place || observation.place,
    distanceKm: distance.km,
    distanceStatus: distance.status,
    firstName: observation.firstName,
    lastName: observation.lastName,
    role: observation.role,
    email: observation.email,
    website: observation.website,
    industry: observation.industry,
    employees: observation.employees,
    hooks: observation.hooks,
    sources: observation.sources,
    evidence: observation.hooks.map((hook, index) => ({
      label: `Beleg ${index + 1}`,
      url: hook.url,
      excerpt: hook.excerpt,
    })),
    checkedAt: nowIso,
    subject: "",
    body: "",
    opening: null,
    draftComplete: false,
    newsletterConsent: false,
    akquiseStatus: "Nicht kontaktiert",
    sendBlocked: true,
    priority: "Mittel",
    origin,
    hints: "",
    reviewStatus: "Menschliche Prüfung",
    sheetsConfirmed: false,
    admitted: false,
    holdAdmission: false,
  };
  const fail = (status: Candidate["status"], reason: string, review = status === "OPEN" ? "Menschliche Prüfung" : status === "DUPLICATE" ? "Bereits vorhanden" : "Ausgeschlossen"): Candidate => ({
    ...base,
    status,
    reason,
    reviewStatus: review,
  });
  if (observation.injection) {
    return fail("OPEN", "Die Quelle enthält widersprüchliche Anweisungen und braucht eine menschliche Prüfung.");
  }
  const local = observation.email.split("@")[0] ?? "";
  if (!observation.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(observation.email)) {
    return fail("OPEN", "Keine belegte E-Mail-Adresse.");
  }
  if (GENERIC_LOCAL.test(local)) return fail("EXCLUDED", "Allgemeine Postfachadresse, keine persönliche Geschäftsadresse.");
  if (TEAM_LOCAL.test(local) && !config.allowTeamMailbox) {
    return fail("EXCLUDED", "marketing@ und kommunikation@ nur für ausdrücklich konfigurierte andere Zielgruppen.");
  }
  if (isFreeMailDomain(emailDomain(observation.email))) {
    return fail("OPEN", "Freemail-Adresse. Persönliche Geschäftsadresse ist nicht belegt.");
  }
  if (!observation.organisation || !observation.firstName || !observation.lastName) {
    return fail("OPEN", "Firma oder Name ist nicht belegt. Keine Anrede erfunden.");
  }
  if (!ROLE.test(observation.role)) return fail("OPEN", "Rolle Geschäftsführung oder Inhaberschaft ist nicht belegt.");
  if (!observation.text.toLowerCase().includes(observation.email) || !observation.text.includes(observation.organisation)) {
    return fail("OPEN", "E-Mail oder Firma steht nicht im belegten Quellentext.");
  }
  if (observation.website && !sameOrganisationHost(observation.email, observation.website)) {
    return fail("OPEN", "E-Mail-Domain und Website passen nicht zusammen.");
  }
  if (distance.status === "UNKNOWN") return fail("OPEN", "Entfernung ist nicht belegt und bleibt offen.");
  if (distance.status === "OUTSIDE") {
    return fail("EXCLUDED", `Ausserhalb des Umkreises von ${config.radiusKm} km (${distance.km} km).`);
  }
  if (observation.employees !== null && observation.employees > 250) {
    return fail("EXCLUDED", "Deutlich grösser als die Zielgruppe kleine KMU.");
  }
  if (!config.industries.some((industry) => observation.text.includes(industry) || observation.industry === industry)) {
    return fail("OPEN", "Branchen- oder Leistungsbezug ist nicht belegt.");
  }
  if (!officialHooks(observation.hooks, observation.email, observation.website || `https://${emailDomain(observation.email)}/`)) {
    return fail("OPEN", "Weniger als zwei konkrete Anknüpfungspunkte auf der offiziellen Website.");
  }
  const hit = matchCandidate(
    {
      email: observation.email,
      organisation: observation.organisation,
      person: `${observation.firstName} ${observation.lastName}`,
    },
    corpus,
  );
  if (hit.kind === "duplicate") return fail("DUPLICATE", hit.reason);
  if (hit.kind === "excluded") return fail("EXCLUDED", hit.reason);
  if (hit.kind === "review") return fail("OPEN", hit.reason);
  const draft = buildDraft({
    organisation: observation.organisation,
    place: base.place,
    firstName: observation.firstName,
    lastName: observation.lastName,
    industry: observation.industry,
    hooks: observation.hooks.map((hook) => hook.excerpt),
    priceChf: config.priceChf,
    promoUntil: config.promoUntil,
    dayKey,
  });
  if (!draft.complete || !draftIsSpecific(draft.opening, observation.organisation, observation.hooks.map((hook) => hook.excerpt))) {
    return { ...base, ...draft, draftComplete: false, status: "OPEN", reason: "Entwurf ist nicht firmenspezifisch genug." };
  }
  const preferred = observation.employees !== null &&
    observation.employees >= config.employeeMin &&
    observation.employees <= config.employeeMax;
  const hints = [
    "Öffentlich auffindbar ist keine Einwilligung.",
    "Keine Versandfreigabe.",
    `Akquise-Status: Nicht kontaktiert.`,
    `Recherche-ID: ${base.idempotencyKey}`,
    observation.employees === null ? "Mitarbeitendenzahl nicht belegt." : "",
    observation.employees !== null && !preferred ? "Ausserhalb der bevorzugten Betriebsgrösse, trotzdem ein kleiner Betrieb." : "",
    ...observation.hooks.map((hook) => `Beleg: ${hook.excerpt} ${hook.url}`),
  ].filter(Boolean).join("\n");
  return {
    ...base,
    status: "QUALIFIED",
    reason: "Belegte Identität, Firma, Ort, Rolle, E-Mail und zwei Anknüpfungspunkte.",
    subject: draft.subject,
    body: draft.body,
    opening: draft.opening,
    draftComplete: true,
    priority: preferred ? "Hoch" : "Mittel",
    hints,
    reviewStatus: "Automatisch geprüft",
  };
}

export function toSheetRow(candidate: Candidate): string[] {
  const row = [
    `${candidate.firstName} ${candidate.lastName}`.trim(),
    candidate.role,
    candidate.organisation,
    candidate.place,
    candidate.email,
    candidate.status === "QUALIFIED" ? "Belegt" : "Offen",
    candidate.checkedAt.slice(0, 10),
    candidate.priority,
    candidate.hooks.map((hook) => hook.url).join(" | "),
    "Nein",
    "Nicht kontaktiert",
    candidate.subject,
    candidate.body,
    "Lead-Recherche",
    candidate.hints,
  ];
  if (row.length !== SHEET_HEADERS.length) throw new Error("Sheet-Zeile hat nicht 15 Felder.");
  return row.map(spreadsheetLiteral);
}

export function toExportRow(candidate: Candidate): string[] {
  const distance = candidate.distanceStatus === "UNKNOWN"
    ? "offen"
    : candidate.distanceKm === null
      ? candidate.distanceStatus
      : `${candidate.distanceKm} km`;
  return [...toSheetRow(candidate), candidate.status, distance];
}

export function toContactInput(candidate: Candidate) {
  return {
    organisation: candidate.organisation,
    industry: candidate.industry,
    region: candidate.place,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    position: candidate.role,
    email: candidate.email,
    website: candidate.website,
    sourceUrl: candidate.hooks[0]?.url || candidate.sources[0]?.url || "",
    confidence: "UNCONFIRMED" as const,
    hook: candidate.hooks.map((hook) => hook.excerpt).join(" | ").slice(0, 4000),
    service: "Visibility Abo",
    legalCategory: "UNASSESSED" as const,
    newsletterConsent: false as const,
    notes: candidate.hints.slice(0, 4000),
    owner: "",
  };
}
