# Studiojeker — Metanet / Plesk static deployment

Version 1.0

---

## Why static?

The current Metanet hosting plan for Studiojeker does **not** provide a Node.js
runtime. The marketing website is therefore built as a **fully static Next.js
export** and served by Apache/Plesk like any classic HTML site.

There is **no** `next start`, no server-side API routes, and no middleware at
runtime on Metanet.

---

## Local build

From the repository root (Node.js is only required on the **build machine**,
e.g. your laptop or CI — not on Metanet):

```bash
npm install
npm run build
```

(`npm run export` is an alias for the same static build.)

### Output

Next.js writes the static site to:

```text
/out
```

(absolute path when building from the repo root: `<repo>/out`)

The `out/` folder contains HTML, CSS, JS, images, fonts, and `.htaccess`.

---

## What to upload to Plesk

Deploy **only the contents of `/out`** into the domain document root, e.g.:

- Staging: `staging2026.studiojeker.ch` → `httpdocs/` (or the subdomain folder)
- Production: later, same process for `www.studiojeker.ch`

**Do not** upload:

- the GitHub repository root
- `node_modules/`
- `.next/`
- source files (`app/`, `components/`, `lib/`, …)

Only the **files inside** `out/` belong in the public web root.

Example (conceptually):

```text
out/index.html          →  httpdocs/index.html
out/about/index.html    →  httpdocs/about/index.html
out/en/work/index.html  →  httpdocs/en/work/index.html
out/.htaccess           →  httpdocs/.htaccess
out/_next/...           →  httpdocs/_next/...
out/images/...          →  httpdocs/images/...
out/api/contact.php     →  httpdocs/api/contact.php
```

---

## Recommended workflow

### Code / design changes

1. Edit the site in Cursor (design stays locked unless intentionally changed).
2. Commit and open a PR; merge to `main`.
3. Push/merge to `main` **automatically** runs **Deploy staging (Metanet)**.
4. Smoke-test `https://staging2026.studiojeker.ch/` (and EN routes).
5. When approved, repeat for production in a **separate, explicit** step — never automatic.

### CMS content changes (Sanity)

1. Edit Homepage in Sanity Studio → **Publish**.
2. Sanity webhook fires `repository_dispatch` on this repo (see below).
3. The **same** staging workflow builds the static export (Sanity fetched at build time)
   and deploys to Metanet staging.
4. No manual GitHub/Cursor deploy is required for a normal CMS edit.

Manual fallback remains available via Actions → **Deploy staging (Metanet)** → Run workflow.

---

## GitHub Actions — staging deploy

Workflow file: `.github/workflows/deploy-staging.yml`

### Triggers

| Trigger | When | Confirmation |
|---------|------|--------------|
| `push` to `main` | Code merged/pushed to main | Implicit (staging only) |
| `workflow_dispatch` | Manual run from Actions UI | Must type `staging2026` |
| `repository_dispatch` type `sanity-homepage-published` | Sanity Homepage publish webhook | Implicit (staging only) |

Does **not** run on pull requests or schedule. Does **not** deploy production.

### What it does

- Builds with Node.js **22 LTS** → `npm ci` → `npm run build`
- Sets `NEXT_PUBLIC_SITE_URL=https://staging2026.studiojeker.ch`
- Pins public Sanity identifiers for the build (`tgx6e6jg` / `production` / `2025-01-01`)
- Fails if `out/` (or `out/index.html` / `out/api/contact.php`) is missing
- Uploads **only the contents of `out/`** to the staging FTP account via **lftp**
  (explicit FTPS on port 21, passive mode, `ssl:verify-certificate true`)
- Includes hidden files from `out/`, especially **`out/.htaccess`** (verified before upload)
- Does **not** delete remote files (`mirror -R` without `--delete`); preserves host-only
  `api/contact.config.php` via `--exclude-glob`
- Does **not** upload source, `.git`, `node_modules`, docs, env files, or workflows
- Does **not** deploy to production / `studiojeker.ch`

### Safety confirmation (manual runs only)

When starting the workflow **manually** you must type exactly:

```text
staging2026
```

in the `confirm_target` input. Any other value aborts the job.

Push-to-main and Sanity webhook triggers skip this prompt and always target staging.

### Required GitHub Actions secrets (Metanet FTP)

