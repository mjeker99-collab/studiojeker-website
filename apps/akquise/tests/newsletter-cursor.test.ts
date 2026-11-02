import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approvedEdition,
  blockReason,
  buildPrompt,
  createAgentBody,
  cursorUserMessage,
  followUpBody,
  matchingPr,
  parseCreateResponse,
  parseRunResponse,
  CursorApiError,
  handoffInput,
  readCursorKey,
} from "../lib/cursor/contract";
import {
  openableCursorHref,
  statusFromRun,
  CURSOR_STATUS_LABEL,
} from "../lib/cursor/status";
const edition = {
  templateId: "newsletter-02",
  prUrl: "https://github.com/mjeker99-collab/studiojeker-website/pull/900001",
};
const agentId = "bc-00000000-0000-0000-0000-000000000001";
const runId = "run-00000000-0000-0000-0000-000000000001";
const key = "synthetic-cursor-key-not-real";

test("Freigegebene Ziele sind fest und schliessen V3/V4-Pull-Requests aus", () => {
  assert.equal(approvedEdition("newsletter-02"), null);
  assert.equal(blockReason("newsletter-03"), "protected");
  assert.equal(blockReason("newsletter-03-promo-nov2026"), "protected");
  assert.equal(blockReason("newsletter-02"), "unapproved");
  assert.equal(blockReason("newsletter-02", [edition]), null);
  for (const prUrl of [
    "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
    "https://github.com/mjeker99-collab/studiojeker-website/pull/305",
    "https://evil.example/pull/900001",
    "https://github.com/mjeker99-collab/studiojeker-website/pull/900001/files",
    "https://github.com/other/studiojeker-website/pull/900001",
  ])
    assert.equal(
      approvedEdition("newsletter-02", [{ ...edition, prUrl }]),
      null,
    );
  assert.equal(openableCursorHref(edition.prUrl), edition.prUrl);
  assert.equal(
    openableCursorHref(
      "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
    ),
    "",
  );
  assert.equal(openableCursorHref("javascript:alert(1)"), "");
});

test("Auftrag verwendet nur die dokumentierte Cursor-API und kein Benutzerziel", () => {
  const prompt = buildPrompt(
    {
      instruction: `Kürzer formulieren. Schlüssel ${key}`,
      templateId: "newsletter-02",
      version: 2,
      title: "Newsletter 02",
    },
    key,
  );
  assert.equal(prompt.includes(key), false);
  assert.equal(prompt.includes("newsletter-03"), true);
  assert.equal(prompt.includes("PR 313"), true);
  const body = createAgentBody(prompt, edition.prUrl);
  assert.deepEqual(Object.keys(body).sort(), [
    "autoCreatePR",
    "prompt",
    "repos",
    "workOnCurrentBranch",
  ]);
  assert.equal(body.autoCreatePR, false);
  assert.equal(body.workOnCurrentBranch, true);
  assert.deepEqual(body.repos, [
    {
      url: "https://github.com/mjeker99-collab/studiojeker-website",
      prUrl: edition.prUrl,
    },
  ]);
  assert.equal(JSON.stringify(body).includes(key), false);
  assert.deepEqual(Object.keys(followUpBody(prompt)), ["prompt"]);
  assert.equal(
    handoffInput.safeParse({ instruction: "Text", prUrl: edition.prUrl })
      .success,
    false,
  );
  assert.equal(
    handoffInput.safeParse({ instruction: "x".repeat(4001) }).success,
    false,
  );
  assert.equal(readCursorKey({ CURSOR_API_KEY: "" }), null);
  assert.equal(readCursorKey({}), null);
});

test("Status wird erst nach einer echten Agent- und Run-ID gesetzt", () => {
  assert.throws(
    () => parseCreateResponse({ agent: {}, run: {} }),
    CursorApiError,
  );
  assert.throws(
    () =>
      parseCreateResponse({
        agent: { id: "../x" },
        run: { id: runId, status: "CREATING" },
      }),
    CursorApiError,
  );
  const created = parseCreateResponse({
    agent: { id: agentId, url: `https://cursor.com/agents/${agentId}` },
    run: { id: runId, agentId, status: "CREATING" },
  });
  assert.equal(created.status, "HANDED_OFF");
  assert.equal(CURSOR_STATUS_LABEL[created.status], "An Cursor übergeben");
  assert.equal(statusFromRun("RUNNING", false, "refresh"), "IN_PROGRESS");
  assert.equal(statusFromRun("FINISHED", false, "refresh"), "IN_PROGRESS");
  assert.equal(statusFromRun("FINISHED", true, "refresh"), "PREVIEW_READY");
  assert.equal(statusFromRun("ERROR", false, "refresh"), "ERROR");
  assert.equal(statusFromRun("UNKNOWN", false, "refresh"), "ERROR");
  const finished = {
    id: runId,
    status: "FINISHED",
    git: {
      branches: [
        { prUrl: "https://github.com/evil.example/pull/1" },
        { prUrl: edition.prUrl },
      ],
    },
  };
  assert.equal(parseRunResponse(finished, edition.prUrl).prUrl, edition.prUrl);
  assert.equal(
    parseRunResponse(finished, edition.prUrl).status,
    "PREVIEW_READY",
  );
  assert.equal(
    matchingPr(
      finished,
      "https://github.com/mjeker99-collab/studiojeker-website/pull/313",
    ),
    "",
  );
  const failure = cursorUserMessage(409, "agent_busy");
  assert.equal(failure.status, 409);
  assert.equal(failure.message.includes(key), false);
  assert.equal(
    cursorUserMessage(401, "").message,
    "Cursor noch nicht verbunden.",
  );
});
