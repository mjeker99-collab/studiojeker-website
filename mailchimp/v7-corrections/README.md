# V7 – Schlusskorrekturen · Entwurf

V6 bleibt unverändert. V7 korrigiert ausschliesslich Footer und den mobilen KI-Block; kein Redesign. Der neue Bildwechsel ist noch **nicht** durchgeführt: Das genannte Originalfoto und die zwei markierten Vorschauen wurden in dieser Sitzung nicht als tatsächliche Anhänge bereitgestellt. Keine Ersatzbilder erfunden. Die erste Kompetenzkarte zeigt daher vorläufig weiterhin ihr bisheriges Originalmotiv.

## Umgesetzt und visuell geprüft

- Kleines zusätzliches `STUDIOJEKER` oberhalb des Footer-Logos vollständig entfernt, Desktop und Mobile.
- Claim-freies Original-Logo, darunter der separate Claim einmal. Navigation und Social-Icons rechts unverändert gruppiert; Desktop-Linkblock durch 16 px Top-Padding tiefer ausgerichtet. Mobile kompakt gestapelt.
- Mobile KI: doppelte Seitenränder entfernt (24 px äusserer Abstand plus zuvor 22 px zusätzlicher Innenabstand). Bild und Text beginnen jetzt bei 24 px. Der Cyan-Balken begleitet weiterhin die gesamte Blockhöhe, ohne zusätzliche Leerzellen.
- Desktop KI-Bildposition und -breite unverändert. Hero-Markup und gemessene Hero-Geometrie auf 700, 390 und 320 px unverändert. Alle Absatztexte, Überschriften, Schriftgrössen und Links unverändert.
- Kompetenzkarten weiterhin identische 4:3-Bilder; vier Spalten auf Desktop und zwei Reihen mit je zwei Karten auf Mobile. Keine abgeschnittenen Beschriftungen.

## Vorschauen

- Desktop: https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v7-corrections/desktop.html
- Mobile: https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v7-corrections/mobile.html
- Falls GitHub Pages aktiviert ist: https://mjeker99-collab.github.io/studiojeker-website/v7-corrections/desktop.html bzw. `mobile.html`.

Die PNG-Dateien zeigen tatsächliche Chromium-Renderings bei 700, 390 und 320 px. Die Desktop- und Mobile-Aufnahmen wurden vom Agenten visuell geprüft. `qa-layout.json` enthält den Vergleich mit V6. Die Versanddatei `studiojeker-newsletter-v7.html` enthält keine technischen Vorschauhinweise und ausschliesslich öffentliche HTTPS-Bildadressen; alle Mailchimp-Merge-Tags bleiben erhalten.

## Noch offen

1. Originalfoto der Fotografin bei der Konzertproduktion als tatsächlichen Dateianhang nachreichen. Danach Bildzuschnitt 4:3, Person/Bühne prüfen, JPEG optimieren, öffentlich hosten und ausschliesslich die erste Karte ersetzen.
2. Beide markierten Vorschauen nachreichen, um die korrigierten Positionen exakt gegen die roten Markierungen zu vergleichen.
3. Keine verfügbare Mailchimp/Litmus/Email-on-Acid-Rendering-Umgebung. Vor Versand Testsendung in Apple Mail, Gmail und Outlook prüfen. Kein Versand und kein Merge durchgeführt.

Der Pull Request bleibt bis zum Fotoaustausch ein **Entwurf**. Die produktive Website wird nicht verändert.