Repository → **Settings → Secrets and variables → Actions**. Create:

| Secret | Purpose |
|--------|---------|
| `METANET_FTP_SERVER` | FTP hostname from Plesk (e.g. `ftp.…` or the Metanet FTP server) |
| `METANET_FTP_USERNAME` | Staging FTP user (jailed to `/staging2026.studiojeker.ch`) |
| `METANET_FTP_PASSWORD` | Staging FTP password |

Never commit FTP credentials. Never reuse production FTP credentials here.

### How to run manually

1. Open **Actions** → **Deploy staging (Metanet)**.
2. Click **Run workflow**.
3. Choose the branch to build from (usually `main`).
4. Set `confirm_target` to `staging2026`.
5. Run and wait for a green job.
6. Smoke-test `https://staging2026.studiojeker.ch/` (including `/api/contact.php` GET → 405).
7. Confirm `.htaccess` is present at the staging FTP/document root (Plesk File Manager → show hidden files).

---

## Sanity publish → staging (webhook)

Sanity content is baked into the static export at **build time** (`output: "export"`).
A publish therefore must trigger a rebuild + FTP deploy. This uses the **same**
workflow as code deploys via GitHub `repository_dispatch`.

### Architecture

```text
Sanity Studio Publish (homepage)
  → Sanity webhook (GROQ filter: homepage, published only)
  → POST GitHub repository_dispatch
  → Deploy staging (Metanet) workflow
  → npm run build (fetches Sanity production)
  → FTPS upload of out/ → staging2026.studiojeker.ch
```

### Manual setup required (not automated in this repo)

Do **not** put GitHub tokens in the Next.js app, Studio client code, or git.

#### A) Create a GitHub token for the webhook caller

1. GitHub → **Settings → Developer settings → Personal access tokens**.
2. Prefer a **fine-grained** token limited to `mjeker99-collab/studiojeker-website`:
   - Repository permissions: **Contents: Read and write** (required for `repository_dispatch`)
   - No admin, no secrets write, no other repositories
3. Or a classic PAT with the `repo` scope (broader — less preferred).
4. Store the token only in the Sanity webhook Authorization header (Sanity project UI).
   Rotate if leaked. Never commit it.

#### B) Create the Sanity webhook

