# Studiojeker — Sanity CMS scaffold

Version 1.0

---

## Status

Sanity is scaffolded for future headless content (Work, texts, images).

- Project ID: `tgx6e6jg`
- Dataset: `production`
- Studio: standalone folder `studio/` (Variante A)
- Marketing site: still **Next.js static export** → Metanet `/out`

**Homepage migration:** see `docs/SANITY_HOMEPAGE_MIGRATION.md` and
`npm run sanity:migrate-homepage` (requires `SANITY_API_WRITE_TOKEN`).

**Not done yet:** other `lib/content/*` pages, wiring marketing pages to Sanity,
embedding Studio in Next.

---

## Local Studio

```bash
npm run sanity:install   # first time
npm run sanity:dev
```

URL: http://localhost:3333

Studio is **not** included in `npm run build` / `/out` / Metanet FTPS deploy.

---

## Environment

See `.env.example`:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (optional, server-only)
- `SANITY_API_WRITE_TOKEN` (migration scripts only — server-only)

---

## Related

- `docs/SANITY_HOMEPAGE_MIGRATION.md` — DE Homepage → Sanity field mapping
- `docs/METANET_STATIC_DEPLOYMENT.md` — static hosting (unchanged)
- `lib/wordpress/*` — previous CMS stubs (kept; not removed)
