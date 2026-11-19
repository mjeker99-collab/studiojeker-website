import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APPROVED_BASE_REF,
  NEXT_STEP_CREATE_EDITION,
  blockReason,
  buildPrompt,
  createAgentBody,
  cursorUserMessage,
  matchingPr,
  parseCreateResponse,
  parseRunResponse,
  readCursorKey,
  taskRoute,
  validatedPr,
  CursorApiError,
} from "../lib/cursor/contract";
import {
  CURSOR_STATUS_LABEL,
  htmlPreviewHref,
  statusFromRun,
} from "../lib/cursor/status";
import { toPublicTask } from "../lib/cursor/newsletter";

const agentId = "bc-00000000-0000-0000-0000-000000000001";
const runId = "run-00000000-0000-0000-0000-000000000001";
const key = "synthetic-cursor-key-not-real";
const freshPr =
  "https://github.com/mjeker99-collab/studiojeker-website/pull/900001";

test("V3 bleibt gesperrt und eine fehlende Ausgabe hat einen klaren nächsten Schritt", () => {
  assert.equal(blockReason("newsletter-03", false), "protected");
  assert.equal(blockReason("newsletter-03-promo-nov2026", false), "protected");
  assert.equal(blockReason("newsletter-03", true), null);
  assert.equal(blockReason("newsletter-02", false), "unapproved");
  assert.equal(NEXT_STEP_CREATE_EDITION, "Neue Ausgabe anlegen");
  assert.equal(
    validatedPr(
      "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
    ),
    "",
  );
  assert.equal(
    validatedPr(
      "https://github.com/mjeker99-collab/studiojeker-website/pull/305",
    ),
    "",
  );
  assert.equal(validatedPr(freshPr), freshPr);
});

test("Eine neue V4-Ausgabe startet einen eigenen Entwurf und kein altes Pull Request", () => {
  const prompt = buildPrompt(
    {
      instruction: `Layout der Vorlage anpassen. Schlüssel ${key}`,
      templateId: "newsletter-03",
      version: 1,
      title: "Newsletter V4 · Entwurf",
    },
    key,
  );
  assert.equal(prompt.includes(key), false);
  assert.equal(prompt.includes("newsletter-03"), true);
  assert.equal(prompt.includes("305"), true);
  const created = createAgentBody(prompt, { startingRef: APPROVED_BASE_REF });
  assert.equal(created.autoCreatePR, true);
  assert.equal(created.workOnCurrentBranch, false);
  assert.equal(created.repos[0].startingRef, APPROVED_BASE_REF);
  assert.equal("prUrl" in created.repos[0], false);
  const follow = createAgentBody(prompt, { prUrl: freshPr });
  assert.equal(follow.autoCreatePR, false);
  assert.equal(follow.workOnCurrentBranch, true);
  assert.equal(follow.repos[0].prUrl, freshPr);
  assert.throws(
    () =>
      createAgentBody(prompt, {
        prUrl:
          "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
      }),
    CursorApiError,
  );
  assert.equal(taskRoute("Bitte den Betreff kürzer formulieren."), "editorial");
  assert.equal(taskRoute("Bitte das Layout der Vorlage ändern."), "technical");
});

test("Cursor-Status ist erst nach echten IDs sichtbar und nie erledigt", () => {
  assert.throws(
    () => parseCreateResponse({ agent: {}, run: {} }),
    CursorApiError,
  );
  const created = parseCreateResponse({
    agent: { id: agentId, url: `https://cursor.com/agents/${agentId}` },
    run: { id: runId, status: "CREATING" },
  });
  assert.equal(created.status, "HANDED_OFF");
  assert.equal(CURSOR_STATUS_LABEL[created.status], "An Cursor übergeben");
  assert.equal(statusFromRun("FINISHED", false, "refresh"), "IN_PROGRESS");
  const finished = parseRunResponse({
    id: runId,
    status: "FINISHED",
    git: {
      branches: [
        {
          prUrl:
            "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
        },
        { prUrl: freshPr },
      ],
    },
  });
  assert.equal(finished.prUrl, freshPr);
  assert.equal(finished.status, "PREVIEW_READY");
  assert.equal(
    matchingPr({
      git: {
        branches: [
          {
            prUrl:
              "https://github.com/mjeker99-collab/studiojeker-website/pull/305",
          },
        ],
      },
    }),
    "",
  );
  const task = toPublicTask({
    contentId: "c1",
    version: 1,
    instruction: "Layout",
    status: "PREVIEW_READY",
    agentId,
    runId,
    agentUrl: `https://cursor.com/agents/${agentId}`,
    prUrl: freshPr,
    previewHtml: "https://preview.studiojeker.ch/newsletter/v4.html?sig=secret",
    errorMessage: "",
    pendingUntil: null,
    route: "cursor",
  });
  assert.equal(task.complete, false);
  assert.equal(task.label, "Vorschau bereit");
  assert.equal(task.previewUrl, "");
  assert.equal(task.reviewUrl, freshPr);
  assert.equal(
    htmlPreviewHref("https://preview.studiojeker.ch/newsletter/v4.html"),
    "https://preview.studiojeker.ch/newsletter/v4.html",
  );
  assert.equal(htmlPreviewHref(freshPr), "");
  assert.match(task.note, /nicht erledigt/);
  assert.equal(
    cursorUserMessage(401, "").message,
    "Cursor noch nicht verbunden.",
  );
  assert.equal(readCursorKey({}), null);
});
