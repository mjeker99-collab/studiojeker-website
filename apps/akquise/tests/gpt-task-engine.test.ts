import { test } from "node:test";
import assert from "node:assert/strict";
import { newsletterDefaults } from "../lib/hub/newsletter-template";
import { connectionRegistry } from "../lib/tasks/adapters";
import { instructionRoute, mapCursorHandoff, CURSOR_INTEGRATION_GAP } from "../lib/tasks/cursor-bridge";
import { layoutDecision } from "../lib/tasks/layout";
import { nextStepText, statusHeadline } from "../lib/tasks/messages";
import {
  acceptTextProposal,
  editableTextSlots,
  mergeTextSlots,
} from "../lib/tasks/proposal";
import {
  backoffMs,
  idempotencyKey,
  requiresApproval,
} from "../lib/tasks/types";

test("text proposals cannot change images, links or markup", () => {
  const newsletter = newsletterDefaults("newsletter-03");
  const allowed = editableTextSlots(newsletter.templateId, newsletter.fields);
  const image = Object.entries(newsletter.fields).find(([key]) =>
    key.includes("image"),
  );
  assert.ok(allowed.length > 0);
  assert.ok(image);
  const accepted = acceptTextProposal(allowed, [
    { key: image![0], text: "https://evil.example/logo.png" },
    { key: allowed[0].key, text: "<b>nicht erlaubt</b>" },
    { key: allowed[0].key, text: "Kurzer synthetischer Satz." },
    { key: "fehlendes.feld", text: "neu" },
    { key: allowed[1].key, text: allowed[1].text },
  ]);
  assert.deepEqual(accepted, [
    { key: allowed[0].key, text: "Kurzer synthetischer Satz." },
  ]);
  const merged = mergeTextSlots(newsletter.fields, accepted);
  assert.equal(merged[image![0]], newsletter.fields[image![0]]);
  assert.equal(merged[allowed[0].key], "Kurzer synthetischer Satz.");
  assert.equal(merged[allowed[1].key], newsletter.fields[allowed[1].key]);
});

test("approval boundary, backoff and idempotency stay deterministic", () => {
  assert.equal(requiresApproval("NEWSLETTER_REVISE_TEXT"), false);
  assert.equal(requiresApproval("NEWSLETTER_LAYOUT"), false);
  assert.equal(requiresApproval("NEWSLETTER_PUBLISH"), true);
  assert.equal(requiresApproval("NEWSLETTER_SEND"), true);
  assert.equal(backoffMs(1), 1000);
  assert.equal(backoffMs(2), 2000);
  assert.equal(backoffMs(8), 60_000);
  const key = idempotencyKey({
    userId: "user",
    contentId: "content",
    version: 2,
    type: "NEWSLETTER_REVISE_TEXT",
    instruction: "Text redaktionell kürzen",
  });
  assert.equal(
    key,
    idempotencyKey({
      userId: "user",
      contentId: "content",
      version: 2,
      type: "NEWSLETTER_REVISE_TEXT",
      instruction: "Text redaktionell kürzen",
    }),
  );
  assert.notEqual(
    key,
    idempotencyKey({
      userId: "user",
      contentId: "content",
      version: 3,
      type: "NEWSLETTER_REVISE_TEXT",
      instruction: "Text redaktionell kürzen",
    }),
  );
});

test("cursor progress is delegated and never marked succeeded", () => {
  assert.equal(instructionRoute("Text redaktionell kürzen"), "editorial");
  assert.equal(instructionRoute("Mehr Abstand im Hero"), "technical");
  const handed = layoutDecision(
    mapCursorHandoff({ contentId: "content", status: "HANDED_OFF" }),
  );
  assert.equal(handed.kind, "waiting");
  const preview = layoutDecision(
    mapCursorHandoff({
      contentId: "content",
      status: "PREVIEW_READY",
      reviewUrl: "https://github.com/mjeker99-collab/studiojeker-website/pull/400",
      complete: false,
    }),
  );
  assert.equal(preview.kind, "blocked");
  if (preview.kind === "blocked")
    assert.equal(
      preview.reviewUrl,
      "https://github.com/mjeker99-collab/studiojeker-website/pull/400",
    );
  const forced = layoutDecision(
    mapCursorHandoff({
      contentId: "content",
      status: "PREVIEW_READY",
      complete: true,
      reviewUrl: "https://github.com/mjeker99-collab/studiojeker-website/pull/400",
    }),
  );
  assert.equal(forced.kind, "blocked");
  assert.equal(JSON.stringify(forced).includes("SUCCEEDED"), false);
  const missing = layoutDecision({ blocked: CURSOR_INTEGRATION_GAP });
  assert.equal(missing.kind, "blocked");
  assert.match(
    missing.kind === "blocked" ? missing.error : "",
    /kein Cursor-Auftrag/,
  );
});

test("status copy stays in plain language", () => {
  assert.match(statusHeadline("QUEUED", null), /gespeichert/);
  assert.match(statusHeadline("SUCCEEDED", null), /Vorschau/);
  assert.match(statusHeadline("BLOCKED", "Die KI-Anbindung fehlt."), /KI-Anbindung/);
  assert.match(nextStepText("SUCCEEDED"), /Versand/);
  assert.match(nextStepText("WAITING_APPROVAL"), /Freigabe|frei/i);
});

test("adapter registry does not invent live connections", () => {
  const previous = {
    CONTENT_AI_ENABLED: process.env.CONTENT_AI_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CURSOR_API_KEY: process.env.CURSOR_API_KEY,
    SANITY_API_WRITE_TOKEN: process.env.SANITY_API_WRITE_TOKEN,
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME,
  };
  process.env.CONTENT_AI_ENABLED = "false";
  delete process.env.OPENAI_API_KEY;
  process.env.CURSOR_API_KEY = "cursor-test-key-not-a-connection";
  delete process.env.SANITY_API_WRITE_TOKEN;
  process.env.RENDER_SERVICE_NAME = "studiojeker-akquise";
  const connections = connectionRegistry(process.env);
  const byId = Object.fromEntries(connections.map((item) => [item.id, item]));
  assert.equal(connections.length, 7);
  assert.equal(byId.gpt.state, "NOT_CONNECTED");
  assert.equal(byId.cursor.state, "NOT_CONNECTED");
  assert.match(byId.cursor.detail, /PR #322/);
  assert.equal(byId.github.state, "NOT_CONNECTED");
  assert.equal(byId.render.state, "NOT_CONNECTED");
  assert.match(byId.render.detail, /studiojeker-akquise/);
  assert.equal(byId.sanity.state, "NOT_CONNECTED");
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
