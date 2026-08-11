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
3. On a machine with Node.js: `npm install && npm run build`.
4. Upload **contents of `out/`** to the staging document root in Plesk.
5. Smoke-test `https://staging2026.studiojeker.ch/` (and EN routes).
6. When approved, repeat the upload to production (separate step — not automatic).

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

## Safest next step in Plesk

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
