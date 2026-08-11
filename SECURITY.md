# Studiojeker Website — Security

Version 1.0  
Scope: Next.js frontend application (`studiojeker-website`)

This document separates **application security already implemented** from
**hosting / Cloudflare / WordPress** tasks that must be configured outside
this repository.

Security changes must not alter the approved visual design.

---

## A) Application security — already implemented

### HTTP security headers (`next.config.ts` + `lib/security/headers.ts`)

Applied globally to `/:path*`:

| Header | Value / intent |
|--------|----------------|
| `Content-Security-Policy` | Tight allow-list; no `default-src *`, no `script-src *`, no `unsafe-eval` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, mic, geo, payment, USB disabled |
| `X-Frame-Options` | `DENY` (clickjacking) |
| CSP `frame-ancestors` | `'none'` (clickjacking) |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-DNS-Prefetch-Control` | `off` |

**CSP notes**

- Scripts/styles: `'self' 'unsafe-inline'` — required by the current Next.js
  App Router inline bootstrapping. Prefer a **nonce-based CSP** later
  (middleware → `nonce` on scripts) without relaxing host wildcards.
- Frames: `https://player.vimeo.com` and `https://vimeo.com` only.
- Images: `'self'`, `data:`, `blob:`, `https://i.vimeocdn.com`, plus the
  configured WordPress HTTPS hostname when `WORDPRESS_API_BASE_URL` is set.
- `form-action 'self'` — contact posts to `/api/contact` only.
- To whitelist additional approved media later, extend
  `lib/security/headers.ts` / `securityAllowlists` explicitly.
  Do **not** open `*` hosts.

**HSTS** is **not** set by the Next.js app (preview / tunnel safe).
Enable HSTS only on production HTTPS at the edge — see section C.

### Next.js production hardening

- `poweredByHeader: false` — hides `X-Powered-By: Next.js`
- `productionBrowserSourceMaps: false`
- WordPress remote images: **HTTPS only** (HTTP remote patterns removed)
- `WORDPRESS_API_BASE_URL` is server-only (never `NEXT_PUBLIC_*`)
- `getWordpressStatus()` no longer returns the CMS base URL to the UI
- No hardcoded API keys / secrets in client bundles
- Dependencies are minimal: `next`, `react`, `react-dom` (+ eslint/typescript as
  devDependencies). No unused production packages found to remove.

### Contact form

Static Metanet deployment has **no** Next.js API routes. Form delivery uses a
minimal same-origin PHP endpoint that Apache executes on Metanet/Plesk.

| Control | Implementation |
|---------|----------------|
| Client validation | `lib/security/contact.ts` (max lengths + honeypot) |
| Server validation | `public/api/contact.php` (POST only, email checks, honeypot, header-injection stripping, soft rate limit) |
| Delivery | PHP `mail()` to configured inbox (`contact.config.php` or safe defaults) |
| Frontend endpoint | `/api/contact.php` (optional `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` override) |
| Secrets | Not in `NEXT_PUBLIC_*`; config file blocked by `public/api/.htaccess` |
| Turnstile | Slot reserved; enable with public site key + CSP updates in `.htaccess` |

There is **no** `mailto:` form submission path.

### Error handling

- `app/error.tsx` and `app/global-error.tsx` show generic messages only.
- Production responses must not expose stack traces, filesystem paths,
  environment variables, or infrastructure details.
- PHP contact errors return generic JSON codes (`invalid`, `rate_limited`, …)
  without internal details.

### Rate-limit locations (edge)

| Endpoint / surface | Static hosting | Recommended production |
|--------------------|----------------|------------------------|
| `/api/contact.php` | Soft PHP per-IP limit | Cloudflare Rate Limiting / WAF in front of `/api/*` |
| Future APIs | N/A on static host | Cloudflare per-route rules |

Do **not** set aggressive limits that block legitimate users.

### Static export note

Security headers and legacy redirects for Apache live in `public/.htaccess`
(copied into `/out`). Keep CSP allow-lists aligned with
`lib/security/headers.ts` when editing.
---

## B) Hosting / server security — configure on Metanet

