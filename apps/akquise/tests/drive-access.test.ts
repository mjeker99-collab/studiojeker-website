import { test } from "node:test";
import assert from "node:assert/strict";
import { PolicyError } from "../lib/policy";
import {
  classifyGoogleAccessError,
  contactSyncFailure,
  googleAccessPolicy,
  needsGoogleConsent,
} from "../lib/drive/access-error";
import { retainedDriveFolder, driveConsentPrompt } from "../lib/drive/service";

test("Google refresh failure keeps secrets out of the user message", () => {
  const secret = "synthetic-refresh-token-do-not-copy";
  const revoked = {
    response: {
      status: 400,
      data: { error: "invalid_grant", error_description: secret },
    },
    message: `invalid_grant ${secret}`,
  };
  assert.equal(classifyGoogleAccessError(revoked), "consent");
  const policy = googleAccessPolicy(revoked);
  assert.equal(policy.status, 401);
  assert.equal(policy.message, "Die Google-Verbindung muss erneuert werden.");
  assert.equal(policy.message.includes(secret), false);
  assert.equal(JSON.stringify(policy).includes(secret), false);
  assert.deepEqual(
    contactSyncFailure(new PolicyError(policy.message, policy.status)),
    { status: 409, reason: "google_consent_required" },
  );
});

test("Temporary Google failures stay distinct from a new consent", () => {
  for (const error of [
    { code: "ETIMEDOUT", message: "connect ETIMEDOUT oauth2.googleapis.com" },
    { response: { status: 503, data: { error: "backendError" } } },
    { cause: { code: "ENOTFOUND" }, message: "fetch failed" },
    { response: { status: 400, data: { error: "invalid_client" } } },
    new Error("boom"),
  ]) {
    assert.equal(classifyGoogleAccessError(error), "unreachable");
    const policy = googleAccessPolicy(error);
    assert.equal(policy.status, 503);
    assert.match(policy.message, /nicht erreichbar/);
    assert.equal(policy.message.includes("erneuert"), false);
    assert.deepEqual(
      contactSyncFailure(new PolicyError(policy.message, policy.status)),
      {
        status: 503,
        reason: "google_unreachable",
      },
    );
  }
  assert.equal(
    classifyGoogleAccessError({ response: { status: 401, data: {} } }),
    "consent",
  );
  assert.equal(
    contactSyncFailure(new PolicyError("Masterliste zu gross.", 413)).status,
    500,
  );
  assert.equal(
    needsGoogleConsent(
      new PolicyError("Google Drive: Verbindung bitte neu einrichten.", 503),
    ),
    true,
  );
});

test("Reconnect keeps the selected folder only for the same Google account", () => {
  const previous = {
    email: "USER@example.test",
    folderId: "folder_123",
    folderName: "Adressen",
  };
  assert.equal(driveConsentPrompt, "consent select_account");
  assert.deepEqual(retainedDriveFolder(previous, "user@example.test"), {
    folderId: "folder_123",
    folderName: "Adressen",
  });
  assert.deepEqual(retainedDriveFolder(previous, "other@example.test"), {
    folderId: null,
    folderName: null,
  });
  assert.deepEqual(retainedDriveFolder(null, "user@example.test"), {
    folderId: null,
    folderName: null,
  });
});
