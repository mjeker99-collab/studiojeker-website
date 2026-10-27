# Studiojeker Newsletter V3 – Visibility Final

Versanddatei: `mailchimp/studiojeker-newsletter-03-visibility-final.html`  
Issue: #261  
Stand: 27. Oktober 2026

## Vorschauen

| Breite | Datei |
| --- | --- |
| 700 px (Desktop) | [final-desktop.png](previews/final-desktop.png) |
| 390 px (Mobile) | [final-mobile.png](previews/final-mobile.png) |
| 320 px (kleines Smartphone) | [final-320.png](previews/final-320.png) |

## Korrekturen gemäss Issue #261

1. **Nora-Kontaktblock (separat):** Ansprechpartnerinnen-Modul mit freigegebenem V2-Nora-Porträt  
   `…/7361ce0…/mailchimp/visibility-update/assets/nora-cyan-tall.jpg`  
   Nicht im Promo-Block.
2. **Vier Bereichsfotos + Links:** exakt wie finale Newsletter V2 (`visibility-update/assets/{digital,business,product,architecture}.jpg` @ `476a194…`), Links unverändert auf `/services/…`.
3. **Hero → Video:** V2-Showreel-Motiv mit Playbutton, Klickfläche und Textlink «→ Video abspielen» auf `https://www.studiojeker.ch/#home-showreel-title`.
4. **Promo unverändert beibehalten:** Regenschirmfoto, Schwarz/Weiss/Cyan `#00c8ff`, Visibility-Abos, kostenlose Recherche/Konzeption/Einrichtung bis 30.11.2026, Start CHF 650 / Plus ab CHF 1’150 / Individuell, 6 Monate Mindestlaufzeit, kein Gratismonat, CTA `/content-abo/`.

## Erhalten

Mailchimp-Merge-Tags (`ARCHIVE`, `HTML:LIST_ADDRESS_HTML`, `UPDATE_PROFILE`, `UNSUB`), Footer, Logo und übrige redaktionelle Bereiche.

## Prüfungen

Chromium/Playwright 700 / 390 / 320 (`responsive-final-checks.json`):

- 14 Bilder geladen (Hero, Nora, 4 Bereiche, Regenschirm, Logos/Icons)
- Kein horizontaler Überlauf
- 2 Showreel-Links aktiv
- Nora nicht im Promo

URL-Prüfung (`url-final-checks.json`): 28/28 Ziele HTTP 200.

## Versand

Bereit für direkten Mailchimp-HTML-Import.  
Kein Versand ohne ausdrückliche Freigabe. Vor Live-Versand: Mailchimp-Testmail (Clients + Merge-Tags).