In [Sanity Manage](https://www.sanity.io/manage) → project **tgx6e6jg** → **API** → **Webhooks** → Create:

| Setting | Value |
|---------|--------|
| Name | `GitHub staging deploy (homepage)` |
| Dataset | `production` |
| URL | `https://api.github.com/repos/mjeker99-collab/studiojeker-website/dispatches` |
| Method | `POST` |
| Trigger on | Create + Update (and Delete if you want rebuilds on removal) |
| Filter (GROQ) | `!(_id in path("drafts.**")) && _type == "homepage"` |
| Projection | See JSON body below |
| HTTP headers | See below |
| Status | Enabled |

**Projection / body** (must be valid JSON for `repository_dispatch`):

```groq
{
  "event_type": "sanity-homepage-published",
  "client_payload": {
    "documentType": "homepage",
    "documentId": _id,
    "rev": _rev,
    "updatedAt": _updatedAt
  }
}
```

If the Sanity UI expects a projection that returns the webhook payload shape
supported by your Sanity plan, use the equivalent “static” JSON body with the
same `event_type` and `client_payload.documentType: "homepage"`.

**HTTP headers:**

```text
Accept: application/vnd.github+json
Content-Type: application/json
X-GitHub-Api-Version: 2022-11-28
Authorization: Bearer <GITHUB_TOKEN_FROM_STEP_A>
```

#### C) After the webhook exists

1. Merge the workflow PR that listens for `sanity-homepage-published`.
2. In Sanity Studio, publish a harmless Homepage text change.
3. Confirm Actions → **Deploy staging (Metanet)** starts with event `repository_dispatch`.
4. After the job is green, hard-refresh staging and verify the text.
5. Restore the original text, publish again, and confirm a second deploy.

### Expected Publish → Visible delay

Typically **3–8 minutes** (webhook → queue → `npm ci` + build → FTPS mirror).
Concurrency group `deploy-staging-metanet` does not cancel in-progress runs, so
rapid successive publishes queue rather than interrupt.

### Extending later (not in this task)

Add more `repository_dispatch` types (or broaden the GROQ filter) for `about`,
`service`, `project`, `teamMember`, `client`, `globalSettings` when those pages
are fully CMS-driven on staging.

### FTP path notes

The staging FTP account is restricted to `/staging2026.studiojeker.ch`. The workflow
uploads to the FTP **root** (login directory). That root must be the web document
root for `staging2026.studiojeker.ch`.

Host-only file `api/contact.config.php` (if you created one on the server) is
excluded from upload (`--exclude-glob api/contact.config.php`) and never removed
(`mirror -R` runs without `--delete`).

The root `.htaccess` from `out/` is included in every deploy (dotfiles are mirrored).

---

## Technical notes

| Topic | Behaviour |
|-------|-----------|
| Export mode | `output: "export"` in `next.config.ts` |
| Trailing slashes | Enabled (`trailingSlash: true`) → `about/index.html` |
| Images | `images.unoptimized: true` (no Node image optimizer) |
| Contact form | POST to same-origin `/api/contact.php` (PHP on Metanet); optional endpoint override via env |
| Security headers / redirects | `public/.htaccess` (copied into `out/`) — not `next.config` headers/redirects |
| WordPress | Not required for the static marketing site build |

---

## Staging domain

Current deployment target: **staging2026.studiojeker.ch**

Do **not** deploy to `studiojeker.ch` / production unless explicitly instructed.

Protect staging if possible (Plesk directory protection or Cloudflare Access)
and keep staging `noindex` if search engines should ignore it.

---

## Safest next step in Plesk / GitHub

**Preferred after merge to `main`:** push/merge triggers staging deploy automatically;
or run the manual Actions workflow “Deploy staging (Metanet)” with
`confirm_target=staging2026`, then smoke-test.

**Preferred for CMS:** configure the Sanity Homepage webhook (section above), then
Publish in Studio and confirm Actions starts without a manual deploy.

**Manual upload alternative:**

1. Open the subdomain `staging2026.studiojeker.ch` in Plesk.
2. Confirm the document root folder.
3. Upload / sync **only** the contents of the local `out/` directory into that root
   (File Manager or SFTP).
4. Ensure `.htaccess` was uploaded (may be hidden in File Manager — enable
   “Show hidden files”).
5. Confirm PHP is enabled for the subdomain (Plesk default) and that
   `https://staging2026.studiojeker.ch/api/contact.php` responds to GET with
   HTTP 405 JSON (method not allowed) — proves PHP runs.
6. Visit:
   - `https://staging2026.studiojeker.ch/`
   - `https://staging2026.studiojeker.ch/work/`
   - `https://staging2026.studiojeker.ch/en/work/`
   - hard-refresh nested routes (direct reload test)
7. If CSS/JS 404: confirm `_next/` was uploaded completely.

---

## Contact form on Metanet (PHP)

Metanet/Plesk provides **PHP** even when Node.js is unavailable. The static
export therefore keeps the marketing site as HTML/CSS/JS and ships a single
PHP endpoint for form delivery:

| File | Role |
|------|------|
| `out/api/contact.php` | POST-only handler (validation, honeypot, mail) |
| `out/api/contact.config.example.php` | Sample config — copy to `contact.config.php` on the host if you need overrides |
| `out/api/.htaccess` | Blocks HTTP access to `contact.config*.php` |

Behaviour:

- POST JSON (or form-urlencoded) to `/api/contact.php`
- Server-side validation + email checks + honeypot + header-injection stripping
- Soft per-IP rate limit
- Sends mail via PHP `mail()` to `mail@studiojeker.ch` (configurable)
- No secrets in the frontend bundle
- **Not** a `mailto:` solution

Optional host config (after first upload):

```bash
# On the server, inside the document root:
cp api/contact.config.example.php api/contact.config.php
# Edit to / from addresses if needed. Preserve this file across re-uploads.
```

Optional build-time override (rarely needed):

```bash
NEXT_PUBLIC_CONTACT_FORM_ENDPOINT=/api/contact.php
```

Do not put API keys or SMTP passwords in `NEXT_PUBLIC_*` variables.

---

## Related docs

- `SECURITY.md` — application / hosting / Cloudflare / WordPress security split
- `.env.example` — environment variable templates
