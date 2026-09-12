# Legacy URL redirects (WordPress → Next.js)

Permanent **301** redirects for go-live on `studiojeker.ch`.

**Implementation:** Apache `RewriteRule` entries in [`public/.htaccess`](../public/.htaccess)  
(static export cannot use `next.config` `redirects()`).

**Targets** use trailing slashes to match `trailingSlash: true` and avoid a second hop.

Query strings are preserved (`QSA`). Matching is case-insensitive (`NC`) for legacy paths.

Existing files/directories from the static export are not rewritten (so live Next routes stay intact).

**Policy:** A real 404 is better than a thematically wrong 301 to the homepage. Bare unknown `/services/*` and `/solutions/*` paths are not dumped to `/`.

## New site routes (redirect targets)

| Route | Notes |
|-------|--------|
| `/` | Home |
| `/about/` | About |
| `/contact/` | Contact |
| `/work/` | Work |
| `/content-abo/` | Content subscription (DE) |
| `/en/content-subscription/` | Content subscription (EN) |
| `/services/business-communication/` | Service |
| `/services/product-communication/` | Service |
| `/services/architecture/` | Service |
| `/services/digital-marketing/` | Service |
| `/impressum/` | Legal (same path as WordPress) |
| `/datenschutz/` | Privacy (same path as WordPress) |
| `/en/…` | English equivalents of the above |

---

## A) 301 EXACT / THEMATIC

### Same path (no redirect)

| Path | Notes |
|------|--------|
| `/` | Homepage |
| `/impressum/` | Exists on both |
| `/datenschutz/` | Exists on both |

### Interim Next IA + company/contact (from `.htaccess` sections A–B)

Bare `/services/`, `/solutions/`, `/en/services/`, `/en/solutions/` → **intentional 404** (no homepage dump).

| Old | New |
|-----|-----|
| `/solutions/brand-business/` | `/services/business-communication/` |
| `/en/solutions/brand-business/` | `/en/services/business-communication/` |
| `/solutions/products-industry/` | `/services/product-communication/` |
| `/en/solutions/products-industry/` | `/en/services/product-communication/` |
| `/solutions/architecture-real-estate/` | `/services/architecture/` |
| `/en/solutions/architecture-real-estate/` | `/en/services/architecture/` |
| `/solutions/social-digital-marketing/` | `/services/digital-marketing/` |
| `/en/solutions/social-digital-marketing/` | `/en/services/digital-marketing/` |
| `/solutions/sichtbarkeit-im-abo/` | `/content-abo/` |
| `/en/solutions/sichtbarkeit-im-abo/` | `/en/content-subscription/` |
| `/de/content-abo/` | `/content-abo/` |
| `/references/*` | `/work/` |
| `/en/references/*` | `/en/work/` |
| `/kontakt/` | `/contact/` |
| `/team/` | `/about/` |
| `/jobs/` | `/about/` |
| `/fotostudio/` | `/about/` |
| `/mobiles-fotostudio/` | `/about/` |
| `/partners/` | `/about/` |
| `/foteri/` | `/about/` |
| `/content-workshop/` | `/content-abo/` |
| `/newslatter-bestellen/` | `/contact/` |
| `/newsletter-anmeldung/` | `/contact/` |
| `/danke/` | `/contact/` |
| `/privacy-policy/` | `/datenschutz/` |
| `/home-2/` | `/` |

### Service pages + service-context attachments (section C)

Patterns cover `/slug/` and `/slug/…/`. New-site routes use different path segments and are not matched.

| Old | New |
|-----|-----|
| `/businessfotografie/*` | `/services/business-communication/` |
| `/eventfotografie/*` | `/services/business-communication/` |
| `/imagefilm/*` | `/services/business-communication/` |
| `/filmproduktion/*` | `/services/business-communication/` |
| `/produktfotografie/*` | `/services/product-communication/` |
| `/werbefotografie/*` | `/services/product-communication/` |
| `/uhrenfotografie/*` | `/services/product-communication/` |
| `/industriefotografie/*` | `/services/product-communication/` |
| `/produktvideo/*` | `/services/product-communication/` |
| `/3d-animation/*` | `/services/product-communication/` |
| `/3danimation/*` | `/services/product-communication/` |
| `/3d-produktanimation/*` | `/services/product-communication/` |
| `/architekturfotografie/*` | `/services/architecture/` |
| `/architekturvisualisierung/*` | `/services/architecture/` |
| `/drohnenaufnahmen/*` | `/services/architecture/` |
| `/social-media/*` | `/services/digital-marketing/` |
| `/erklarvideos/*` | `/services/digital-marketing/` |
| `/werbespots/*` | `/services/digital-marketing/` |
| `/augmented-reality/*` | `/services/digital-marketing/` |
| `/ar-app/*` | `/services/digital-marketing/` |
| `/metaverse/*` | `/services/digital-marketing/` |

### Categories — thematic only (section D)

| Old | New |
|-----|-----|
| `/category/businessfotografie/` | `/services/business-communication/` |
| `/category/imagefilm/` | `/services/business-communication/` |
| `/category/filmproduktion/` | `/services/business-communication/` |
| `/category/eventfotografie/` | `/services/business-communication/` |
| `/category/produktfotografie/` | `/services/product-communication/` |
| `/category/werbefotografie/` | `/services/product-communication/` |
| `/category/uhrenfotografie/` | `/services/product-communication/` |
| `/category/industriefotografie/` | `/services/product-communication/` |
| `/category/produktvideo/` | `/services/product-communication/` |
| `/category/3d-animation/` | `/services/product-communication/` |
| `/category/3d-produktanimation/` | `/services/product-communication/` |
| `/category/architekturfotografie/` | `/services/architecture/` |
| `/category/visualisierung/` | `/services/architecture/` |
| `/category/drohnenaufnahmen/` | `/services/architecture/` |
| `/category/erklarvideos/` | `/services/digital-marketing/` |
| `/category/werbespots/` | `/services/digital-marketing/` |
| `/category/ar-app/` | `/services/digital-marketing/` |

