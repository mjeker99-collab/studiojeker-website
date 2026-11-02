# Newsletter V4 Video-Version

Neue Datei: `mailchimp/studiojeker-newsletter-04-visibility-video.html`  
Unverändert: `mailchimp/studiojeker-newsletter-04-visibility.html`

Texte, Farben, Schriften, Logo, Footer und die übrigen Bausteine sind dieselben wie in der bestehenden V4. Geändert sind nur die beiden Bildflächen und ihre Videolinks.

## Hero

Das Baseballer-Motiv füllt den bestehenden Rahmen (386×290, Dateien 1040×780 und 800×600). Der Geräte-Rahmen der bisherigen Standbildaufnahme ist entfernt, das Motiv bleibt dasselbe. Ein zentraler Playbutton liegt auf dem Bild. Klick auf Bild oder Playbutton öffnet das bereits hinterlegte Video `https://vimeo.com/1216349266` (Showreel Social Media). Der Textlink «→ Video abspielen» zeigt auf dieselbe Adresse.

## Promo

Nora mit der cyanfarbenen Tafel füllt die bisherige Promo-Bildfläche im Seitenverhältnis 4:5. Zentraler Playbutton. Der Videolink ist getrennt vom Hero und zeigt auf den Visibility-Abo-Film `https://vimeo.com/1216347773` (Showreel Allgemein 2026, dasselbe Video wie auf der Content-Abo-Seite). Promo-Text, Preise und der Button «Jetzt Promoangebot sichern» sind unverändert.

## In StudioONE bearbeitbar

Bildquelle und Videolink sind getrennte Felder, wie bei den bisherigen Vorlagen:

- Hero-Bild: `mc:edit="hero_image_desktop"` und `hero_image_mobile`
- Hero-Videolink: href des umschliessenden Links
- Promo-Bild: `mc:edit="promo_image"`
- Promo-Videolink: href des umschliessenden Links, unabhängig vom Hero

Die Datei ist eine neue Fassung und ersetzt keine bestehende Vorlagen-ID. In der StudioONE-Bibliothek ist sie als neue ID aufzunehmen, zum Beispiel `newsletter-04-video`. Bestehende IDs bleiben unverändert. Die laufende StudioONE-App auf `feat/akquise-production-readiness` enthält diese Ausgabe noch nicht.

## Prüfung

Chromium, 14/14 Bilder, kein horizontaler Überlauf:

| Breite | Datei |
| --- | --- |
| 700 | `previews/v4-video-desktop-700.png` |
| 390 | `previews/v4-video-mobile-390.png` |
| 320 | `previews/v4-video-mobile-320.png` |

Keine Mailchimp-Testmail und kein Versand. Beides braucht eine ausdrückliche Freigabe.
