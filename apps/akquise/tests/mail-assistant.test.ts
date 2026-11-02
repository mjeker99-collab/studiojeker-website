import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  contactFilterOptions,
  matchesContactFilters,
} from "../lib/contact-filters";
import { z } from "zod";
import {
  mailAssistantInput,
  mailAssistantResult,
} from "../lib/mail-assistant/input";
import { parseMailAssistantResponse } from "../lib/mail-assistant/provider";
import {
  blockedWebMessage,
  qualifyResearchLead,
  researchProviderError,
} from "../lib/mail-assistant/qualify";
import {
  isPermanentPreparationBlock,
  summarizeDeferred,
} from "../lib/mail-batch-status";
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

test("Research keeps found mailboxes, rejects info@ and empty addresses, marks team mailboxes", () => {
  const existing = {
    emails: new Set(["anna@lead.example"]),
    keys: new Set<string>(),
  };
  assert.equal(
    qualifyResearchLead(
      {
        ...lead,
        email: "anna.neu@example.test",
      },
      existing,
    ).ok,
    true,
  );
  const missing = qualifyResearchLead({ ...lead, email: "" }, existing);
  assert.equal(missing.ok, false);
  const info = qualifyResearchLead(
    { ...lead, email: "info@example.test" },
    existing,
  );
  assert.equal(info.ok, false);
  if (!info.ok) assert.match(info.reason, /info@/);
  const team = qualifyResearchLead(
    { ...lead, email: "kommunikation@example.test" },
    existing,
  );
  assert.equal(team.ok && team.teamMailbox, true);
  assert.equal(
    qualifyResearchLead(
      { ...lead, email: "Anna@lead.example" },
      existing,
    ).ok,
    false,
  );
  assert.equal(researchProviderError(new Error("Missing research sources")), blockedWebMessage);
  assert.match(researchProviderError(new Error("other")), /nichts übernommen/);
});
test("Deferred contacts keep the exact reason and a count", () => {
  const summary = summarizeDeferred([
    {
      organisation: "A",
      name: "Anna",
      issues: ["Team-Postfach. Für den persönlichen Versand nicht freigabefähig."],
      changed: false,
    },
    {
      organisation: "B",
      name: "Ben",
      issues: ["Team-Postfach. Für den persönlichen Versand nicht freigabefähig."],
      changed: false,
    },
    {
      organisation: "C",
      name: "Cara",
      issues: [],
      changed: true,
    },
  ]);
  assert.deepEqual(summary.counts[0], [
    "Team-Postfach. Für den persönlichen Versand nicht freigabefähig.",
    2,
  ]);
  assert.match(summary.lines[2], /zuerst bestätigt/);
  assert.equal(
    isPermanentPreparationBlock([
      "Team-Postfach. Für den persönlichen Versand nicht freigabefähig.",
    ]),
    true,
  );
  assert.equal(
    isPermanentPreparationBlock(["Quellen-URL fehlt."]),
    false,
  );
});
test("Provider schema omits unsupported URI format while runtime validates URLs", () => {
  assert.equal(
    JSON.stringify(z.toJSONSchema(mailAssistantResult)).includes(
      '"format":"uri"',
    ),
    false,
  );
  assert.equal(
    mailAssistantResult.safeParse({
      ...result,
      leads: [{ ...lead, sourceUrl: "not a URL" }],
    }).success,
    false,
  );
});
