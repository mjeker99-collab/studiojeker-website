# Sanity Studio deployment

Standalone Studio lives in `studio/` (project `tgx6e6jg`, dataset `production`).

It is **not** part of the Metanet / Next.js staging deploy (`.github/workflows/deploy-staging.yml`).
Editors use the hosted Studio at:

- https://studiojeker.sanity.studio/
- Sanity appId (see `studio/sanity.cli.ts`): `ofbist72j0e7x9uewc5py90y`

## Why Content Abo or KI / AI can be missing

Schema + desk structure for the **Content Abo** singleton (`_type: abo`, `_id: abo`) live in:

- `studio/schemaTypes/abo.ts`
- `studio/schemaTypes/index.ts` (registered)
- `studio/structure.ts` (nav item **Content Abo**)

Schema + desk structure for the **KI / AI** singleton (`_type: ai`, `_id: ai`) live in:

- `studio/schemaTypes/ai.ts` (+ `aiDefaults.ts` initial values)
- `studio/schemaTypes/index.ts` (registered)
- `studio/structure.ts` (nav item **KI / AI**)
- Frontend: `lib/sanity/ai.ts`, `lib/content/merge-sanity-ai.ts`, `/ki` + `/en/ai`

Homepage still has a separate teaser group **Sichtbarkeit im Abo** (`aboSection`). That is intentional and is **not** the Content Abo landing document.

If the hosted Studio only shows Homepage / teaser fields and not the **Content Abo** or **KI / AI** menu item, the hosted Studio build is **out of date**. Pushing schema changes to `main` does not update `*.sanity.studio` until `sanity deploy` runs.

Seed the KI/AI document once (create-only, never overwrites):

```bash
node scripts/migrate-ai-page.mjs
```

Requires `SANITY_API_WRITE_TOKEN` (Editor / create+write). Opening **KI / AI** in Studio also prefills from schema `initialValue` when the singleton does not exist yet.

## Deploy (manual)

From a machine with a Sanity token that can deploy this project:

```bash
cd studio
npm ci
npm run build    # optional check
npm run deploy   # builds + publishes to studiojeker.sanity.studio
```

Unattended (CI / agents):

```bash
cd studio
SANITY_AUTH_TOKEN=… npx sanity deploy -y
```

## Deploy (GitHub Actions)

Workflow: `.github/workflows/deploy-sanity-studio.yml`

- Triggers on `push` to `main` when `studio/**` changes, or `workflow_dispatch`
- Requires repository secret `SANITY_AUTH_TOKEN`
- Does **not** touch Metanet FTPS / staging HTML

## Local check

```bash
cd studio
npm ci
npm run typecheck
npm run build
# Confirm desk labels are in the bundle:
grep -R "Content Abo" dist/static/sanity-*.js
grep -R "KI / AI" dist/static/sanity-*.js
npm run dev   # http://localhost:3333
```
