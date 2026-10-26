# StudioONE Backup Operator – implementation brief

## Immediate objective
Allow the owner to request **Run backup now** and **Show last backup** from ChatGPT, without visiting GitHub Actions or Render. Do not make the owner operate technical dashboards.

## Scope
- Existing weekly Sanity workflow: `.github/workflows/weekly-sanity-backup.yml` (main).
- Existing StudioONE PostgreSQL workflow: `.github/workflows/weekly-studioone-backup.yml` (StudioONE deploy branch).
- Target Exoscale SOS bucket: `studiojeker-backups` in `ch-dk-2`.
- Read existing `AGENTS.md` and the StudioONE-specific agent instructions before editing.

## Delivery requirements
1. Implement an authenticated, narrowly scoped backup-control API for ChatGPT. Server-side GitHub App installation token (or fine-grained credential) must permit `actions:write` and `actions:read` on this one repository. Never expose tokens in OpenAPI, responses or logs.
2. Operations: `startStudioOneBackup`, `startWebsiteBackup`, `getBackupStatus`. Starting should dispatch only allowlisted workflow IDs and branches. Return run link/status; idempotency, audit logging and rate limits required.
3. Enable disabled workflows via explicit allowlisted admin operation if necessary. Do not accept arbitrary repository, workflow or command parameters.
4. Store separate credentials in Render environment or GitHub Secrets, not source. Avoid leaking database URLs and Exoscale keys.
5. Provide a status endpoint that verifies the resulting object exists in Exoscale (not just that GitHub Actions succeeded).
6. Ensure weekly workflows are active on the repository default branch. GitHub scheduled workflows only run on default branch: the StudioONE workflow currently lives on the deploy branch, so promote its workflow YAML to `main` without changing the Render application branch.
7. Correct mismatched Exoscale secret names (existing secret screenshot: `EXOSCALE_BACKUP_SECRET_ACCESS_KEY`, workflow expects `EXOSCALE_BACKUP_SECRET_ACCESS_KEY` for StudioONE and `EXOSCALE_BACKUP_SECRET_ACCESS_KEY` for Sanity; use consistent names), and preserve secrets.
8. Configure 12-week retention via Exoscale lifecycle policy, not an unverified assertion. Preserve existing backups.
9. Verify one end-to-end backup per system and restore instructions. Do not repeatedly run full suites or introduce unrelated work.

## Acceptance
User can say “Backups jetzt starten” and ChatGPT can invoke both workflows and report a real success or failure, with no manual portal steps.
