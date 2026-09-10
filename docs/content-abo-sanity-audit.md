# /content-abo: Sanity audit and scoped repair

Base: `main` at `438f0cecc6c3e0adc6986a0d52d8a58950802ee9`, inspected 2026-09-10.

## Rendering and field inventory

`app/content-abo/page.tsx` resolves German content via
`lib/content/abo-sanity.ts`, renders `AboLandingPageLive` → `AboLandingPage`,
and uses the existing shared `ShowreelSection`. `SiteChrome` supplies the
unchanged header, footer and client-logo integration.

The Studio singleton is **Content Abo**, `_type: abo`, `_id: abo`, project
`tgx6e6jg`, dataset `production`. `studio/structure.ts` opens that exact ID.
`studio/schemaTypes/abo.ts` defines its fields; `shared.ts` supplies localized
text, CTA and image/video objects. There is no separate German Abo document.

| Existing page content | Studio field path | Frontend content path |
| --- | --- | --- |
| Hero eyebrow, headline, body | `heroSection.label/headline/text.de` | `hero.label/headline/body` |
| Hero CTA | `heroSection.cta.label.de`, `.href` | `hero.primaryCta` |
| Hero image and alt | `heroSection.media.image`, `.image.alt` | `hero.media` |
| Intro eyebrow, headline, paragraphs, highlighted statement | `problemSection.label/headline/text/highlight.de` | `problem.label/headline/body/highlight` |
| Four benefits | `benefitsSection.items[].id/title.de/description.de/sortOrder` | `benefits.items` |
| Process heading | `processSection.headline.de` | `process.headline` |
| All four process steps | `processSection.steps[].number/title.de/description.de` | `process.steps` |
| Scope heading, intro, list, closing and budget statement | `scopeSection.headline/introduction/items[].label/closing/highlight` (localized `.de`) | `scope` |
| Showreel eyebrow, heading, text and CTA | `showreelSection.label/headline/text/cta` | `showreel` |
| Showreel still / video poster / Vimeo source | `showreelSection.media.image/poster/vimeoUrl/mediaType` | `showreel.media/videoId` |
| Closing eyebrow, heading, text and CTA | `closingSection.label/headline/text/cta` | `closing` |
| SEO title, description, social image | `seoSection.title.de/description.de/ogImage` | `seo` |

All these rendered fields were already present in the current schema, query and
merge before this repair, and all visible copy plus hero/showreel assets were
present in the published `abo` document. No field-name mismatch was found.
The intro and scope sections on this base contain **no separate image or CTA**.
No such blocks were invented or added. The shared media schema also exposes a
mobile video poster, but this page currently renders one poster at all sizes;
the published mobile poster is null. Existing image fields support crop/hotspot;
hero/image/poster alt text is already exposed.

## Findings and changes

- The long hero headline is the actual published `heroSection.headline.de`
  value, not a shorter CMS value overridden by the frontend. Editing this field
  to a shorter existing/approved wording is covered by a regression test. No
  editorial replacement was published or invented in this PR.
- The hero accepted the shared video mode despite rendering only a still image.
  The old resolver could prefer an old video poster or local fallback over the
  newly selected image. German hero resolution now prefers an actual image
  asset; poster-only existing content remains intact. The Abo schema labels and
  warning explain the supported selection. Shared media schemas are unchanged.
- Focus, visibility and interval refreshes could overlap. An old request could
  finish last and revert a newer result. `/content-abo` now aborts the superseded
  request, checks request order even if cancellation is ignored, times out after
  15 seconds, and ignores responses after unmount. Errors, malformed JSON,
  missing documents and non-`abo` IDs retain the last successful content.
- `lib/content/abo-page.ts` holds the complete local fallback copy, local image
  path and Vimeo ID. These were already defaults, not unconditional rendered
  content. Nonempty published values win. Missing/empty textual fields retain
  existing fallback behavior; this PR does not add section-removal controls.
- The English route retains its existing refresh and media-resolution behavior.
  No CSS, rendering markup, global components, image files or deployment files
  are changed.

## Query, publishing and limitations

`aboQuery` in `lib/sanity/abo.ts` and the mirrored query in
`public/api/abo-page.php` are unchanged: both select the exact `abo` ID and
project all existing rendered fields and image metadata. The server client uses
`perspective: published` and `useCdn: false`. The PHP endpoint uses Sanity's live
API and no-store response headers. Neither query selects `drafts.abo`.

This is a Next.js **static export**, so ISR is not the update mechanism.
`getResolvedAboContent` memoizes within rendering; published content is baked
into HTML/SEO on deployment and refreshed through the same-origin PHP endpoint.

The existing workflow already accepts `sanity-abo-published` and the generic CMS
event, accepts document type `abo`, builds current `main` for CMS events, checks
the exported Abo PHP endpoint and deploys to staging. No infrastructure change is
needed for these code paths. A successful current-main `repository_dispatch`
run was observed at
https://github.com/mjeker99-collab/studiojeker-website/actions/runs/34452351050
(this alone does not prove it was triggered by an Abo edit).

Staging returned HTTP 401 and the hosted Studio required login during the audit.
Consequently the deployed Studio schema version, draft state, configured Sanity
webhook filter/delivery history and an actual Abo publish-to-staging round trip
could not be verified. The failure modes above are reproduced in tests; they
are not claimed as the confirmed cause of a particular inaccessible Studio edit.

The PR is not a deployment. After merge by the owner, the normal main workflow
deploys the frontend. The schema's labels/warning also require the existing
separate Studio deployment (`studio/` is not deployed in Next's `out/`).
An authenticated acceptance check should edit the German headline and swap an
existing hero asset, publish, verify the live page and subsequent exported HTML,
then restore the chosen content as appropriate. No test content was written to
the live dataset during this work.

## Verification

- PASS: Root ESLint and TypeScript checks.
- PASS: Next.js production build/static export.
- PASS: Studio TypeScript check and production build. The local CLI reported
  a missing optional terminal-size binary; compilation still completed normally.
  The locked Studio dependency installation reported existing deprecations;
  dependency manifests and lockfiles were not changed.
- `scripts/test-content-abo.ts`: every rendered section's text/CTA mapping,
  process numbers, image/alt/crop handling, short headline, hero mode mismatch,
  missing-data fallback, English isolation, out-of-order and failed refreshes,
  wrong IDs/drafts, cleanup.
- Existing `scripts/test-abo-merge.ts`: live published singleton and media merge.
- PASS: Both Abo test scripts above.
- PASS: Exported `/content-abo` main HTML is byte-identical to the untouched
  baseline (11,235 characters). Desktop and mobile browser inspection retained
  both loaded images, with no horizontal overflow at a 390px viewport and no
  captured browser console errors. Staging acceptance remains access-dependent.
