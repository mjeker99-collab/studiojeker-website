# Newsletter Relaunch 2026 — Bild-URLs & offene Punkte

Sendefertige Datei: `studiojeker-newsletter-final.html`

## Verwendete Bild-URLs

| Slot | URL |
| --- | --- |
| Logo (Header + Footer) | `https://cdn.jsdelivr.net/gh/mjeker99-collab/studiojeker-website@9584d5e/mailchimp/placeholders/logo.png` |
| Footer-Logo | `https://cdn.jsdelivr.net/gh/mjeker99-collab/studiojeker-website@9584d5e/mailchimp/placeholders/footer_logo.png` |
| Hero (Baseballer) | `https://www.studiojeker.ch/images/Baseballer.jpg` |
| KI (Option A — aktiv) | `https://cdn.sanity.io/images/tgx6e6jg/production/64a906ed2ca0239a6f72f34846a8c16d3178fc6a-1344x752.png` |
| KI (Option B — Alternative) | `https://cdn.sanity.io/images/tgx6e6jg/production/c974178bc8415baabca6351564b4a593c5795fc8-1344x752.png` |
| Digital & Social Media Marketing | `https://cdn.sanity.io/images/tgx6e6jg/production/148b296d175caf79bab130c4db98c0c8c5ff4e20-1140x638.jpg` |
| Business Communication | `https://cdn.sanity.io/images/tgx6e6jg/production/807b72548c4ee6eabc56e63d57a3aaf5d5cd5ce7-960x600.jpg` |
| Product Communication | `https://cdn.sanity.io/images/tgx6e6jg/production/3bd2ee05392360c939e0bb745ad16b28d00c367f-2048x1536.png` |
| Architecture & Real Estate | `https://cdn.sanity.io/images/tgx6e6jg/production/923ba20836f7c7f9d293206ccbb4cace439bc143-1920x1080.jpg` |
| Kontakt | `https://cdn.sanity.io/images/tgx6e6jg/production/deda31179cf7b34940743be1023a719709128520-1667x979.jpg` |
| Flex left / Flex right | KI Option A / KI Option B (Sanity CDN) |
| Flex full | Baseballer (wie Hero) |
| Social Icons | jsDelivr `@9584d5e` → `icon_linkedin.png`, `icon_instagram.png`, `icon_facebook.png` |

## KI-Motiv — Auswahl

- **Option A (in Final HTML):** fotorealistisches Designer/Motorrad-Motiv — Hero der KI-Seite / Homepage-AI-Teaser (`IMG_2370.png`).
- **Option B:** skizzenhafte Variante desselben Motivs — Intro der KI-Seite (`IMG_2609.png`), Datei `studiojeker-newsletter-final-ki-alt.html`.

## Links (geprüft)

| Ziel | URL |
| --- | --- |
| Website | `https://www.studiojeker.ch/` |
| KI | `https://www.studiojeker.ch/ki/` |
| Showreel (Hero Play) | `https://vimeo.com/1228871502` |
| Digital Marketing | `https://www.studiojeker.ch/services/digital-marketing/` |
| Business Communication | `https://www.studiojeker.ch/services/business-communication/` |
| Product Communication | `https://www.studiojeker.ch/services/product-communication/` |
| Architecture | `https://www.studiojeker.ch/services/architecture/` |
| Kontakt | `https://www.studiojeker.ch/kontakt/` |
| Impressum / Datenschutz / AGB | `/impressum/`, `/datenschutz/`, `/agb/` |
| LinkedIn / Instagram / Facebook | siehe `lib/content/social.ts` |
| Mailchimp | `*|UNSUB|*`, `*|UPDATE_PROFILE|*`, `*|HTML:LIST_ADDRESS_HTML|*`, `*|CURRENT_YEAR|*`, `*|LIST:COMPANY|*` |

## Offene Punkte

1. **Logo-Hosting:** PNG kommt über jsDelivr (GitHub-Mirror-CDN), nicht über Sanity. Für langfristigen Versand idealerweise Logo in Mailchimp Content Studio oder Sanity CDN ablegen und URL tauschen.
2. **Hero-Format:** Baseballer ist Hochformat — der Hero-Block wird dadurch höher als ein typisches Querformat. Gewollt gemäss Vorgabe; ggf. später croppen.
3. **Flex-Module:** Enthalten Demo-Inhalte mit echten Bildern. Vor dem Versand unnötige `mc:repeatable`-Varianten in Mailchimp löschen.
4. **Kein eingebettetes Video** — Hero/Play verlinken auf Vimeo `1228871502`.
5. Nach Import in Mailchimp: Testsendung an Apple Mail, Gmail, Outlook Desktop/Web.
