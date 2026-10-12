# V7 – Schlusskorrekturen mit Konzertfoto

Neue Version auf Basis der unveränderten V6. Kein Redesign; ausschliesslich die angeforderten Schlusskorrekturen.

## Änderungen

- Erste Kompetenzkarte `Digital & Social Media Marketing`: geliefertes Originalfoto der Fotografin bei einer Konzertproduktion. Linksorientierter 4:3-Zuschnitt erhält Fotografin, Kamera und Bühnenszene. Original 1280×872 px, JPEG-Export 600×450 px, Qualität 86, keine Verzerrung und keine Generierung. Das Original wurde nicht überschrieben. Beschriftung, Layout und Link unverändert.
- Öffentliches HTTPS-Bildhosting auf dem bestehenden `gh-pages`-Branch: https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/gh-pages/v7-corrections/assets/digital-concert-photographer.jpg
- Zusätzliches kleines `STUDIOJEKER` oberhalb des Footer-Logos entfernt. Claim-freies Original-Logo mit separatem Claim einmal darunter. Rechter Desktop-Linkblock 16 px tiefer, Navigation und Social-Icons sauber gruppiert. Mobile kompakt gestapelt.
- Mobiler KI-Block: doppelte horizontale Einrückung entfernt. Bild und Text beginnen jetzt bei 24 px; Cyan-Balken begleitet die vollständige Höhe des Blocks. Desktop KI bleibt unverändert.
- Hero, Schriftfamilie/-grössen, alle Originalabsätze, Headlines, CTA- und Pflichtlinks sowie Mailchimp-Merge-Tags unverändert gegenüber dem zuletzt geprüften Stand.

## Dateien

- `studiojeker-newsletter-v7.html`: vollständige Mailchimp-Importdatei mit ausschliesslich öffentlichen HTTPS-Bildadressen; keine technischen Vorschauhinweise.
- `index.html`: responsive Browser-Vorschau; Mailchimp-Accountlinks führen nur zum Seitenanfang.
- `desktop.html` / `mobile.html`: echte HTML-Vorschau in 700-/390-px-Browser-Viewport. Die Wrapperhöhe entspricht der Newsletter-Höhe.
- `preview-700.png`, `preview-390.png`, `preview-320.png`: tatsächliche Renderings.
- `qa-layout.json`: gemessene Geometrie und Vergleich mit V6.

## Direkte Vorschauen

Desktop: https://mjeker99-collab.github.io/studiojeker-website/v7-corrections/desktop.html

Mobile: https://mjeker99-collab.github.io/studiojeker-website/v7-corrections/mobile.html

## Qualitätskontrolle und Grenzen

Desktop 700 px und Mobile 390 px visuell geprüft; zusätzlich 320 px geprüft. Alle Karten sind gleich gross, 4:3, mit vollständigen Beschriftungen; Desktop vier Spalten, Mobile 2×2. Kein horizontaler Überlauf und keine Bildverzerrungen. Hero-Geometrie und Desktop-KI gegenüber V6 identisch. Cyan-Balken 10 px breit, Höhe exakt der tatsächlichen Blockzeile. Sämtliche Absatztexte, Headlines und Links automatisiert unverändert bestätigt. Die öffentlichen Vorschauseiten und die neue Bildadresse werden nach dem Push live im Browser geprüft.

Die zwei angekündigten markierten Vorschauen liegen weiterhin nicht als Anhänge vor. Die beschriebenen Korrekturen wurden deshalb anhand des schriftlichen Auftrags umgesetzt; ein pixelgenauer Vergleich mit den roten Markierungen ist nicht möglich.

Keine verbundene Mailchimp-/Litmus-/Email-on-Acid-Rendering-Umgebung. Kein Versand durchgeführt. Vor dem Liveversand Testsendung in Apple Mail, Gmail und Outlook prüfen. V1–V6 und produktive Website bleiben unverändert. PR #130 wird aktualisiert und nicht gemergt.
