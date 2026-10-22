import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  blankWebsite,
  blankSection,
  blankPage,
  validatedDocument,
} from "../lib/websites/input";
import { websiteHtml, websiteZip } from "../lib/websites/render";
import { generateWebsite } from "../lib/websites/provider";
const sample = () => ({
  ...structuredClone(blankWebsite),
  name: "A <script>alert(1)</script>",
  pages: [
    {
      ...blankPage,
      headline: '<img src=x onerror="alert(1)">',
      sections: [
        {
          ...blankSection,
          body: "Text </p><script>evil()</script>",
          imageUrl: "https://example.test/photo.jpg",
          imageAlt: '" onerror="evil()',
          ctaLabel: "Kontakt",
          ctaUrl: "kontakt.html",
        },
      ],
    },
    { ...blankPage, slug: "kontakt", title: "Kontakt" },
  ],
});
test("Renderer escapes text, rejects active content/paths and exports navigable pages", async () => {
  const doc = sample(),
    html = websiteHtml(doc);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("default-src"));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,<script>",
    "//evil.test",
    "/api/logout",
    "../escape.html",
  ]) {
    const d = sample();
    d.pages[0].sections[0].ctaUrl = bad;
    assert.equal(validatedDocument.safeParse(d).success, false, bad);
  }
  for (const slug of ["../x", "index.html", "a/b", "<script>"]) {
    const d = sample();
    d.pages[1].slug = slug;
    assert.equal(validatedDocument.safeParse(d).success, false);
  }
  const zip = await JSZip.loadAsync(await websiteZip(doc));
  assert.deepEqual(Object.keys(zip.files).sort(), [
    "README.txt",
    "index.html",
    "kontakt.html",
    "studioone.json",
  ]);
  assert.ok(
    (await zip.file("index.html")!.async("string")).includes(
      'href="kontakt.html"',
    ),
  );
  assert.deepEqual(
    JSON.parse(await zip.file("studioone.json")!.async("string")),
    doc,
  );
});
test("Validation catches duplicate/missing homepage, invalid links, missing alt text and excessive documents", () => {
  const duplicate = sample();
  duplicate.pages[1].slug = "index";
  assert.equal(validatedDocument.safeParse(duplicate).success, false);
  assert.equal(
    validatedDocument.safeParse({
      ...sample(),
      pages: [{ ...blankPage, slug: "other" }],
    }).success,
    false,
  );
  const missing = sample();
  missing.pages[0].sections[0].imageAlt = "";
  assert.equal(validatedDocument.safeParse(missing).success, false);
  const broken = sample();
  broken.pages[0].sections[0].ctaUrl = "missing.html";
  assert.equal(validatedDocument.safeParse(broken).success, false);
  assert.equal(
    validatedDocument.safeParse({
      ...blankWebsite,
      pages: Array(11).fill(blankPage),
    }).success,
    false,
  );
});
test("Provider sends structured document/history and refuses incomplete or invalid replies", async () => {
  const original = globalThis.fetch;
  let responseStatus = "completed",
    result: unknown = { reply: "Entwurf", document: blankWebsite };
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    const input = JSON.parse(body.input);
    assert.equal(input.document.name, blankWebsite.name);
    assert.equal(input.history[0].reply, "Vorheriger Vorschlag");
    return new Response(
      JSON.stringify({
        status: responseStatus,
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(result) }] },
        ],
      }),
    );
  };
  const context = {
    document: blankWebsite,
    customer: { name: "Test" },
    message: "Erstelle",
    history: [{ message: "Hallo", reply: "Vorheriger Vorschlag" }],
  };
  try {
    assert.equal(
      (await generateWebsite(context, "test-model")).result.document?.name,
      blankWebsite.name,
    );
    responseStatus = "incomplete";
    await assert.rejects(generateWebsite(context, "test-model"));
    responseStatus = "completed";
    result = {
      reply: "Unsicher",
      document: { ...blankWebsite, pages: [{ ...blankPage, slug: "../../x" }] },
    };
    await assert.rejects(generateWebsite(context, "test-model"));
    result = { reply: "Was ist das Ziel?", document: null };
    assert.equal(
      (await generateWebsite(context, "test-model")).result.document,
      null,
    );
  } finally {
    globalThis.fetch = original;
  }
});
