import { test } from "node:test";
import assert from "node:assert/strict";
import { openAIProvider, ProviderFailure } from "../lib/studio/provider";

test("Direct photo edit sends original bytes and instruction, retains aspect choice and never falls back to text", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/images/edits");
    const form = init.body as FormData;
    assert.equal(form.get("model"), "gpt-image-1.5");
    assert.equal(form.get("size"), "auto");
    assert.equal(form.get("input_fidelity"), "high");
    assert.match(String(form.get("prompt")), /Schatten aufhellen/);
    assert.doesNotMatch(String(form.get("prompt")), /KEINE Schrift/);
    const file = form.getAll("image[]")[0] as File;
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.name, "reference-0.jpg");
    assert.equal(await file.text(), "original bytes");
    return new Response(
      JSON.stringify({
        data: [{ b64_json: Buffer.from("edited").toString("base64") }],
      }),
    );
  });
  const result = await openAIProvider.image(
    "Schatten aufhellen",
    "gpt-image-1.5",
    [{ bytes: Buffer.from("original bytes"), mime: "image/jpeg" }],
    { edit: true },
  );
  assert.equal(result.bytes.toString(), "edited");
  await assert.rejects(
    openAIProvider.image("Edit", "gpt-image-1.5", [], { edit: true }),
    /genau ein/,
  );
  assert.equal(calls, 1);
});

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
      assert.match(body.instructions, /keine ausführenden Medienwerkzeuge/);
      assert.match(body.instructions, /höchstens eine konkrete Rückfrage/);
      assert.match(body.instructions, /datierte Referenzen/);
      assert.match(body.instructions, /Vorschlag am Bild ausführen/);
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
