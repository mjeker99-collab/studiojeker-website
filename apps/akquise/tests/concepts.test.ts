import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { conceptInput, emptyConcept, chapters } from "../lib/concepts/input";
import { conceptDocx, conceptHtml } from "../lib/concepts/export";
import { openAIProvider } from "../lib/studio/provider";
import {
  customerKnowledgeSchema,
  customerKnowledgeContext,
} from "../lib/customer-knowledge";

test("Company knowledge is bounded, backwards compatible and snapshots only selected fields", () => {
  const knowledge = customerKnowledgeSchema.parse({ offers: "Umbauten" });
  assert.equal(knowledge.voice, "");
  assert.throws(() =>
    customerKnowledgeSchema.parse({ offers: "x".repeat(2001) }),
  );
  assert.throws(() => customerKnowledgeSchema.parse({ approved: true }));
  const customer = {
    name: "Test AG",
    website: "",
    notes: "",
    revision: 4,
    knowledge,
  };
  const snapshot = customerKnowledgeContext(customer);
  customer.knowledge.offers = "Verändert";
  customer.revision = 5;
  assert.equal(snapshot.knowledge.offers, "Umbauten");
  assert.equal(snapshot.revision, 4);
});

test("Concept input is bounded and strict; unknown fields cannot grant approval", () => {
  assert.throws(() =>
    conceptInput.parse({ ...emptyConcept, title: "Titel", approvedBy: "fake" }),
  );
  assert.throws(() =>
    conceptInput.parse({
      ...emptyConcept,
      title: "Titel",
      briefing: "x".repeat(4001),
    }),
  );
});
test("Word package and print output preserve all chapters and escape untrusted content", async () => {
  const data = {
    ...emptyConcept,
    title: '<script>alert("x")</script>',
    ...Object.fromEntries(chapters.map(([key]) => [key, `${key}\nA & B < C`])),
  };
  const meta = {
    version: 2,
    status: "Entwurf",
    customer: "Testkunde",
    author: "",
  };
  const html = conceptHtml(data, meta);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /A &amp; B &lt; C/);
  const docx = await JSZip.loadAsync(await conceptDocx(data, meta));
  assert.ok(docx.file("[Content_Types].xml"));
  const document = await docx.file("word/document.xml")!.async("string");
  for (const [key, title] of chapters) {
    assert.ok(document.includes(key));
    assert.ok(html.includes(title.replaceAll("&", "&amp;")));
  }
  assert.match(document, /Version 2/);
  assert.ok(!document.includes("<script>"));
});
test("Strategy dialog uses strategic instructions and current concept, no research tools", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.match(body.instructions, /strategische Gesprächspartner/);
      assert.match(body.instructions, /keinen Webzugriff/);
      assert.match(body.instructions, /Vorrang vor älteren/);
      assert.match(body.instructions, /Kundenkontext/);
      assert.match(body.instructions, /Architekturbüro/);
      assert.match(body.instructions, /Inhouse-Agentur/);
      assert.match(body.instructions, /Leere Profilfelder bedeuten unbekannt/);
      assert.equal(body.tools, undefined);
      assert.equal(body.store, false);
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { type: "output_text", text: "Welche Ziele habt ihr?" },
              ],
            },
          ],
        }),
      );
    };
    const result = await openAIProvider.chat!(
      {
        strategy: { mode: "STRATEGY", document: { title: "Architekturbüro" } },
      },
      [{ role: "user", content: "Beginnen wir" }],
      "test-model",
    );
    assert.equal(result.reply, "Welche Ziele habt ihr?");
  } finally {
    globalThis.fetch = original;
  }
});
