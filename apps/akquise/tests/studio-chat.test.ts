import { test } from "node:test";
import assert from "node:assert/strict";
import { openAIProvider, ProviderFailure } from "../lib/studio/provider";

test("Chat attaches selected image bytes only to the current user turn", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.input[0].content, "Vorher");
      assert.equal(body.input[1].content, "Antwort");
      assert.deepEqual(body.input[2].content, [
        { type: "input_text", text: "Analysiere" },
        {
          type: "input_image",
          detail: "auto",
          image_url: "data:image/png;base64,YWJj",
        },
      ]);
      assert.equal(body.store, false);
      return new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: "Bildbeschreibung" }] },
          ],
        }),
      );
    };
    await openAIProvider.chat!(
      {},
      [
        { role: "user", content: "Vorher" },
        { role: "assistant", content: "Antwort" },
        { role: "user", content: "Analysiere" },
      ],
      "model",
      [{ bytes: Buffer.from("abc"), mime: "image/png" }],
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("Chat sends server context and ordered messages without tools or provider storage", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.match(body.instructions, /KEINE ausführenden Werkzeuge/);
      assert.match(body.instructions, /Kampagne A/);
      assert.deepEqual(
        body.input.map((m: { role: string }) => m.role),
        ["user", "assistant", "user"],
      );
      return new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: "Neue Headline" }] },
          ],
          usage: { output_tokens: 3 },
        }),
        { headers: { "x-request-id": "test-request" } },
      );
    };
    const r = await openAIProvider.chat!(
      { campaign: "Kampagne A" },
      [
        { role: "user", content: "Eine Headline" },
        { role: "assistant", content: "Erster Vorschlag" },
        { role: "user", content: "Bitte kürzer" },
      ],
      "configured-model",
    );
    assert.equal(r.reply, "Neue Headline");
    assert.equal(r.requestId, "test-request");
  } finally {
    globalThis.fetch = original;
  }
});
test("Chat rejects empty output and never retries an uncertain provider failure", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ output: [] }));
    await assert.rejects(
      openAIProvider.chat!({}, [{ role: "user", content: "Test" }], "model"),
      ProviderFailure,
    );
    globalThis.fetch = async () => {
      calls++;
      throw new Error("timeout");
    };
    await assert.rejects(
      openAIProvider.chat!({}, [{ role: "user", content: "Test" }], "model"),
      (e: unknown) => e instanceof ProviderFailure && e.uncertain,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
