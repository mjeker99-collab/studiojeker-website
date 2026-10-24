import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPromoteToSocial,
  isSocialPublishingPost,
  workspaceForBriefing,
  workspaceLabels,
} from "../lib/hub/workspace";

test("Social publishing list excludes GPT dialogs and content drafts", () => {
  assert.equal(
    isSocialPublishingPost({ kind: "SOCIAL", workspace: "SOCIAL_POST" }),
    true,
  );
  assert.equal(
    isSocialPublishingPost({ kind: "SOCIAL", workspace: "GPT_DIALOG" }),
    false,
  );
  assert.equal(
    isSocialPublishingPost({ kind: "SOCIAL", workspace: "CONTENT_DRAFT" }),
    false,
  );
  assert.equal(
    isSocialPublishingPost({ kind: "NEWSLETTER", workspace: "SOCIAL_POST" }),
    false,
  );
  assert.equal(
    isSocialPublishingPost({ kind: "SOCIAL", workspace: null }),
    true,
  );
});

test("Only drafts and GPT dialogs can be promoted into Social Media", () => {
  assert.equal(
    canPromoteToSocial({ kind: "SOCIAL", workspace: "GPT_DIALOG" }),
    true,
  );
  assert.equal(
    canPromoteToSocial({ kind: "SOCIAL", workspace: "CONTENT_DRAFT" }),
    true,
  );
  assert.equal(
    canPromoteToSocial({ kind: "SOCIAL", workspace: "SOCIAL_POST" }),
    false,
  );
  assert.equal(
    canPromoteToSocial({ kind: "NEWSLETTER", workspace: "CONTENT_DRAFT" }),
    false,
  );
});

test("Conversation placeholders classify as GPT dialogs", () => {
  assert.equal(
    workspaceForBriefing({
      goal: "Im Gespräch klären",
      audience: "Im Gespräch klären",
    }),
    "GPT_DIALOG",
  );
  assert.equal(
    workspaceForBriefing({
      goal: "Reichweite auf LinkedIn",
      audience: "B2B Entscheider",
    }),
    "CONTENT_DRAFT",
  );
  assert.equal(
    workspaceForBriefing({
      goal: "Im Gespräch klären",
      audience: "Im Gespräch klären",
      workspace: "CONTENT_DRAFT",
    }),
    "CONTENT_DRAFT",
  );
  assert.equal(workspaceLabels.GPT_DIALOG, "GPT-Dialog");
});