---

## B) 301 PORTFOLIO / TAG CONSOLIDATION

### Portfolio structures + references

| Old | New |
|-----|-----|
| `/project/` | `/work/` |
| `/projects/` | `/work/` |
| `/referenzen/` | `/work/` |
| `/references/*` | `/work/` |
| `/en/references/*` | `/en/work/` |

### All 25 portfolio / showreel posts → `/work/` (section E)

- `/titoni/`
- `/titoni-seascoper/`
- `/arthur-flury-ag/`
- `/sphinx-tools-medical/`
- `/metalldruckerei/`
- `/hotel-wellenberg/`
- `/digmesa/`
- `/certina/`
- `/optotech/`
- `/sanitized-comfort/`
- `/bijoux-stadelmann/`
- `/ccm-erklarvideo/`
- `/thai-suppe/`
- `/fit-werkstattwagen/`
- `/jura-impressa-j9/`
- `/aerial-drohnen-showreel/`
- `/produktfotografie-showreel/`
- `/architekturfotografie-showreel/`
- `/stromwatches/`
- `/agathon-dom-plus/`
- `/event-showreel/`
- `/endress-hauser/`
- `/heiniger-produktanimation/`
- `/magiclens-ar-app/`
- `/magic-lens-demo/`

### All 24 WordPress tags → `/work/` (section F)

- `/tag/agathon/`
- `/tag/arthur-flury-ag/`
- `/tag/bijoux-stadelmann/`
- `/tag/ccm/`
- `/tag/certina-spot/`
- `/tag/digmesa-nano-flowmeter/`
- `/tag/endresshauser/`
- `/tag/fit-werkstattwagen/`
- `/tag/hamilton/`
- `/tag/heiniger-ag/`
- `/tag/hotel-wellenberg/`
- `/tag/johann-eichler-ag/`
- `/tag/jura/`
- `/tag/magic-lens/`
- `/tag/n-a/`
- `/tag/optotech-deboxer/`
- `/tag/rado/`
- `/tag/sanitized/`
- `/tag/sanitized-produktfilm/`
- `/tag/sphinx-tools-medical/`
- `/tag/stromwatches/`
- `/tag/takeda-medical-campus/`
- `/tag/thai-suppe/`
- `/tag/titoni/`

Reason: tags mostly name former clients / products / portfolio themes; `/work/` is the shared successor. Explicit rules; new site has no `/tag/` routes.

---

## C) INTENTIONAL 404

**NO MEANINGFUL TARGET / INTENTIONAL 404** — no homepage dump:

| Path / class | Reason |
|--------------|--------|
| `/suche/` | Utility removed; no thematic successor |
| `/sitemap/` | Utility removed; no thematic successor |
| Bare `/services/`, `/solutions/` (+ EN) | Unknown / non-thematic roots |
| Unknown `/services/*`, `/solutions/*` beyond the known interim map | No clear successor |
| `/category/ar/` | Empty / not clearly mappable to one service |
| `/category/uncategorized/` | Technical archive; not mapped to a service |
| `/author/flutura-admin/` | No author / about successor |
| Attachment pages **without** service parent context (e.g. `/team/…`, `/partners/…`, orphan media slugs, `/portfolio-komplett/`) | No meaningful content successor |
| `/wp-admin/`, `/wp-json/`, `/wp-content/`, feeds, `xmlrpc.php` | Obsolete platform paths |

---

## D) PENDING / MANUAL REVIEW

| Item | Status |
|------|--------|
| `/agb_studiojeker_2015/` | **PENDING NEW AGB PAGE** — no AGB route on the new site yet; do not redirect to an arbitrary page |
| Soft `/about/` mappings (`/jobs/`, `/partners/`, `/foteri/`) | Acceptable company fallback; revisit if a careers/partners page is added |
| Portfolio equity on `/work/` | V1 has no case-study routes; 1:1 post URLs may be added later |
| External backlink priority list | No GSC/Ahrefs export in repo; re-check after Search Console data is available |
| Live Apache confirmation | Rule simulator passes; confirm real 301→200 on staging/production host after deploy |

---

## Quality guarantees

- No duplicate RewriteRule patterns
- No redirect loops
- No redirect chains (legacy → final Next target in one hop)
- New routes (`/`, `/about/`, `/contact/`, `/work/`, `/content-abo/`, `/services/…`, `/impressum/`, `/datenschutz/`, `/en/…`) are not matched by legacy rules
- Query strings preserved via `QSA`
- Homepage fallbacks removed except the approved `/home-2/` → `/`

---

## Metrics (inventory vs matrix)

Counts from live WordPress REST/sitemaps + interim IA paths (verification pass):

| Metric | Count |
|--------|------:|
| Old URLs found (editorial + tags + cats + author + interim IA + ~461 attachments) | **568** |
| Covered with 301 (service parents+attachments, pages, posts, thematic cats, tags, interim IA, `/home-2/`, `/project/`) | **~320+** |
| Intentional 404 (`/suche/`, `/sitemap/`, bare services/solutions, empty cats, author, non-service attachments, platform paths) | **~240+** |
| Still unclear / pending | **1+** (`/agb_studiojeker_2015/` primary; soft about mappings noted above) |
| Redirect chains in rule set | **0** |
| Conflicts with new routes | **0** |

**Apache `R=301` rules in `public/.htaccess`:** 116 (explicit; includes 24 tags + 25 portfolio posts + service parent wildcards).
