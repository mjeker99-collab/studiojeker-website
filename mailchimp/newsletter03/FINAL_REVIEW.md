# Studiojeker Newsletter V3 – Visibility Final

Versanddatei: `mailchimp/studiojeker-newsletter-03-visibility-final.html`  
Basis: PR #254 (`studiojeker-newsletter-03-visibility-final-20261027.html`)  
Stand: 27. Oktober 2026

## Vorschauen

| Breite | Datei |
| --- | --- |
| 700 px (Desktop) | [final-desktop.png](previews/final-desktop.png) |
| 390 px (Mobile) | [final-mobile.png](previews/final-mobile.png) |
| 320 px (kleines Smartphone) | [final-320.png](previews/final-320.png) |

## Promo-Bereich (freigegeben)

- Headline: Unsere Visibility Abos.
- Aktionshinweis: AKTION BIS 30. NOVEMBER 2026
- Hauptbotschaft: Recherche, Konzeption & Einrichtung kostenlos.
- Visibility Start: CHF 650/Monat, 4 unterschiedliche Posts, bis zu 2 Kanäle, bestehendes Kundenmaterial, keine neue Foto-/Videoproduktion.
- Visibility Plus: ab CHF 1’150/Monat, 8 unterschiedliche Posts, bis zu 3 Kanäle.
- Visibility Individuell: Preis auf Anfrage.
- Bedingungen: Mindestlaufzeit 6 Monate, danach monatlich kündbar.
- CTA: Jetzt Promoangebot sichern → `https://www.studiojeker.ch/content-abo/`
- Kein Gratismonat / kein kostenloser erster Abo-Monat.

## Regenschirmfoto

- Original vom Auftraggeber bereitgestellt und bytegleich archiviert unter `assets/umbrella-cyan-original.jpg` (SHA256 `84c61fac9d589a28ebf36bfe5a89a4cef519dacd1f853b2e22f1cdeaed24659e`).
- Mechanischer 4:5-Zuschnitt ohne Farbänderung: `assets/umbrella-cyan.jpg` (640×800).
- Öffentliche commitgebundene URL:  
  `https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/eaf48c8a43824025396c65bcd01ae8c2b4d2c34b/mailchimp/newsletter03/assets/umbrella-cyan.jpg`
- Google-Drive-Thumbnail vollständig entfernt.
- Nora-Porträt erscheint nicht im Promo-Bereich.

## Layout

- Schwarz `#000000`, Weiss `#FFFFFF`, Cyan `#00c8ff`
- Arial/Helvetica, max. 700 px
- Text links, Regenschirmfoto rechts (Mobile gestapelt)
- Keine Textüberlagerung auf Bildern
- Mailchimp-Merge-Tags (`ARCHIVE`, `HTML:LIST_ADDRESS_HTML`, `UPDATE_PROFILE`, `UNSUB`), Footer, Logo und bestehende Links erhalten

## Prüfungen

Chromium/Playwright bei 700 / 390 / 320 px (`responsive-final-checks.json`):

- Alle 13 Bilder geladen, inkl. Regenschirmfoto
- Kein horizontaler Überlauf
- Kein Nora-Motiv im Promo-Block
- CTA und Promo-Texte lesbar

URL-Prüfung (`url-final-checks.json`): 26/26 Ziele erreichbar (HTTP 200), inkl. `/content-abo/`, Kontakt, Service-Seiten, Social-Icons und sämtliche Bildquellen.

## Versand

Datei ist für den direkten Mailchimp-Import (Code your own / Import HTML) vorbereitet.  
Kein Versand und keine Mailchimp-Kampagne ohne ausdrückliche Freigabe.

## Bekannte Grenzen

- Keine Litmus-/Email-on-Acid-Clientprüfung und keine echte Mailchimp-Testsendung in dieser Runde.
- Merge-Tag-Auflösung und Abmeldelink erfordern eine Mailchimp-Testmail vor dem Live-Versand.
