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
| Contact form | Client-side validation; posts to `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` when set, otherwise `mailto:` fallback |
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
5. Visit:
   - `https://staging2026.studiojeker.ch/`
   - `https://staging2026.studiojeker.ch/work/`
   - `https://staging2026.studiojeker.ch/en/work/`
   - hard-refresh nested routes (direct reload test)
6. If CSS/JS 404: confirm `_next/` was uploaded completely.

---

## Optional contact delivery on static hosting

Set at **build time** (baked into the client bundle):

```bash
NEXT_PUBLIC_CONTACT_FORM_ENDPOINT=https://your-form-webhook.example/…
```

Use a HTTPS form backend (Formspree, Basin, custom webhook, etc.).
Do not put secret API keys in `NEXT_PUBLIC_*` variables.

---

## Related docs

- `SECURITY.md` — application / hosting / Cloudflare / WordPress security split
- `.env.example` — environment variable templates