- Serve **HTTPS only** for `www.studiojeker.ch` (and apex redirect → www or vice versa, consistently).
- TLS 1.2+ only; disable weak ciphers.
- Keep OS / PHP / Apache packages patched (marketing site is static + PHP contact).
- Firewall: allow only 80/443 (and SSH from trusted IPs).
- Do not expose WordPress admin or database ports publicly beyond necessity.
- Confirm PHP is enabled for the site and that `api/contact.config.php` (if used)
  is not publicly readable (blocked via `api/.htaccess`).
- Optional host-only file: `api/contact.config.php` (copy from example; preserve across deploys).
- Build-time public vars only when needed:
  - `NEXT_PUBLIC_SITE_URL=https://www.studiojeker.ch`
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY=…` (only when Turnstile UI is enabled)
- Separate **staging** and **production** mail / CMS credentials.
- Log rotation; avoid logging full contact message bodies in shared logs.

### Recommended production HSTS (edge or origin — pick one place)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Enable **preload** only after confirming HTTPS works for all subdomains
you intend to include, and after submitting to the HSTS preload list
intentionally. Do **not** enable preload on preview / staging hosts.

---

## C) Cloudflare security — optional / recommended

Useful in front of Metanet for `studiojeker.ch`:

1. **SSL/TLS**: Full (strict) with a valid origin certificate.
2. **Always Use HTTPS** + automatic HTTPS rewrites.
3. **HSTS** via Cloudflare (preferred over app-level for preview safety).
4. **WAF** managed ruleset (OWASP).
5. **Rate limiting** on `/api/contact.php` (and future APIs).
6. **Bot Fight / Super Bot Fight** carefully — avoid blocking real clients.
7. **Turnstile** on the contact form (app already prepared).
8. **Cache** static `/_next/static/*` aggressively; **bypass cache for `/api/*`**.
9. Restrict **Admin / staging** hostnames with Cloudflare Access if used.
10. Enable **email obfuscation** only if it does not break intentional
    `mailto:` links (public email is already shown as a link).

---

## D) WordPress / CMS security — configure later

When the headless WordPress CMS goes live:

- Keep WP on a dedicated HTTPS host (e.g. `cms.…`), not the public marketing origin if possible.
- Strong admin passwords + 2FA; limit `/wp-admin` by IP or Cloudflare Access.
- Disable XML-RPC if unused; remove unused plugins/themes.
- Keep WordPress, PHP, plugins updated.
- REST API: expose only required CPTs/fields; authenticate private routes.
- Do not put WP Application Passwords or DB credentials in the Next.js
  frontend. Use server-only env vars.
- Media uploads: restrict MIME types and max size; serve over HTTPS.
- Separate staging CMS; never point production Next.js at a public staging CMS
  without auth.
- Regular offline backups of WP database + uploads (see below).

---

## Backups

| Asset | Recommendation |
|-------|----------------|
| Next.js app / git | GitHub is source of truth; tag releases |
| WordPress DB | Daily automated dump; retain ≥ 14 days |
| WP uploads | Daily sync / snapshot |
| Env / secrets | Secure vault or host secret store (not git) |
| Restore test | Quarterly restore drill on staging |

---

## Staging-site protection

- Basic auth or Cloudflare Access in front of staging.
- `robots.txt` / meta robots `noindex` on staging.
- Separate `NEXT_PUBLIC_SITE_URL` so staging never emits production
  canonicals incorrectly (production build already prefers
  `https://www.studiojeker.ch` when env is localhost/tunnel).
- Do not enable HSTS preload on staging.
- Use distinct WordPress credentials; keep staging contact config separate if needed.

---

## Remaining production checklist (short)

1. Confirm `/api/contact.php` delivers mail on staging (PHP `mail()` / Metanet mail).
2. Optionally copy `api/contact.config.example.php` → `api/contact.config.php` and adjust addresses.
3. Optionally enable Cloudflare Turnstile (site key + secret).
4. Put Cloudflare (or equivalent) rate limits on `/api/contact.php`.
5. Enable production HSTS at the edge.
6. Point `WORDPRESS_API_BASE_URL` at HTTPS CMS when ready.
7. Confirm CSP still allows all approved embeds after CMS media goes live;
   extend allow-lists explicitly in `lib/security/headers.ts`.

---

## Dependency stance

- No major-version upgrades performed in this pass.
- Stack: Next `16.3.0`, React `19.2.8`.
- Re-run `npm audit` before each production release; fix high/critical
  issues that do not require breaking upgrades. Report breaking upgrades
  instead of applying them blindly.
