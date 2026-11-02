type Contact = { status: string; replyOutcome?: string };
export const contactStageLabels = {
  NEW: "Neu",
  SENT: "Angeschrieben",
  REPLIED: "Geantwortet",
  DO_NOT_CONTACT: "Nicht mehr kontaktieren",
};
export function contactStage(
  contact: Contact,
): keyof typeof contactStageLabels {
  if (contact.status === "DO_NOT_CONTACT") return "DO_NOT_CONTACT";
  if (contact.replyOutcome || contact.status === "REPLIED") return "REPLIED";
  if (contact.status === "SENT") return "SENT";
  return "NEW";
}
