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

### Contact form (`POST /api/contact`)

Replaces insecure `mailto:` form submission.

| Control | Implementation |
|---------|----------------|
| Method | `POST` only (`GET`/`PUT`/`DELETE` → 405) |
| Validation | Server-side (`lib/security/contact.ts`) |
| Max lengths | name 120, company 160, email 254, phone 40, message 4000 |
| Sanitization | Control characters stripped (header-injection safe) |
| Honeypot | Hidden `website` field; bots get a fake success |
| Errors | Generic `{ ok: false, error: "request_failed" }` — no stack/paths |
| Soft rate limit | In-process: 8 requests / IP / 15 minutes |
| Turnstile ready | Accepts `turnstileToken`; verifies only if `TURNSTILE_SECRET_KEY` is set |
| Delivery | Optional `CONTACT_FORM_WEBHOOK_URL` (server-side POST) |

Wire a real mail/webhook endpoint before production go-live
(`CONTACT_FORM_WEBHOOK_URL`). Until then, validated submissions succeed in
non-broken UX but are not emailed unless the webhook is configured.

### Error handling

- `app/error.tsx` and `app/global-error.tsx` show generic messages only.
- Production responses must not expose stack traces, filesystem paths,
  environment variables, or infrastructure details.

### Rate-limit locations (app + edge)

| Endpoint / surface | App-level today | Recommended production |
|--------------------|-----------------|------------------------|
| `POST /api/contact` | Soft in-memory limiter | Cloudflare Rate Limiting / WAF |
| Future `/api/*` | Add same helper | Cloudflare per-route rules |
| Future auth endpoints | None yet | Cloudflare + app lockout |

Do **not** set aggressive limits that block legitimate users.
Suggested Cloudflare starting point for contact: e.g. **10 requests / minute / IP**
with challenge after threshold (tune after observing traffic).

---

## B) Hosting / server security — configure on Metanet

- Serve **HTTPS only** for `www.studiojeker.ch` (and apex redirect → www or vice versa, consistently).
- TLS 1.2+ only; disable weak ciphers.
- Keep OS / Node / reverse-proxy packages patched.
- Run the Node process as a non-root user.
- Firewall: allow only 80/443 (and SSH from trusted IPs).
- Do not expose WordPress admin or database ports publicly beyond necessity.
- Set production env vars on the host (never commit secrets):
  - `WORDPRESS_API_BASE_URL=https://…`
  - `CONTACT_FORM_WEBHOOK_URL=https://…`
  - `TURNSTILE_SECRET_KEY=…` (server only)
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY=…` (only when Turnstile UI is enabled)
  - `NEXT_PUBLIC_SITE_URL=https://www.studiojeker.ch`
- Separate **staging** and **production** credentials and CMS instances.
- Process supervisor / restart policy for `next start` (or equivalent).
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
5. **Rate limiting** on `/api/contact` (and future APIs).
6. **Bot Fight / Super Bot Fight** carefully — avoid blocking real clients.
7. **Turnstile** on the contact form (app already prepared).
8. **Cache** static `/_next/static/*` aggressively; bypass cache for `/api/*`.
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
- Use distinct WordPress + webhook credentials.

---

## Remaining production checklist (short)

1. Set `CONTACT_FORM_WEBHOOK_URL` (or equivalent mail relay).
2. Optionally enable Cloudflare Turnstile (site key + secret).
3. Put Cloudflare (or equivalent) rate limits on `/api/contact`.
4. Enable production HSTS at the edge.
5. Point `WORDPRESS_API_BASE_URL` at HTTPS CMS when ready.
6. Confirm CSP still allows all approved embeds after CMS media goes live;
   extend allow-lists explicitly in `lib/security/headers.ts`.

---

## Dependency stance

- No major-version upgrades performed in this pass.
- Stack: Next `16.3.0`, React `19.2.8`.
- Re-run `npm audit` before each production release; fix high/critical
  issues that do not require breaking upgrades. Report breaking upgrades
  instead of applying them blindly.
