# Mailchimp → StudioONE: Read-only audit and integration plan

Date: 2026-11-23
Status: analysis only; **not implemented, not tested end-to-end, not deployed**.
Target: Render `studiojeker-akquise`, branch `feat/akquise-production-readiness`, app `apps/akquise`.

## Confirmed
- Render service exists, configured from this repository's `feat/akquise-production-readiness` branch.
- Screenshot of Render Environment confirms **name** `MAILCHIMP_API_KEY` exists. No secret value inspected.
- Mailchimp dashboard shows active API key labelled StudioONE. This does **not** demonstrate successful API access.
- Current GitHub default-branch code search did not find a Mailchimp API endpoint under `apps/akquise`; this is inconclusive because the deployed branch differs from default.
- `AGENTS.md`, `docs/STUDIOONE_OPERATING_AGREEMENT.md`, `docs/STUDIOONE_UX_GUIDELINES.md` on deploy branch read.
- Google Sheets master and separate `Mailchimp Prüfung` tab exist. Existing contact sync must not be modified without test and approval.

## Required implementation investigation
1. Inspect `apps/akquise` source tree on the **deploy branch**, especially API routes, integration configuration, auth, Prisma models, tests and existing Google Sheets sync.
2. Search all deployed-branch source files for `MAILCHIMP_API_KEY`, `mailchimp`, `us17`, audience/list ID, and any existing client.
3. Confirm API key only exists in server-side environment; never log, echo or return it.
4. Add or reuse a **server-side read-only** Mailchimp API client; only GET endpoints for account ping, audience metadata, contacts and subscription status. No subscribe/unsubscribe, campaign, send or write endpoints.
5. Handle pagination, retries/rate limits, server prefix, timeouts, error masking and minimal data exposure. Do not assume API key has read-only permissions; enforce read-only in application code.
6. Expose an authenticated internal diagnostic endpoint showing only `configured`, `reachable`, audience count and error class (no secrets, no contact payload), behind existing admin authorization.
7. Add tests with mocked Mailchimp responses: successful connection, invalid credentials, no audience, pagination, unsubscribed/cleaned exclusions, duplicate contact and failure modes.
8. Keep contacts in a quarantine/review staging area. Match by normalized email, company and person across Contacts, Mailverwaltung, Akquise Vorbereitung and all available pending supplements. Never treat newsletter consent as permission for personalized outreach.
9. All new leads must have individualized subject and draft, `Nicht kontaktiert – keine Versandfreigabe`. No email sending.
10. Verify lint/typecheck/tests/build, PR checks, staging deployment and read-only live diagnostic before asking for production release approval.

## UX acceptance
- In StudioONE, one clear action such as “Mailchimp-Kontakte prüfen”; no API keys or settings exposed to ordinary users.
- Show counts: imported, existing, pending verification, unsubscribed, excluded, errors.
- Save progress and allow resumption; review and approval before any master data changes.

## Safety
No API keys or tokens in Git. No production deploy or automated mail. No changes to production contacts until explicit approval and successful dry run.
