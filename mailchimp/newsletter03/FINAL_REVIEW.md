# Studiojeker Newsletter V3 – Visibility Final

Versanddatei: `mailchimp/studiojeker-newsletter-03-visibility-final.html`  
Stand: 27. Oktober 2026

Auf `main` (PR #260) waren der freigegebene Promo-Block und das Regenschirmfoto bereits enthalten. Diese Runde ergänzt nur die drei noch fehlenden Punkte aus dem V3-Auftrag. Promo-HTML, Footer und Mailchimp-Merge-Tags sind unverändert.

## Vorschauen

| Breite | Datei |
| --- | --- |
| 700 px (Desktop) | [final-desktop.png](previews/final-desktop.png) |
| 390 px (Mobile) | [final-mobile.png](previews/final-mobile.png) |
| 320 px (kleines Smartphone) | [final-320.png](previews/final-320.png) |

## Nora – separater Ansprechpartnerinnen-Block

- Eigenes Zwei-Spalten-Modul vor den vier Kompetenzbereichen, analog zum Porträtblock in Newsletter V2.
- Bildadresse exakt aus V2: `https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/7361ce0ff0f8d302c29c23ac7cc3ef5a15a6fbc4/mailchimp/visibility-update/assets/nora-cyan-tall.jpg`
- Alt-Text: Nora Jeker vor Cyan-Papier.
- Bestehender V3-Text bleibt: Nora Jeker, Ihre Ansprechpartnerin für digitale Sichtbarkeit, plus der Absatz zur Content-Strategie.
- CTA: Persönliches Gespräch vereinbaren → `https://www.studiojeker.ch/contact/`
- Das Porträt steht nicht im Promo-Block.

## Vier Bereichsbilder

Quellen und Linkziele entsprechen der finalen Newsletter-V2-Datei `mailchimp/studiojeker-newsletter-02-visibility.html`:

| Bereich | Bild | Ziel |
| --- | --- | --- |
| Digital & Social Media Marketing | `…/476a19450a7ae47b1c067d1faed3b8b8eb7c2a48/mailchimp/visibility-update/assets/digital.jpg` | `/services/digital-marketing/` |
| Business Communication | `…/business.jpg` | `/services/business-communication/` |
| Product Communication | `…/product.jpg` | `/services/product-communication/` |
| Architecture & Real Estate | `…/architecture.jpg` | `/services/architecture/` |

Keine neu generierten Bilder.

## Hero-Video

- Playbutton ist in den V2-Hero-Bildern enthalten (`hero-desktop.jpg`, `hero-mobile.jpg`, Commit `476a1945`).
- Bildfläche und Textlink «Video abspielen» führen auf `https://www.studiojeker.ch/#home-showreel-title`.
- Der Anker `home-showreel-title` ist auf der Live-Startseite vorhanden. Keine neue Video-URL.

## Promo-Bereich (freigegeben, unverändert)

- Headline: Unsere Visibility Abos.
- Aktionshinweis: AKTION BIS 30. NOVEMBER 2026
- Hauptbotschaft: Recherche, Konzeption & Einrichtung kostenlos.
- Visibility Start: CHF 650/Monat, 4 unterschiedliche Posts, bis zu 2 Kanäle, bestehendes Kundenmaterial, keine neue Foto-/Videoproduktion.
- Visibility Plus: ab CHF 1’150/Monat, 8 unterschiedliche Posts, bis zu 3 Kanäle.
- Visibility Individuell: Preis auf Anfrage.
- Bedingungen: Mindestlaufzeit 6 Monate, danach monatlich kündbar.
- CTA: Jetzt Promoangebot sichern → `https://www.studiojeker.ch/content-abo/`
- Kein Gratismonat / kein kostenloser erster Abo-Monat.
- Regenschirmfoto: `https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/eaf48c8a43824025396c65bcd01ae8c2b4d2c34b/mailchimp/newsletter03/assets/umbrella-cyan.jpg`
- Farben: Schwarz `#000000`, Weiss `#FFFFFF`, Cyan `#00c8ff`

## Layout und geschützte Bereiche

- Arial/Helvetica, max. 700 px
- Mailchimp-Merge-Tags (`ARCHIVE`, `HTML:LIST_ADDRESS_HTML`, `UPDATE_PROFILE`, `UNSUB`), Footer, Logo und Abmeldelinks unverändert
- Intro, Content-Abschnitt mit Augenmotiv und Promo-Block unverändert

## Prüfungen

Chromium bei 700 / 390 / 320 px (`responsive-final-checks.json`):

- 14/14 Bilder geladen, inklusive Nora, Playbutton-Hero, vier V2-Bereichsbilder und Regenschirm
- Kein horizontaler Überlauf (`scrollWidth` gleich Viewport)
- Hero-Bild und «Video abspielen» zeigen auf den Showreel-Anker
- Nora-Porträt ausserhalb des Promo-Blocks
- Auf 700 px: Desktop-Hero sichtbar, Mobile-Hero ausgeblendet. Ab 480 px umgekehrt

URL-Prüfung (`url-final-checks.json`): 28/28 Ziele HTTP 200, inklusive Showreel-Anker, Nora-Bild, V2-Bereichsbilder, Regenschirm, `/content-abo/` und Kontakt.

## Versand

Die Datei ist für den direkten Mailchimp-Import (Code your own / Import HTML) vorbereitet.  
Kein Versand und keine Mailchimp-Kampagne ohne ausdrückliche Freigabe. Kein Produktionsdeployment in dieser Runde.

## Bekannte Grenzen

- Keine Litmus-/Email-on-Acid-Clientprüfung und keine echte Mailchimp-Testsendung.
- Merge-Tags und der Abmeldelink lösen sich erst in einer Mailchimp-Testmail auf. Das ist der verbleibende Versandblocker vor einem Live-Versand.
