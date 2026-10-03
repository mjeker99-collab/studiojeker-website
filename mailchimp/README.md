# Studiojeker Mailchimp Newsletter Template

Standalone HTML e-mail template. Visual layout follows the **final newsletter mockup** (structure, proportions, text/image separation). Colours and brand marks follow the website design system (`styles/tokens.css`, original logo).

**Not** a website component. No React, Next.js, Tailwind or JavaScript.

| Token | Value |
| --- | --- |
| Black | `#000000` |
| White | `#ffffff` |
| Cyan | `#00c8ff` (`--color-cyan`) |
| Silver | `#c8ccd0` |
| Meta / eyebrow grey | `#6b6f74` |
| Max width | `700px` |
| Fonts | Arial / Helvetica (web uses Inter / Manrope) |

**Layout rule:** Text and images never overlap. No CSS overlays, no absolute positioning, no headlines on images. Split modules use adjacent table cells.

---

## Import into Mailchimp

1. Open **Mailchimp → Content → Email templates** (or Campaign → Design Email).
2. Choose **Code your own** → **Paste in code** (or **Import HTML**).
3. Paste the contents of `studiojeker-newsletter-template.html`, or upload the file.
4. Save as a **Saved Template** (e.g. `Studiojeker Newsletter Master`).
5. Upload final logo and images into the Mailchimp **Content Studio**, then replace every placeholder via the visual editor (`mc:edit` regions).
6. Local placeholders live under `mailchimp/placeholders/` (preview only). Relative paths will not resolve inside Mailchimp until each image is replaced with a hosted Content Studio asset.
7. Send a **test e-mail** to Apple Mail, Gmail (web + app), Outlook desktop and Outlook web before the first live send.

> Classic Mailchimp templates use `mc:edit` / `mc:repeatable` / `mc:variant`. Import as a **coded template** so these tags remain editable.

---

## Modules

| # | Module | Editable (`mc:edit`) | Notes |
| --- | --- | --- | --- |
| 1 | Preheader | `preheader` | Hidden inbox preview text |
| 2 | Meta row | `meta_left`, `meta_right` | Newsletter label + archive link (`*|ARCHIVE|*`) |
| 3 | Header | `header_logo`, `header_claim` | Logo **without** claim; claim separate on the right |
| 4 | Hero | `hero_eyebrow`, `hero_headline`, `hero_play_cta`, `hero_image` | Desktop: text left (cyan bar) + image right |
| 5 | Positionierung | `intro_eyebrow`, `intro_headline`, `intro_body`, `intro_cta` | Two columns + fine silver divider |
| 6 | AI teaser | `ai_image`, `ai_eyebrow`, `ai_headline`, `ai_body`, `ai_cta` | Image left (cyan bar) + text right |
| 7 | Kompetenzen | `services_*`, `service_*_image`, `service_*_title` | Desktop 4-up; mobile 2×2 |
| 8 | Flexible content | see variants | `mc:repeatable="flexible_content"` |
| 9 | Contact CTA | `contact_headline`, `contact_body`, `contact_cta`, `contact_image` | Text left (cyan bar) + image right |
| 10 | Footer | `footer_logo`, `footer_nav`, `social_links`, `footer_company` | Plus Mailchimp merge tags |

### Repeatable variants (`flexible_content`)

| Variant (`mc:variant`) | Layout |
| --- | --- |
| `image_left_text_right` | Image + cyan bar left, text right |
| `text_left_image_right` | Text left, image + cyan bar right |
| `full_width_image` | Full-width image + optional caption |
| `text_only` | Eyebrow + body |
| `headline_text_cta` | Headline + body + CTA |

In the campaign editor: duplicate the flexible block, pick a variant, edit content, delete unused variants.

---

## Logo

- Source: `public/logos/RZ_Studiojeker_Logo_RGB.svg` (claim-free wordmark used on the website).
- Exported PNGs for e-mail: `placeholders/logo.png`, `placeholders/footer_logo.png`.
- Do **not** use `RZ_Studiojeker_Logo_1992_RGB_neg_8.png` (contains claim / negative artwork).
- Header claim `WE CREATE VISIBILITY.` is separate text — never part of the logo file.

---

## Recommended image sizes

Export **PNG or JPEG** (not SVG — Outlook and many clients ignore SVG). Prefer **@2x** assets.

| Asset | Display size | Export (@2x) |
| --- | --- | --- |
| Header logo | ~150 × 69 | 320 × 148 |
| Footer logo | ~130 × 60 | 280 × 130 |
| Hero image | ~350 × auto (½ width) | ≥ 700 wide |
| AI module | ~314 × auto | ≥ 640 wide |
| Contact image | ~350 × auto | ≥ 700 wide |
| Service tiles | equal aspect (e.g. 320 × 220) | same ratio for all four |
| Flex split image | ~314 × auto | ≥ 624 wide |
| Flex full-width | ~694 × auto | ≥ 1384 wide |

**Play / showreel:** Do not embed video. Link `hero_play_cta` to Vimeo or the website.

---

## URLs to replace

| Context | Default |
| --- | --- |
| Logo / general | `https://www.studiojeker.ch/` |
| KI module | `https://www.studiojeker.ch/ki/` |
| Contact CTA | `https://www.studiojeker.ch/kontakt/` |
| Digital Marketing | `https://www.studiojeker.ch/digital-marketing/` |
| Business Communication | `https://www.studiojeker.ch/business-communication/` |
| Product Communication | `https://www.studiojeker.ch/product-communication/` |
| Architecture | `https://www.studiojeker.ch/architecture/` |
| LinkedIn | `https://www.linkedin.com/company/studiojeker/` |
| Instagram | `https://www.instagram.com/studiojeker/` |
| Facebook | `https://www.facebook.com/studiojeker/` |

Social URLs match `lib/content/social.ts` (LinkedIn, Instagram, Facebook).

Company address defaults match `lib/content/contact.ts` (Studiojeker GmbH, Hauptstrasse 73, CH-4528 Zuchwil). Mailchimp also injects `*|HTML:LIST_ADDRESS_HTML|*` from audience settings — keep both consistent.

---

## Mailchimp merge tags

| Tag | Purpose |
| --- | --- |
| `*|ARCHIVE|*` | View in browser |
| `*|HTML:LIST_ADDRESS_HTML|*` | Legal list / company address from audience |
| `*|UPDATE_PROFILE|*` | Update preferences |
| `*|UNSUB|*` | Unsubscribe |

---

## Outlook / mobile notes

- Layout is **table-based** with **inline CSS**; media queries kick in below ~620px.
- **Outlook desktop** ignores many CSS properties — widths, `bgcolor`, and nested tables carry the layout.
- Cyan bars are table cells with `bgcolor="#00c8ff"` (reliable in Outlook).
- CTAs are plain uppercase text links with arrows (no bordered buttons).
- Images use `display:block`, explicit `width`, and meaningful `alt` text.
- Mobile: two-column modules stack to one column (text first for hero/contact; image first for AI); competency pairs stack to 2×2.
- No gradients, shadows, border-radius cards, or text overlays on images.

---

## Quality checklist

- [x] Original logo without claim
- [x] Cyan `#00c8ff` from `styles/tokens.css`
- [x] No text on images
- [x] Hero / AI / Contact desktop two-column
- [x] Unique `mc:edit` names
- [x] `mc:repeatable` + `mc:variant` for flexible modules
- [x] Unsubscribe + update-preferences merge tags
- [x] Website / Sanity / deployment files untouched
