# Studiojeker Mailchimp Newsletter Template

Standalone HTML e-mail template aligned with the Studiojeker web design system (`styles/tokens.css`, `DESIGN_SPECIFICATION.md`).

**Not** a website component. No React, Next.js, Tailwind or JavaScript.

| Token | Value |
| --- | --- |
| Black | `#000000` |
| White | `#ffffff` |
| Cyan | `#00c8ff` |
| Silver | `#c8ccd0` |
| Neutral | `#f5f5f5` |
| Max width | `700px` |
| Fonts | Arial / Helvetica (web uses Inter / Manrope) |

---

## Import into Mailchimp

1. Open **Mailchimp → Content → Email templates** (or Campaign → Design Email).
2. Choose **Code your own** → **Paste in code** (or **Import HTML**).
3. Paste the contents of `studiojeker-newsletter-template.html`, or upload the file.
4. Save as a **Saved Template** (e.g. `Studiojeker Newsletter Master`).
5. Upload final logo and images into the Mailchimp **Content Studio**, then replace every placeholder via the visual editor (`mc:edit` regions).
6. Send a **test e-mail** to Apple Mail, Gmail (web + app), Outlook desktop and Outlook web before the first live send.

> Classic Mailchimp templates use `mc:edit` / `mc:repeatable` / `mc:variant`. If you build in the newer drag-and-drop builder, import as a **coded template** so these tags remain editable.

---

## Modules

| # | Module | Editable (`mc:edit`) | Notes |
| --- | --- | --- | --- |
| 1 | Preheader | `preheader` | Hidden preview text |
| 2 | Header | `header_logo`, `header_claim` | Logo left, claim right; stacks on mobile |
| 3 | Hero | `hero_eyebrow`, `hero_image`, `hero_play_cta`, `hero_headline`, `hero_cta` | Cyan bar + still image (no video) |
| 4 | Intro | `intro_headline`, `intro_body`, `intro_cta` | Positioning copy |
| 5 | AI teaser | `ai_image`, `ai_eyebrow`, `ai_headline`, `ai_body`, `ai_cta` | Image left / text right → stacks on mobile |
| 6 | Kompetenzen | `services_*`, `service_*_image`, `service_*_title` | 2×2 desktop; stacks on mobile |
| 7 | Flexible content | see variants below | `mc:repeatable="flexible_content"` |
| 8 | Contact CTA | `contact_headline`, `contact_body`, `contact_cta` | Cyan bar left + bordered button |
| 9 | Footer | `footer_logo`, `footer_claim`, `social_links`, `footer_company` | Plus Mailchimp merge tags |

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

## Recommended image sizes

Export **PNG or JPEG** (not SVG — Outlook and many clients ignore SVG). Prefer **@2x** assets.

| Asset | Display size | Export (@2x) | Placeholder label |
| --- | --- | --- | --- |
| Header logo | 160 × 74 | 320 × 148 | `STUDIOJEKER LOGO` |
| Footer logo | 140 × 65 | 280 × 130 | `STUDIOJEKER LOGO` |
| Hero | ~692 × 388 | 1368 × 770 | `HERO IMAGE` |
| AI module | 312 × 234 | 624 × 468 | `AI IMAGE` |
| Service tiles | 318 × 200 | 636 × 400 | `DIGITAL MARKETING IMAGE`, `BUSINESS COMMUNICATION IMAGE`, `PRODUCT COMMUNICATION IMAGE`, `ARCHITECTURE IMAGE` |
| Flex split image | 312 × 234 | 624 × 468 | — |
| Flex full-width | ~692 × 389 | 1384 × 778 | — |

**Play / showreel:** Do not embed video. Either bake a play icon into the hero still, or use the editable `hero_play_cta` link to Vimeo / the website.

**Logo source in the repo:** `public/logos/RZ_Studiojeker_Logo_RGB.svg` — export a dark-on-white PNG for e-mail. Do not use the negative PNG on a white footer/header.

---

## URLs to replace

Default links point at production paths. Update per campaign in Mailchimp:

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

Social URLs match `lib/content/social.ts` (LinkedIn, Instagram, Facebook — no Vimeo/YouTube in the site footer config).

Company address defaults match the published imprint (Studiojeker GmbH, Industriestrasse 9, 4513 Langendorf). Mailchimp also injects `*|HTML:LIST_ADDRESS_HTML|*` from audience settings — keep both consistent.

---

## Mailchimp merge tags (footer)

| Tag | Purpose |
| --- | --- |
| `*|HTML:LIST_ADDRESS_HTML|*` | Legal list / company address from audience |
| `*|CURRENT_YEAR|*` | Copyright year |
| `*|LIST:COMPANY|*` | Company name from audience |
| `*|UPDATE_PROFILE|*` | Update preferences |
| `*|UNSUB|*` | Unsubscribe |

---

## Outlook / mobile notes

- Layout is **table-based** with **inline CSS**; media queries kick in below ~620px.
- **Outlook desktop** ignores many CSS properties — widths, `bgcolor`, and nested tables carry the layout.
- Cyan bars are table cells with `bgcolor="#00c8ff"` (reliable in Outlook).
- CTAs use text links or bordered table cells (not CSS-only buttons).
- `color-scheme: light only` reduces unwanted dark-mode inversion where supported (Gmail/Apple may still invert some colours).
- Images use `display:block`, explicit `width` / `height`, and meaningful `alt` text for image-blocked clients.
- Mobile: two-column modules stack to one column; service grid stacks; touch targets ≥ 44px on CTAs.
- No gradients, shadows, border-radius or card chrome — matches the website design system.

---

## Quality checklist

- [x] No React / Next.js / JS / Tailwind
- [x] Unique `mc:edit` names
- [x] `mc:repeatable` + `mc:variant` for flexible modules
- [x] Unsubscribe + update-preferences merge tags
- [x] Placeholder images clearly labelled
- [x] Website files untouched
