import { test } from "node:test";
import assert from "node:assert/strict";
import { signatureParts, signedMessage } from "../lib/mail-signature";

test("personal mail closing contains only Beste Grüsse above Nora's portrait", () => {
  const body = "Guten Tag\n\nUnser Angebot.\n\nFreundliche Grüsse\nMartin Jeker\nStudiojeker | Visibility Partner\nwww.studiojeker.ch\n\nBei Fragen bitte antworten.";
  assert.deepEqual(signatureParts(body), {
    before: "Guten Tag\n\nUnser Angebot.\n\nBeste Grüsse",
    after: "Bei Fragen bitte antworten.",
  });
  for (const preview of [false, true]) {
    const { html, text } = signedMessage(body, preview);
    assert.ok(!html.includes("Martin Jeker"));
    assert.ok(!html.includes("Freundliche Grüsse"));
    assert.ok(html.indexOf("Beste Grüsse") < html.indexOf('alt="Nora Jeker"'));
    assert.ok(text.includes("Nora Jeker"));
    assert.ok(text.includes("Bei Fragen bitte antworten."));
  }
});

test("known Nora closing is normalized without changing message text", () => {
  assert.deepEqual(signatureParts("Text\n\nBeste Grüsse\nNora Jeker\nStudiojeker GmbH\nstudiojeker.ch"), {
    before: "Text\n\nBeste Grüsse", after: "",
  });
});
