import {
  hasPersonName,
  isInfoAddress,
  isTeamMailbox,
  normalizeEmail,
  personKey,
} from "../contact-identity";
export { hasPersonName, isInfoAddress, isTeamMailbox };

export const researchRegions = [
  "Solothurn",
  "Grenchen",
  "Biel",
  "Bern",
  "Burgdorf",
  "Langenthal",
  "Aarau",
  "Olten",
  "Bellach",
  "Selzach",
  "Biberist",
  "Gerlafingen",
  "Langnau i.E.",
  "Basel-Landschaft",
  "Basel-Stadt",
];
export const researchPriorities = [
  "Industrie",
  "Dienstleistung",
  "KMU",
  "Architekturbüros",
  "Immobilien",
];
export type KnownLeads = { emails: Set<string>; keys: Set<string> };
export function qualifyResearchLead(
  lead: {
    organisation: string;
    firstName: string;
    lastName: string;
    email: string;
  },
  existing: KnownLeads,
) {
  const email = normalizeEmail(lead.email || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false as const, reason: "Keine belegte E-Mail-Adresse." };
  if (isInfoAddress(email))
    return {
      ok: false as const,
      reason: "info@-Adressen werden nicht als neue Leads übernommen.",
    };
  const key = personKey(lead.firstName, lead.lastName, lead.organisation);
  if (existing.emails.has(email) || existing.keys.has(key))
    return { ok: false as const, reason: "Bereits in der Masterliste." };
  return { ok: true as const, email, teamMailbox: isTeamMailbox(email) };
}
export const blockedAiMessage =
  "BLOCKIERT: GPT ist nicht verbunden. Eine Administratorin setzt CONTENT_AI_ENABLED und OPENAI_API_KEY in den Servereinstellungen. Es wurde nichts recherchiert und nichts versendet.";
export const blockedWebMessage =
  "BLOCKIERT: Die Websuche hat keine belegten Quellen geliefert. Eine Administratorin prüft den OpenAI-Webzugang. Es wurde nichts übernommen.";
export function researchProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/Missing research sources|Incomplete response/.test(message))
    return blockedWebMessage;
  return "Keine vollständigen, nachvollziehbaren Vorschläge erhalten. Es wurde nichts übernommen.";
}
