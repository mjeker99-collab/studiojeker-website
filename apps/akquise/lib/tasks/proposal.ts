import { getNewsletterTemplate } from "../hub/newsletter-template";
import type { TextSlot } from "./types";

export function editableTextSlots(
  templateId: string,
  fields: Record<string, string>,
): TextSlot[] {
  const template = getNewsletterTemplate(templateId);
  return template.slots
    .filter((slot) => slot.kind === "text" && !slot.special)
    .map((slot) => ({ key: slot.key, text: fields[slot.key] ?? "" }));
}

/**
 * Keep only real text slots. Image, link, alt and branding slots are ignored
 * even if a model names them.
 */
export function acceptTextProposal(
  allowed: TextSlot[],
  proposed: TextSlot[],
): TextSlot[] {
  const current = new Map(allowed.map((slot) => [slot.key, slot.text]));
  const accepted: TextSlot[] = [];
  const seen = new Set<string>();
  for (const slot of proposed) {
    if (seen.has(slot.key) || !current.has(slot.key)) continue;
    const text = slot.text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
    if (!text || text.length > 8000 || /[<>]/.test(text)) continue;
    if (text === current.get(slot.key)) continue;
    seen.add(slot.key);
    accepted.push({ key: slot.key, text });
  }
  return accepted;
}

export function mergeTextSlots(
  fields: Record<string, string>,
  changes: TextSlot[],
) {
  const next = { ...fields };
  for (const change of changes) next[change.key] = change.text;
  return next;
}
