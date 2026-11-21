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
import {
  masterlistActorOrder,
  masterlistNoticeView,
  selectMasterlistActor,
} from "../lib/masterlist-actor";

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

const martin = {
  id: "martin",
  name: "Martin Jeker",
  email: "martin@example.test",
  active: true,
};
const nora = {
  id: "nora",
  name: "Nora Jeker",
  email: "nora@example.test",
  active: true,
};
const allow = (user: { email: string }) => user.email.endsWith("@example.test");

test("Master list keeps the first active account when that grant is unusable", () => {
  const order = masterlistActorOrder({
    MARTIN_EMAIL: "MARTIN@example.test",
    NORA_EMAIL: "nora@example.test",
  });
  assert.deepEqual(order, ["martin@example.test", "nora@example.test"]);
  assert.equal(selectMasterlistActor(order, [nora, martin], allow)?.id, "martin");
  assert.equal(
    selectMasterlistActor(order, [{ ...martin, active: false }, nora], allow)?.id,
    "nora",
  );
  assert.equal(
    selectMasterlistActor(order, [martin, nora], () => false),
    null,
  );
  assert.equal(selectMasterlistActor([], [martin], allow), null);
});

test("Another signed-in person cannot see the designated token or folder", () => {
  const secret = "synthetic-refresh-token";
  const view = masterlistNoticeView({
    viewerId: nora.id,
    actor: { id: martin.id, name: `${martin.name} ${secret}` },
    access: "consent_required",
    folderName: "Adressen",
  });
  assert.deepEqual(view, {
    role: "other",
    access: "consent_required",
    actorName: "Martin",
  });
  assert.equal(JSON.stringify(view).includes(secret), false);
  assert.equal(JSON.stringify(view).includes("Adressen"), false);
  assert.equal(JSON.stringify(view).includes("@"), false);
  assert.deepEqual(
    masterlistNoticeView({
      viewerId: martin.id,
      actor: martin,
      access: "missing",
      folderName: "Adressen",
    }),
    { role: "self", access: "missing", folderName: "Adressen" },
  );
  assert.equal(
    masterlistNoticeView({
      viewerId: nora.id,
      actor: { id: martin.id, name: "owner@example.test" },
      access: "consent_required",
    }).role === "other" &&
      masterlistNoticeView({
        viewerId: nora.id,
        actor: { id: martin.id, name: "owner@example.test" },
        access: "consent_required",
      }).actorName,
    "der zuständigen Person",
  );
});
