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

1. Edit the site in Cursor (design stays locked unless intentionally changed).
2. Commit and push to GitHub.
3. Deploy staging with the **manual** GitHub Actions workflow (see below), **or**
   build locally (`npm ci && npm run build`) and upload **contents of `out/`** via SFTP.
4. Smoke-test `https://staging2026.studiojeker.ch/` (and EN routes).
5. When approved, repeat for production in a **separate, explicit** step — never automatic.

---

## GitHub Actions — manual staging deploy

Workflow file: `.github/workflows/deploy-staging.yml`

### What it does

- Trigger: **`workflow_dispatch` only** (Actions → “Deploy staging (Metanet)” → Run workflow)
- Does **not** run on push, pull request, or schedule
- Builds with Node.js **22 LTS** → `npm ci` → `npm run build`
- Fails if `out/` (or `out/index.html` / `out/api/contact.php`) is missing
- Uploads **only the contents of `out/`** to the staging FTP account via FTPS
  (`protocol: ftps`, `security: strict` — TLS certificate verification enabled)
- Includes hidden files from `out/`, especially **`out/.htaccess`** (verified before upload)
- Does **not** upload source, `.git`, `node_modules`, docs, env files, or workflows
- Does **not** deploy to production / `studiojeker.ch`

### Safety confirmation

When starting the workflow you must type exactly:

```text
staging2026
```

in the `confirm_target` input. Any other value aborts the job.

### Required GitHub secrets

Repository → **Settings → Secrets and variables → Actions**. Create:

| Secret | Purpose |
|--------|---------|
| `METANET_FTP_SERVER` | FTP hostname from Plesk (e.g. `ftp.…` or the Metanet FTP server) |
| `METANET_FTP_USERNAME` | Staging FTP user (jailed to `/staging2026.studiojeker.ch`) |
| `METANET_FTP_PASSWORD` | Staging FTP password |

Never commit FTP credentials. Never reuse production FTP credentials here.

### How to run

1. Merge or push the branch you want on staging (usually `main` after review).
2. Open **Actions** → **Deploy staging (Metanet)**.
3. Click **Run workflow**.
4. Choose the branch to build from.
5. Set `confirm_target` to `staging2026`.
6. Run and wait for a green job.
7. Smoke-test `https://staging2026.studiojeker.ch/` (including `/api/contact.php` GET → 405).
8. Confirm `.htaccess` is present at the staging FTP/document root (Plesk File Manager → show hidden files).

### FTP path notes

The staging FTP account is restricted to `/staging2026.studiojeker.ch`. The workflow
therefore uploads to the FTP **root** (`server-dir: ./`). That root must be the
web document root for `staging2026.studiojeker.ch`.

Host-only file `api/contact.config.php` (if you created one on the server) is
listed in the workflow `exclude` list so FTPS sync does not delete it.

The exclude globs (`**/.git*`, etc.) do **not** match `.htaccess`; the root
`.htaccess` from `out/` is part of the deploy set.

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

**Preferred (after secrets are set):** run the manual Actions workflow
“Deploy staging (Metanet)” with `confirm_target=staging2026`, then smoke-test.

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
