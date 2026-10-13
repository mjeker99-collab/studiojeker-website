# V7 – Schlusskorrekturen mit Konzertfoto

Neue Version auf Basis der unveränderten V6. Kein Redesign; ausschliesslich die angeforderten Schlusskorrekturen.

## Änderungen

- Erste Kompetenzkarte `Digital & Social Media Marketing`: geliefertes Originalfoto der Fotografin bei einer Konzertproduktion. Linksorientierter 4:3-Zuschnitt erhält Fotografin, Kamera und Bühnenszene. Original 1280×872 px, JPEG-Export 600×450 px, Qualität 86, keine Verzerrung und keine Generierung. Das Original wurde nicht überschrieben. Beschriftung, Layout und Link unverändert.
- Öffentliches HTTPS-Bildhosting auf dem bestehenden `gh-pages`-Branch: https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/gh-pages/v7-corrections/assets/digital-concert-photographer.jpg
- Zusätzliches kleines `STUDIOJEKER` oberhalb des Footer-Logos entfernt. Claim-freies Original-Logo mit separatem Claim einmal darunter. Rechter Desktop-Linkblock nach der gelieferten Markierung unten im Footer ausgerichtet. Dafür Tabellenzelle mit rowspan=3 und valign=bottom; keine feste Höhe und keine zusätzliche Leerzelle. Navigation und Social-Icons sauber gruppiert. Mobile-Footer behält seine bisherige Reihenfolge. Mobile kompakt gestapelt.
- Mobiler KI-Block: doppelte horizontale Einrückung entfernt. Bild und Text beginnen jetzt bei 24 px; der mobile 22-px-Innenabstand oberhalb des KI-Bildes entfällt nach der Markierung. Cyan-Balken beginnt bündig mit der Bildoberkante und begleitet die vollständige Höhe des Blocks. Desktop KI bleibt unverändert.
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

Desktop 700 px und Mobile 390 px visuell geprüft; zusätzlich 320 px geprüft. Alle Karten sind gleich gross, 4:3, mit vollständigen Beschriftungen; Desktop vier Spalten, Mobile 2×2. Kein horizontaler Überlauf und keine Bildverzerrungen. Hero-Geometrie und Desktop-KI gegenüber V6 identisch. Cyan-Balken 10 px breit, Höhe exakt der tatsächlichen Blockzeile. Sämtliche Absatztexte, Headlines und Links automatisiert unverändert bestätigt. Die öffentlichen Vorschauseiten werden nach dem Push erneut im Browser geprüft. Alle 12 Bildadressen sind im Live-Linktest HTTP 200 und liefern die richtigen Bild-MIME-Typen.

Die zwei markierten Vorschauen wurden als Foto 1.jpg und Foto 2.jpg bereitgestellt, gelesen und mit den tatsächlichen Renderings verglichen. Ausschliesslich der markierte Desktop-Footer-Linkblock und der markierte mobile Balkenüberstand oberhalb des KI-Bildes wurden korrigiert; kein Redesign.

Keine verbundene Mailchimp-/Litmus-/Email-on-Acid-Rendering-Umgebung. Kein Versand durchgeführt. Vor dem Liveversand Testsendung in Apple Mail, Gmail und Outlook prüfen. V1–V6 und produktive Website bleiben unverändert. PR #130 wird aktualisiert und nicht gemergt.

## Live-Linkprüfung · 12. Oktober 2026

25 unterschiedliche HTTPS-Adressen aus allen `href`- und `src`-Attributen tatsächlich abgerufen, mit TLS-Prüfung und Redirect-Auflösung. 24× HTTP 200: alle Bilder, alle drei CTAs (zwei verschiedene Zielseiten), alle vier Kompetenzlinks, Kontakt, Impressum, Datenschutz, AGB, Facebook und LinkedIn. Die vollständigen Ergebnisse stehen in `qa-links.json`.

Instagram `https://www.instagram.com/studiojeker/` wurde per HTTP und in einem echten Browser geprüft. Instagram antwortet mit HTTP 429; im Browser erfolgt ein Redirect auf `accounts/login/?next=...studiojeker...`. Das ist eine Plattform-/Anmeldebeschränkung, kein bestätigter 404. URL aus dem Repository unverändert lassen und vor Merge einmal manuell mit normalem bzw. angemeldetem Browser bestätigen. Kein funktionierender Ersatzlink erfunden.

Mailchimp-Merge-Links sind syntaktisch erhalten: `*|ARCHIVE|*`, `*|UPDATE_PROFILE|*`, `*|UNSUB|*`; Listenadresse `*|HTML:LIST_ADDRESS_HTML|*` ebenfalls. Diese account-/empfängerabhängigen Ziele können erst in einer echten Testsendung nach Auflösung durch Mailchimp vollständig geprüft werden. Der Browser-Preview ersetzt sie weiterhin nur durch den Seitenanfang.

PR #130 bleibt bis zur abschliessenden Link-/Testsendungsprüfung ein Entwurf. Kein Merge durchgeführt.

## Showreel-Playbutton · 13. Oktober 2026

Ausschliesslich die gewünschte Ergänzung: zwei neue Kopien der vorhandenen Hero-Zuschnitte, weiss gezeichneter Play-Pfeil in einem dezenten halbtransparenten dunklen Kreis, exakt mittig ins Bild integriert. Originaldateien, Motiv, Ausschnitt und Bildabmessungen bleiben erhalten: Desktop 1040×780 px, Mobile 800×600 px. Kein generativer Eingriff. Buttondurchmesser im gerenderten 700-px-Desktop ca. 52 px, im 390-px-Mobile ca. 46 px; bei 320 px skaliert der im Bild eingebrannte Button mit dem Bild auf ca. 36 px.

Der komplette Hero-Bildbereich ist mit einem normalen HTML-Anchor verlinkt: **https://vimeo.com/1216347773** (`target=_blank`). Keine zusätzlichen sichtbaren Texte oder Abstände; kein CSS-Overlay, JavaScript, iframe oder Video in der Mailchimp-Versanddatei. Die vorhandenen separaten Browser-Preview-Wrapper sind weiterhin reine Vorschau-Dateien, keine Versanddateien.

Neue öffentliche Bildadressen:
- https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/gh-pages/v7-corrections/assets/baseballer-desktop-play.jpg
- https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/gh-pages/v7-corrections/assets/baseballer-mobile-play.jpg

Qualitätssicherung: tatsächliche Renderings bei 700, 390 und 320 px vor/nach der Ergänzung verglichen. Alle gemessenen Tabellenzellen, Text-/Bildpositionen und Abmessungen sowie die gesamte Newsletter-Höhe sind identisch. Ein Klick am Bildrand öffnet die exakte Vimeo-URL. Sämtliche übrigen Links, Absätze und Überschriften unverändert. `qa-showreel.json` dokumentiert Geometrievergleich und Button-Grössen. Desktop und Mobile tatsächlich visuell geprüft. E-Mail-Client-Testsendung und die bereits dokumentierte Instagram-Prüfgrenze bleiben offen. Kein Merge.
