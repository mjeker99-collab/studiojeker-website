import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = join(
  dirname(fileURLToPath(import.meta.url)),
  "studioone-express-automerge.sh",
);
const workflow = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../workflows/studioone-express-automerge.yml"),
  "utf8",
);

function fakeGh(dir) {
  const bin = join(dir, "bin");
  const gh = join(bin, "gh");
  spawnSync("mkdir", ["-p", bin]);
  writeFileSync(
    gh,
    `#!/bin/sh
printf '%s\\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "run list")
    printf '%s' "$CI_RESULT"
    ;;
  "pr merge")
    exit 0
    ;;
  "pr view")
    printf '%s' "$MERGE_OID"
    ;;
  "api "*)
    printf '%s' "$BRANCH_TIP"
    ;;
  "workflow run")
    exit 0
    ;;
  *)
    echo "unexpected gh command: $*" >&2
    exit 9
    ;;
esac
`,
  );
  chmodSync(gh, 0o755);
  return bin;
}

function run(extra) {
  const dir = mkdtempSync(join(tmpdir(), "studioone-automerge-"));
  const log = join(dir, "gh.log");
  writeFileSync(log, "");
  const result = spawnSync("bash", [script], {
    env: {
      ...process.env,
      PATH: `${fakeGh(dir)}:${process.env.PATH}`,
      GH_LOG: log,
      GH_REPO: "mjeker99-collab/studiojeker-website",
      PR_URL: "https://github.com/mjeker99-collab/studiojeker-website/pull/396",
      HEAD_SHA: "6d007b64348c3a6589bfd6c2e7eb3f57183e7e6c",
      BASE_REF: "feat/akquise-production-readiness",
      MAX_CI_ATTEMPTS: "2",
      MAX_MERGE_ATTEMPTS: "2",
      SLEEP_SECONDS: "0",
      CI_RESULT: "",
      MERGE_OID: "",
      BRANCH_TIP: "",
      ...extra,
    },
    encoding: "utf8",
  });
  return { ...result, log: readFileSync(log, "utf8") };
}

test("successful PR CI dispatches the deploy branch only when it is the squash commit", () => {
  const merge = "56934a07b6209ddf140699fb54165b0de1d7fa8a";
  const result = run({ CI_RESULT: "success", MERGE_OID: merge, BRANCH_TIP: merge });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.log, /pr merge --auto --squash/);
  assert.match(
    result.log,
    /workflow run akquise-checks\.yml --repo mjeker99-collab\/studiojeker-website --ref feat\/akquise-production-readiness\n/,
  );
  assert.equal(result.log.includes(`--ref ${merge}`), false);
});

test("a moved deploy branch does not receive a check for a different commit", () => {
  const result = run({
    CI_RESULT: "success",
    MERGE_OID: "56934a07b6209ddf140699fb54165b0de1d7fa8a",
    BRANCH_TIP: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /not merge commit/);
  assert.equal(result.log.includes("workflow run"), false);
});

test("failed PR CI neither merges nor starts a deploy-branch check", () => {
  const result = run({ CI_RESULT: "failure" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /did not pass: failure/);
  assert.equal(result.log.includes("pr merge"), false);
  assert.equal(result.log.includes("workflow run"), false);
});

test("missing PR CI leaves the PR open", () => {
  const result = run({ CI_RESULT: "" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /leaving PR open/);
  assert.equal(result.log.includes("pr merge"), false);
  assert.equal(result.log.includes("workflow run"), false);
});

test("auto-merge without a merge commit does not dispatch checks", () => {
  const result = run({ CI_RESULT: "success", MERGE_OID: "" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /no deploy-branch check/);
  assert.match(result.log, /pr merge --auto --squash/);
  assert.equal(result.log.includes("workflow run"), false);
});

test("workflow can dispatch Actions and calls the checked script", () => {
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /studioone-express-automerge\.sh/);
  assert.match(workflow, /BASE_REF:/);
  assert.equal(workflow.includes("gh pr merge --auto --squash"), false);
});
