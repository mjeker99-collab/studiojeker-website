import { z } from "zod";

export const knowledgeFields = [
  ["company", "Unternehmen & Markt"],
  ["offers", "Angebote & Leistungen"],
  ["audiences", "Zielgruppen & Bedürfnisse"],
  ["positioning", "Positionierung & belegbare Stärken"],
  ["voice", "Tonalität & Sprache"],
  ["visualRules", "Logo, Farben, Schriften & Bildsprache"],
  ["facts", "Belegte Aussagen & Quellen"],
  ["constraints", "Vorgaben & ausgeschlossene Aussagen"],
] as const;
const field = z.string().trim().max(2000).default("");
export const customerKnowledgeSchema = z
  .object({
    company: field,
    offers: field,
    audiences: field,
    positioning: field,
    voice: field,
    visualRules: field,
    facts: field,
    constraints: field,
  })
  .strict();
export type CustomerKnowledge = z.infer<typeof customerKnowledgeSchema>;
export const emptyKnowledge: CustomerKnowledge = customerKnowledgeSchema.parse(
  {},
);

// A job captures this revision. Later profile edits must not rewrite past jobs.
export function customerKnowledgeContext(customer: {
  name: string;
  website: string;
  notes: string;
  revision: number;
  knowledge: unknown;
}) {
  return {
    name: customer.name,
    website: customer.website,
    notes: customer.notes,
    revision: customer.revision,
    knowledge: customerKnowledgeSchema.parse(customer.knowledge),
  };
}
