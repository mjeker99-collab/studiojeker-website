# Legacy URL redirects (WordPress → Next.js)

Permanent **301** redirects for go-live on `studiojeker.ch`.

**Implementation:** Apache `RewriteRule` entries in [`public/.htaccess`](../public/.htaccess)  
(static export cannot use `next.config` `redirects()`).

**Targets** use trailing slashes to match `trailingSlash: true` and avoid a second hop.

Query strings are preserved (`QSA`). Matching is case-insensitive (`NC`) for legacy paths.

Existing files/directories from the static export are not rewritten (so live Next routes stay intact).

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

## Already covered (interim Next IA)

| Old | New |
|-----|-----|
| `/services/` | `/` |
| `/solutions/` | `/` |
| `/solutions/brand-business/` | `/services/business-communication/` |
| `/solutions/products-industry/` | `/services/product-communication/` |
| `/solutions/architecture-real-estate/` | `/services/architecture/` |
| `/solutions/social-digital-marketing/` | `/services/digital-marketing/` |
| `/solutions/sichtbarkeit-im-abo/` | `/content-abo/` |
| `/en/solutions/…` | matching `/en/services/…` or `/en/content-subscription/` |
| `/references/` (+ subpaths) | `/work/` |
| `/en/references/` (+ subpaths) | `/en/work/` |
| `/de/content-abo/` | `/content-abo/` |

## WordPress pages → new site

| Old (`www.studiojeker.ch`) | New |
|----------------------------|-----|
| `/kontakt/` | `/contact/` |
| `/team/` | `/about/` |
| `/jobs/` | `/about/` |
| `/fotostudio/` | `/about/` |
| `/mobiles-fotostudio/` | `/about/` |
| `/partners/` | `/about/` |
| `/foteri/` | `/about/` |
| `/referenzen/` | `/work/` |
| `/projects/` | `/work/` |
| `/businessfotografie/` | `/services/business-communication/` |
| `/eventfotografie/` | `/services/business-communication/` |
| `/imagefilm/` | `/services/business-communication/` |
| `/filmproduktion/` | `/services/business-communication/` |
| `/produktfotografie/` | `/services/product-communication/` |
| `/werbefotografie/` | `/services/product-communication/` |
| `/uhrenfotografie/` | `/services/product-communication/` |
| `/industriefotografie/` | `/services/product-communication/` |
| `/produktvideo/` | `/services/product-communication/` |
| `/3d-animation/` | `/services/product-communication/` |
| `/3danimation/` | `/services/product-communication/` |
| `/3d-produktanimation/` | `/services/product-communication/` |
| `/architekturfotografie/` | `/services/architecture/` |
| `/architekturvisualisierung/` | `/services/architecture/` |
| `/drohnenaufnahmen/` | `/services/architecture/` |
| `/social-media/` | `/services/digital-marketing/` |
| `/erklarvideos/` | `/services/digital-marketing/` |
| `/werbespots/` | `/services/digital-marketing/` |
| `/augmented-reality/` | `/services/digital-marketing/` |
| `/ar-app/` | `/services/digital-marketing/` |
| `/metaverse/` | `/services/digital-marketing/` |
| `/content-workshop/` | `/content-abo/` |
| `/newslatter-bestellen/` | `/contact/` |
| `/newsletter-anmeldung/` | `/contact/` |
| `/danke/` | `/contact/` |
| `/privacy-policy/` | `/datenschutz/` |
| `/suche/` | `/` |
| `/sitemap/` | `/` |

## Same path on old and new (no redirect)

| Path | Notes |
|------|--------|
| `/impressum/` | Exists on both |
| `/datenschutz/` | Exists on both |
| `/` | Homepage |

## WordPress categories → new site

| Old | New |
|-----|-----|
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
| `/category/uncategorized/` | `/work/` |

## WordPress portfolio posts → `/work/`

All known project/showreel post slugs from the live sitemap redirect to `/work/` (no 1:1 case-study routes on V1). See section E in `.htaccess`.

## Not redirected (intentional)

- `/wp-admin/`, `/wp-json/`, `/wp-content/`, feeds, `xmlrpc.php` — obsolete platform paths; expect 404 on static host
- Unknown future slugs — no broad catch-all to the homepage (avoids wrong topical assignment)
- New-site routes (`/about/`, `/contact/`, `/work/`, `/services/…`, `/en/…`) — never redirected

## Soft / low-confidence mappings

| Old | New | Reason |
|-----|-----|--------|
| `/foteri/` | `/about/` | No topical equivalent; company context |
| `/partners/` | `/about/` | Company/partner context |
| `/jobs/` | `/about/` | No careers page on V1 |
| `/suche/`, `/sitemap/` | `/` | Utility pages removed |

If better destinations are approved later, update only `public/.htaccess` and this file.
