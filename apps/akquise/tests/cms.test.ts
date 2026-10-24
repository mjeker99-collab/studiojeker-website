import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cmsTemplates,
  cmsImportInput,
  newsletterFromSanity,
} from "../lib/cms/input";
import {
  newsletterDefaults,
  renderNewsletter,
} from "../lib/hub/newsletter-template";
import { querySanity } from "../lib/cms/service";
function document() {
  const t = cmsTemplates[0];
  return {
    _id: "synthetic",
    _rev: "rev1",
    _type: t.type,
    title: "Synthetisch",
    subject: "Test",
    preheader: "Test",
    audience: "Interner Test",
    ...Object.fromEntries(t.fields.map((f) => [f.name, f.value])),
  };
}
test("Sanity templates preserve existing layouts and field defaults", () => {
  const contract = new Map<string, string>();
  for (const t of cmsTemplates) {
    for (const f of t.fields) {
      if (contract.has(f.name)) assert.equal(contract.get(f.name), f.kind);
      contract.set(f.name, f.kind);
    }
    const value = newsletterFromSanity(
      {
        ...document(),
        _type: t.type,
        ...Object.fromEntries(t.fields.map((f) => [f.name, f.value])),
      },
      "actor",
    );
    assert.deepEqual(value.newsletter, newsletterDefaults(t.id));
    assert.ok(
      renderNewsletter({
        subject: value.subject,
        preheader: value.preheader,
        newsletter: value.newsletter!,
      }).includes("*|UNSUB|*"),
    );
  }
});
test("reject drafts, unknown layouts, missing fields and dangerous URLs", () => {
  for (const id of ["drafts.example", "versions.release.example", "../secret"])
    assert.equal(
      cmsImportInput.safeParse({ id, revision: "1" }).success,
      false,
    );
  assert.throws(() =>
    newsletterFromSanity({ ...document(), _type: "homepage" }, "actor"),
  );
  const field = cmsTemplates[0].fields.find((f) => f.kind === "image")!.name;
  for (const value of [
    undefined,
    "javascript:alert(1)",
    "https://user:secret@example.test/a",
  ])
    assert.throws(() =>
      newsletterFromSanity({ ...document(), [field]: value }, "actor"),
    );
  assert.throws(() =>
    newsletterFromSanity({ ...document(), audience: "" }, "actor"),
  );
});
test("query fixes project and published perspective, hides provider errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "tgx6e6jg.api.sanity.io");
      assert.equal(url.searchParams.get("perspective"), "published");
      assert.equal(url.searchParams.get("$id"), JSON.stringify('id"quote'));
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      return Response.json({ result: [] });
    };
    assert.deepEqual(await querySanity("*[_id==$id]", { id: 'id"quote' }), []);
    globalThis.fetch = async () =>
      new Response("private-provider-details", { status: 401 });
    await assert.rejects(
      querySanity("*[]"),
      (e) =>
        e instanceof Error && !e.message.includes("private-provider-details"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
