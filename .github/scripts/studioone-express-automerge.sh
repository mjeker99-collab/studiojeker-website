#!/usr/bin/env bash
# Enables squash auto-merge after StudioONE CI, then starts akquise-checks
# on the squash commit. A merge performed with GITHUB_TOKEN does not emit a
# push workflow, and Render checksPass waits for checks on that new commit.
set -euo pipefail

: "${GH_REPO:?}"
: "${PR_URL:?}"
: "${HEAD_SHA:?}"

MAX_CI_ATTEMPTS="${MAX_CI_ATTEMPTS:-30}"
MAX_MERGE_ATTEMPTS="${MAX_MERGE_ATTEMPTS:-30}"
SLEEP_SECONDS="${SLEEP_SECONDS:-30}"
WORKFLOW_FILE="${WORKFLOW_FILE:-akquise-checks.yml}"

ci_conclusion() {
  gh run list --repo "$GH_REPO" --workflow "$WORKFLOW_FILE" --commit "$HEAD_SHA" --event pull_request \
    --json headSha,status,conclusion --limit 20 \
    --jq '[.[] | select(.headSha == env.HEAD_SHA and .status == "completed")] | first | .conclusion // ""'
}

result=""
for attempt in $(seq 1 "$MAX_CI_ATTEMPTS"); do
  result="$(ci_conclusion)"
  if [ "$result" = "success" ]; then
    break
  fi
  if [ "$result" = "failure" ] || [ "$result" = "cancelled" ] || [ "$result" = "timed_out" ]; then
    echo "StudioONE CI did not pass: $result"
    exit 1
  fi
  if [ "$attempt" = "$MAX_CI_ATTEMPTS" ]; then
    echo "No successful StudioONE CI for this PR SHA; leaving PR open."
    exit 1
  fi
  sleep "$SLEEP_SECONDS"
done

gh pr merge --auto --squash "$PR_URL" || echo "Auto-merge command returned non-zero; checking whether the PR is already merged."

for attempt in $(seq 1 "$MAX_MERGE_ATTEMPTS"); do
  merged="$(gh pr view "$PR_URL" --repo "$GH_REPO" --json state,mergeCommit --jq 'if .state == "MERGED" then .mergeCommit.oid else "" end')"
  if [ -n "$merged" ]; then
    gh workflow run "$WORKFLOW_FILE" --repo "$GH_REPO" --ref "$merged"
    echo "Dispatched ${WORKFLOW_FILE} for merge commit ${merged}."
    exit 0
  fi
  if [ "$attempt" = "$MAX_MERGE_ATTEMPTS" ]; then
    echo "Auto-merge was enabled but the PR is not merged; no deploy-branch check was started."
    exit 1
  fi
  sleep "$SLEEP_SECONDS"
done
