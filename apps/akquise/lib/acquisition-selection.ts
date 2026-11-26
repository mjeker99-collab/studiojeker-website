import { acquisitionAddressIssue } from "./mail-address";

export type AcquisitionContact = {
  id: string;
  organisation: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  deliveryBlocked?: boolean;
  replyOutcome?: string | null;
  archivedAt?: unknown;
};

export function contactSendBlock(contact: AcquisitionContact) {
  if (contact.deliveryBlocked) return "Bereits kontaktiert oder in Bearbeitung";
  if (contact.archivedAt) return "Archiviert";
  if (contact.replyOutcome) return "Antwort erfasst";
  if (contact.status === "DO_NOT_CONTACT") return "Gesperrt";
  if (contact.status === "SENT" || contact.status === "REPLIED")
    return "Bereits kontaktiert";
  return acquisitionAddressIssue(contact.email);
}

export function visibleAcquisitionContacts(
  contacts: AcquisitionContact[],
  search: string,
) {
  const needle = search.trim().toLowerCase();
  return contacts.filter((contact) =>
    `${contact.organisation} ${contact.firstName} ${contact.lastName} ${contact.email}`
      .toLowerCase()
      .includes(needle),
  );
}

export const acquisitionBatchLimit = 200;
