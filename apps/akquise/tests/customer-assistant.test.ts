import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assistantInput,
  fillEmptyKnowledge,
} from "../lib/customer-assistant/input";
import { generateCustomerKnowledge } from "../lib/customer-assistant/provider";
import { emptyKnowledge } from "../lib/customer-knowledge";
const request = {
  requestKey: "b21587cd-78d0-4141-bf05-11ef5db73444",
  name: "Example AG",
  website: "www.example.com",
  knowledge: { ...emptyKnowledge },
  mode: "RESEARCH" as const,
};
const source = "https://www.example.com/about";
const proposed = {
  knowledge: { ...emptyKnowledge, company: "Example AG produziert Maschinen." },
  citations: [{ field: "company", url: source }],
  questions: ["Welche Tonalität ist gewünscht?"],
};
function response(value = proposed, status = "completed", searched = true) {
  return new Response(
    JSON.stringify({
      status,
      output: [
        ...(searched
          ? [
              {
                type: "web_search_call",
                status: "completed",
                action: { sources: [{ type: "url", url: source }] },
              },
            ]
          : []),
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
  );
}
test("validates minimum context and does not transmit contact fields", () => {
  assert.equal(
    assistantInput.parse(request).website,
    "https://www.example.com",
  );
  for (const website of [
    "",
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/?secret=x",
  ])
    assert.equal(
      assistantInput.safeParse({ ...request, website }).success,
      false,
    );
  assert.equal(
    assistantInput.safeParse({
      ...request,
      contactEmail: "private@example.com",
    }).success,
    false,
  );
  assert.equal(
    assistantInput.safeParse({ ...request, mode: "WRITE", website: "" })
      .success,
    false,
  );
  assert.equal(
    assistantInput.safeParse({
      ...request,
      mode: "WRITE",
      website: "",
      knowledge: { ...emptyKnowledge, company: "Bestätigte Angaben" },
    }).success,
    true,
  );
});
test("bulk application preserves existing text, including edits made during research", () => {
  const current = { ...emptyKnowledge, company: "Meine eigene Beschreibung" };
  const filled = fillEmptyKnowledge(current, {
    ...emptyKnowledge,
    company: "Ersetzen",
    offers: "Leistungen",
  });
  assert.equal(filled.company, current.company);
  assert.equal(filled.offers, "Leistungen");
  assert.deepEqual(current, {
    ...emptyKnowledge,
    company: "Meine eigene Beschreibung",
  });
});
test("real search is required and returned sources survive field adoption", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.store, false);
      assert.equal(payload.tool_choice, "required");
      assert.deepEqual(payload.include, ["web_search_call.action.sources"]);
      assert.equal(payload.tools[0].type, "web_search");
      assert.equal(payload.text.format.strict, true);
      assert.equal(payload.text.format.schema.required.length, 3);
      return response();
    },
  );
  const result = await generateCustomerKnowledge(
    assistantInput.parse(request),
    "gpt-4.1-mini",
  );
  assert.match(result.result.knowledge.company, /Quellen: https:/);
  assert.equal(result.result.sources[0].url, source);
});
test("rejects invented citations, absent search, oversized fields and incomplete responses", async (t) => {
  const responses = [
    response({
      ...proposed,
      citations: [{ field: "company", url: "https://invented.example" }],
    }),
    response(proposed, "completed", false),
    response({
      ...proposed,
      knowledge: { ...proposed.knowledge, company: "x".repeat(2001) },
    }),
    response(proposed, "incomplete"),
  ];
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return responses.shift()!;
  });
  for (let i = 0; i < 4; i++)
    await assert.rejects(
      generateCustomerKnowledge(assistantInput.parse(request), "test"),
      /nachvollziehbaren/,
    );
  assert.equal(calls, 4);
});
test("writing mode uses provided knowledge without claiming research", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.tools, undefined);
      return response({ ...proposed, citations: [] }, "completed", false);
    },
  );
  const result = await generateCustomerKnowledge(
    assistantInput.parse({
      ...request,
      mode: "WRITE",
      website: "",
      knowledge: proposed.knowledge,
    }),
    "test",
  );
  assert.equal(result.result.mode, "WRITE");
  assert.deepEqual(result.result.sources, []);
});
test("provider failures make no automatic paid retry", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("timeout");
  });
  await assert.rejects(
    generateCustomerKnowledge(assistantInput.parse(request), "test"),
    /Keine automatische Wiederholung|keine automatische Wiederholung/,
  );
  assert.equal(calls, 1);
});
