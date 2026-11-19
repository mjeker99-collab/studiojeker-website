import { test } from "node:test";
import assert from "node:assert/strict";
import type { ContentInput } from "../lib/hub/input";
import { getNewsletterTemplate, newsletterDefaults } from "../lib/hub/newsletter-template";
import { verifyNewsletterImageChanges } from "../lib/hub/newsletter-image-check";

const original = { newsletter: newsletterDefaults("newsletter-02") } as ContentInput;
const key = getNewsletterTemplate(original.newsletter!.templateId).slots.find(
  (slot) => !slot.special && slot.kind === "image",
)!.key;

function edited(url: string): ContentInput {
  return {
    ...original,
    newsletter: {
      ...original.newsletter!,
      fields: { ...original.newsletter!.fields, [key]: url },
    },
  };
}

const url = "https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/1234567890abcdef/mailchimp/does-not-exist.jpg";

test("no external check for a text-only newsletter patch", async () => {
  await verifyNewsletterImageChanges(original, original, (async () => {
    throw new Error("Should never fetch unchanged images");
  }) as typeof fetch);
});

test("GPT image change is rejected if the asset is missing", async () => {
  let count = 0;
  await assert.rejects(
    () => verifyNewsletterImageChanges(original, edited(url), (async () => {
      count++;
      return new Response(null, { status: 404 });
    }) as typeof fetch),
    /Bild konnte nicht nachgewiesen/,
  );
  assert.equal(count, 1);
});

test("image host allowlist blocks arbitrary URLs without making a request", async () => {
  await assert.rejects(
    () => verifyNewsletterImageChanges(
      original,
      edited("https://localhost/private-image.jpg"),
      (async () => { throw new Error("Should never call private host"); }) as typeof fetch,
    ),
    /Bild konnte nicht nachgewiesen/,
  );
});

test("HTTP 200 needs an actual image content type", async () => {
  await assert.rejects(
    () => verifyNewsletterImageChanges(original, edited(url), (async () =>
      new Response("not an image", { status: 200, headers: { "content-type": "text/html" } })
    ) as typeof fetch),
    /Bild konnte nicht nachgewiesen/,
  );
  await assert.doesNotReject(() =>
    verifyNewsletterImageChanges(original, edited(url), (async () =>
      new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } })
    ) as typeof fetch),
  );
});
