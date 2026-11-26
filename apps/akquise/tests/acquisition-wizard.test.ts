import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactSendBlock,
  visibleAcquisitionContacts,
} from "../lib/acquisition-selection";

test("1, 97 und 183 Suchergebnisse bleiben wählbar, bereits Kontaktierte sind markiert", () => {
  for (const count of [1, 97, 183]) {
    const contacts = Array.from({ length: count + 1 }, (_, index) => ({
      id: `c${index}`,
      organisation: `Firma ${index}`,
      firstName: "Anna",
      lastName: String(index),
      email: `anna${index}@example.test`,
      status: index === count ? "SENT" : "NEW",
    }));
    const visible = visibleAcquisitionContacts(contacts, "firma");
    const eligible = visible.filter((contact) => !contactSendBlock(contact));
    assert.equal(visible.length, count + 1);
    assert.equal(eligible.length, count);
    assert.equal(contactSendBlock(contacts[count]), "Bereits kontaktiert");
  }
});

test("Versandprotokoll sperrt auch einen veralteten Kontaktstatus", () => {
  assert.ok(
    contactSendBlock({
      id: "c",
      organisation: "Firma",
      firstName: "Anna",
      lastName: "Test",
      email: "anna@example.test",
      status: "DRAFT",
      deliveryBlocked: true,
    }),
  );
});
