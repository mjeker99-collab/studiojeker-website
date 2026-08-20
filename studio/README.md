# Studiojeker — Sanity Studio

Standalone Sanity Studio for project **tgx6e6jg** / dataset **production**.

This folder is **not** part of the Next.js static export (`/out`) and is **not**
uploaded to Metanet/Plesk staging.

## Local

```bash
# from repo root
npm run sanity:dev

# or
cd studio && npm run dev
```

Open: http://localhost:3333

## Deploy Studio (Sanity hosting — not Metanet)

```bash
npm run sanity:deploy
```

## CORS

In [Sanity Manage](https://www.sanity.io/manage/project/tgx6e6jg/api) add CORS
origins for local Studio and later preview URLs, e.g.:

- `http://localhost:3333`
- `http://localhost:3000`

Use **`http://localhost:3333`** for local Studio. `http://127.0.0.1:3333` is a
different origin and currently receives CORS 403 unless explicitly added — do
not rely on it for development.
