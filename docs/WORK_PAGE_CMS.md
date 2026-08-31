# Work Page — CMS & Frontend

## Overview

The Work page (`/work`, `/en/work`) shows visual work samples grouped by four service areas. Each area is managed independently in Sanity. Work items are not case studies — they are slideshows, videos, or single images with a short label.

## Sanity Schema

| Document / Type | File | Purpose |
|-----------------|------|---------|
| `work` (singleton, id: `work`) | `studio/schemaTypes/work.ts` | Hero, four categories, final CTA, SEO |
| `workCategory` | `studio/schemaTypes/shared.ts` | Service area with unlimited `items[]` |
| `workProjectItem` | `studio/schemaTypes/shared.ts` | One work sample (label, media, order, active) |
| `workMediaField` | `studio/schemaTypes/shared.ts` | Image, video, or slideshow payload |

### Work item fields

- **active** — hide on website when `false` (data kept in CMS)
- **title** (`localizedString`) — visible label under the tile
- **caption** — optional; reserved for future use
- **media** — `workMediaField`
- **sortOrder** — drag order in Studio

### Media types

| Type | CMS fields | Frontend |
|------|------------|----------|
| **Einzelbild** | `image` + alt | Tile + optional lightbox on click |
| **Video** | Vimeo URL, optional YouTube URL, optional external/uploaded file, poster, autoplay/loop/muted | Poster + play icon; lightbox with embed or `<video>` |
| **Slideshow** | Unlimited `slideshowImages[]` (alt, optional caption per slide), interval | In-tile auto-advance, hover pause, swipe, dots |

No limit on the number of work items per category.

## Studio navigation

`studio/structure.ts` — **Work** expands to:

1. Page (Hero, CTA, SEO)
2. Digital / Social Media Marketing
3. Business Communication
4. Product Communication
5. Architecture & Real Estate

Each area opens the same Work singleton; edit the matching category block under **Categories & Tiles**.

List previews show **title**, **type**, **thumbnail**, and **Active/Inactive**.

## Frontend

| File | Role |
|------|------|
| `components/work/WorkPage.tsx` | Page layout, category grids |
| `components/work/ProjectMediaCard.tsx` | Tile media (slideshow / video lightbox / image lightbox) + label |
| `components/work/WorkPageLive.tsx` | Live Sanity refresh on staging |
| `lib/content/merge-sanity-work.ts` | Sanity → frontend merge; filters inactive items |
| `lib/content/work-page.ts` | Local fallback when CMS unavailable |
| `public/api/work-page.php` | Same-origin proxy for live updates (Metanet static export) |

Tiles do **not** link to service pages.

## Live updates

Same pattern as Homepage and Contact:

1. Build bakes Sanity into static HTML.
2. `WorkPageLive` fetches `/api/work-page.php` on load, focus, and tab visibility.
3. PHP reads Sanity live API (`useCdn: false` equivalent).

After publishing in Sanity Studio, changes appear on staging within seconds without redeploy.

## Migration

`scripts/migrate-work-page.mjs` — seeds the Work singleton **only if it does not exist**. Re-running does not overwrite existing data.

To add example Business Communication items, create them in Studio under the **business** category.

## Deploy

After schema changes:

1. Deploy Sanity Studio (`studio/` — existing project workflow).
2. Redeploy Next.js static export so build-time HTML and `/api/work-page.php` stay in sync.

No Homepage, Service, About, or Contact schemas were changed.
