import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  contactFilterOptions,
  matchesContactFilters,
} from "../lib/contact-filters";
import { mailAssistantInput } from "../lib/mail-assistant/input";
import { parseMailAssistantResponse } from "../lib/mail-assistant/provider";
test("Master filters combine company and industry, including missing industry", () => {
  const contacts = [
    { organisation: "A", industry: "Bau" },
    { organisation: "B", industry: "Bau" },
    { organisation: "A", industry: "" },
  ];
  assert.equal(
    contacts.filter((c) =>
      matchesContactFilters(c, { company: "A", industry: "Bau" }),
    ).length,
    1,
  );
  assert.equal(
    contacts.filter((c) =>
      matchesContactFilters(c, { company: "", industry: "__empty__" }),
    ).length,
    1,
  );
  assert.deepEqual(contactFilterOptions(contacts), {
    companies: ["A", "B"],
    industries: ["Bau"],
  });
});
const lead = {
  organisation: "Atelier AG",
  firstName: "Anna",
  lastName: "Test",
  email: "",
  industry: "Architektur",
  region: "Bern",
  position: "Architektin",
  website: "https://example.com",
  sourceUrl: "https://example.com/team",
  hook: "Das Büro plant Wohnbauten.",
  service: "Architekturvisualisierungen",
};
const result = { leads: [lead], mails: [], note: "E-Mail nicht belegt." };
const response = (value: unknown, source = true) => ({
  status: "completed",
  output: [
    ...(source
      ? [
          {
            type: "web_search_call",
            status: "completed",
            action: { sources: [{ url: lead.sourceUrl }] },
          },
        ]
      : []),
    { content: [{ type: "output_text", text: JSON.stringify(value) }] },
  ],
});
test("Lead research requires real source references, permits explicitly missing email, rejects unsafe source", () => {
  const input = mailAssistantInput.parse({
    requestKey: randomUUID(),
    mode: "RESEARCH",
    briefing: "Architekten in Bern",
  });
  assert.deepEqual(parseMailAssistantResponse(response(result), input), result);
  assert.throws(() =>
    parseMailAssistantResponse(response(result, false), input),
  );
  assert.throws(() =>
    parseMailAssistantResponse(
      response({
        ...result,
        leads: [{ ...lead, sourceUrl: "https://invented.example" }],
      }),
      input,
    ),
  );
  assert.throws(() =>
    parseMailAssistantResponse(
      response({
        ...result,
        leads: [{ ...lead, website: "javascript:alert(1)" }],
      }),
      input,
    ),
  );
});
test("Personalized texts must match the entire selected version-bound batch", () => {
  const input = mailAssistantInput.parse({
    requestKey: randomUUID(),
    mode: "WRITE",
    briefing: "Unser Filmangebot vorstellen",
    items: [
      { id: "d1", version: 2 },
      { id: "d2", version: 1 },
    ],
  });
  const mails = input.items.map((i) => ({
    ...i,
    subject: "Persönlicher Vorschlag",
    body: "Guten Tag",
  }));
  assert.equal(
    parseMailAssistantResponse(
      response({ leads: [], mails, note: "" }, false),
      input,
    ).mails.length,
    2,
  );
  assert.throws(() =>
    parseMailAssistantResponse(
      response({ leads: [], mails: [mails[0]], note: "" }),
      input,
    ),
  );
  assert.throws(() =>
    parseMailAssistantResponse(
      response({ leads: [], mails: [mails[0], mails[0]], note: "" }),
      input,
    ),
  );
  assert.throws(() =>
    parseMailAssistantResponse(
      response({
        leads: [],
        mails: [mails[0], { ...mails[1], version: 9 }],
        note: "",
      }),
      input,
    ),
  );
});
