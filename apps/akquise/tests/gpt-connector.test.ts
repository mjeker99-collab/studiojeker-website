import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeEditorialPayload,
  searchableText,
  redactEmails,
} from "../lib/gpt-connector/sanitize";
import { gptConnectorOpenApi } from "../lib/gpt-connector/openapi";
import { defaultScopes } from "../lib/gpt-connector/types";

test("sanitize strips secrets, credentials and contact fields", () => {
  const cleaned = sanitizeEditorialPayload({
    title: "Sichtbarkeit im Abo",
    subject: "Ansprache an max@example.com",
    body: "Text mit nora@studiojeker.ch",
    apiKey: "sk-secret",
    password: "hunter2",
    recipient: "leak@example.com",
    contactEmail: "leak@example.com",
    encryptedToken: "abc",
    smtpPassword: "x",
    variants: [
      {
        channel: "LINKEDIN",
        text: "Claim für Sichtbarkeit",
        token: "should-go",
      },
    ],
    newsletter: {
      templateId: "newsletter-03",
      fields: {
        "hero_headline.text.1": "Sichtbarkeit im Abo",
        "promo.text.1":
          "Angebot gültig bis 30. November 2026, kontakt@example.com",
      },
    },
  }) as Record<string, unknown>;

  assert.equal(cleaned.title, "Sichtbarkeit im Abo");
  assert.equal(cleaned.subject, "Ansprache an [redacted-email]");
  assert.equal(cleaned.body, "Text mit [redacted-email]");
  assert.equal(cleaned.apiKey, undefined);
  assert.equal(cleaned.password, undefined);
  assert.equal(cleaned.recipient, undefined);
  assert.equal(cleaned.contactEmail, undefined);
  assert.equal(cleaned.encryptedToken, undefined);
  assert.equal(cleaned.smtpPassword, undefined);
  const variants = cleaned.variants as Array<Record<string, unknown>>;
  assert.equal(variants[0].text, "Claim für Sichtbarkeit");
  assert.equal(variants[0].token, undefined);
  const newsletter = cleaned.newsletter as {
    fields: Record<string, string>;
  };
  assert.match(newsletter.fields["promo.text.1"], /30\. November 2026/);
  assert.match(newsletter.fields["promo.text.1"], /\[redacted-email\]/);
});

test("searchableText concatenates nested editorial fields", () => {
  const text = searchableText({
    title: "Abo",
    newsletter: { fields: { a: "Paket Basic", b: "Promotion" } },
  });
  assert.match(text, /Paket Basic/);
  assert.match(text, /Promotion/);
  assert.equal(redactEmails("a@b.ch und c@d.ch"), "[redacted-email] und [redacted-email]");
});

test("OpenAPI describes only GET connector paths with bearer auth", () => {
  process.env.APP_URL = "http://localhost:3100";
  const spec = gptConnectorOpenApi();
  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.paths["/api/integrations/gpt/campaigns"].get);
  assert.ok(spec.paths["/api/integrations/gpt/projects"].get);
  assert.ok(spec.paths["/api/integrations/gpt/content/search"].get);
  assert.equal(
    (spec.paths["/api/integrations/gpt/campaigns"] as { post?: unknown }).post,
    undefined,
  );
  assert.ok(spec.components.securitySchemes.connectorBearer);
  assert.deepEqual(defaultScopes(), {
    projects: true,
    campaigns: true,
    concepts: true,
    content: true,
  });
});
