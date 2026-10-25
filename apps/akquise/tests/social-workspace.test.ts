import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPromoteToSocial,
  isManagedDialog,
  isSocialPublishingPost,
  workspaceForBriefing,
  workspaceLabels,
} from "../lib/hub/workspace";
import { dialogManageInput } from "../lib/hub/dialog-input";

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
  assert.equal(
    canPromoteToSocial({
      kind: "SOCIAL",
      workspace: "GPT_DIALOG",
      archivedAt: new Date(),
    }),
    false,
  );
  assert.equal(isManagedDialog({ kind: "SOCIAL", workspace: "GPT_DIALOG" }), true);
  assert.equal(
    isManagedDialog({ kind: "SOCIAL", workspace: "SOCIAL_POST" }),
    false,
  );
});

test("Dialog manage input accepts archive restore and delete batches", () => {
  const parsed = dialogManageInput.parse({
    action: "delete",
    items: [
      { id: "dialog-1", version: 1 },
      { id: "dialog-2", version: 3 },
    ],
  });
  assert.equal(parsed.action, "delete");
  assert.equal(parsed.items.length, 2);
  assert.throws(() =>
    dialogManageInput.parse({
      action: "delete",
      items: [],
    }),
  );
  assert.throws(() =>
    dialogManageInput.parse({
      action: "purge",
      items: [{ id: "x", version: 1 }],
    }),
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
