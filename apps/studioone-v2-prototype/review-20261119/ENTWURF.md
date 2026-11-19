# Designentwurf 19. November 2026

Statische Ansichten für die Beurteilung. Keine Anwendung, keine Schnittstelle, keine Datenbank, kein Versand, keine Veröffentlichung. Der bestehende Prototyp `apps/studioone-v2-prototype/index.html` ist nicht verändert. StudioONE V1 ist nicht verändert.

## Drei Ansichten

| Ansicht | Datei | Desktop 1440 × 900 | iPad quer 1024 × 768 | iPad hoch 768 × 1024 |
| --- | --- | --- | --- | --- |
| Übersicht | `uebersicht.html` | `export/uebersicht_desktop_1440.png` | `export/uebersicht_ipad_quer_1024.png` | `export/uebersicht_ipad_hoch_768.png` |
| Akquise, Empfänger | `akquise.html` | `export/akquise_desktop_1440.png` | `export/akquise_ipad_quer_1024.png` | `export/akquise_ipad_hoch_768.png` |
| Newsletter | `newsletter.html` | `export/newsletter_desktop_1440.png` | `export/newsletter_ipad_quer_1024.png` | `export/newsletter_ipad_hoch_768.png` |

Zusätzlich `export/newsletter_ipad_hoch_768_vorschau.png`: derselbe Entwurf, Tab Vorschau. Die PNG-Höhen folgen dem Inhalt, die Viewport-Breite ist die Gerätebreite. Gemeinsame Mappe: `export/studioone-v2-designentwurf-20261119.pdf`.

Alle Namen und Firmen sind Beispiel oder Muster. Oben auf jeder Ansicht steht «Designentwurf · Beispieldaten · kein Versand».

## Entscheidungen in diesen Ansichten

- Sechs Hauptbereiche plus Einstellungen. Projekte, Bibliothek, Kalender und Einstellungen führen auf `noch-offen.html`. Das ist ein Hinweis, kein vierter Entwurf.
- Übersicht: Fortsetzen ist die eine hervorgehobene Aktion, solange der Beispiel-Newsletter offen ist. «Aufgabe beginnen» bleibt direkt daneben, ohne zweite Cyan-Schaltfläche. Zwei offene Punkte, jeder mit nächster Handlung.
- Akquise: der Ablauf ist sichtbar, der aktuelle Schritt ist Empfänger. «Alle vollständigen auswählen» gilt für die Liste. Die Zahl «4 von 6» ist gesetzt. Bereits angeschrieben und fehlende E-Mail sind nicht vorausgewählt und blockieren die anderen nicht. Weitere Wege liegen unter «Weitere Optionen».
- Newsletter: Bearbeiten und aktuelle Vorschau nebeneinander. Auf dem iPad im Hochformat zwei Tabs desselben Entwurfs. Vorige Ausgabe kopieren, die Ausgabe November bleibt unverändert. Bilder, Betreff, Text, Links und der Satz «Gespeichert in dieser Darstellung» sind sichtbar. Die einzige hervorgehobene Aktion ist «Prüfen». Danach Mailchimp-Entwurf und ausdrückliche Testmail. Der Versand an die Liste bleibt in Mailchimp. Ein Link ohne Ziel stoppt die Prüfung und nennt die nächste Handlung.
- Schwarze Flächen für Navigation und für den offenen Arbeitsschritt. Das ONE im Logo ist das ONE der bestehenden Datei, nicht neu gezeichnet und nicht als grosses Wasserzeichen wiederholt.
- Schaltflächen und Navigationsziele sind mindestens 48 Pixel hoch. Die Bildwahl und die Kontaktzeile sind ohne Hover bedienbar. Die ganze Kontaktzeile ist die Trefffläche.

## Schrift, gemessen

Vorgabe in `entwurf.css`: `Arial, Helvetica, sans-serif`. Keine geladene Webschrift. `letter-spacing` ist `normal`, auch berechnet im Browser.

In diesem Linux-Export sind Arial und Helvetica nicht installiert. Chrome meldet über `CSS.getPlatformFontsForNode` für Fliesstext `Arimo` / `Arimo` und für die Überschrift `Arimo` / `Arimo-Bold`. Arimo ist die Fontconfig-Ersetzung für den Namen Arial auf diesem Rechner (`fc-match Arial` zeigt Arimo). Die PNG-Dateien zeigen deshalb Arimo, nicht Arial.

Auf einem Rechner mit installiertem Arial zeichnet derselbe Schriftstapel Arial. Helvetica wäre der zweite Name, `sans-serif` der letzte. Eine Laufweiten-Korrektur, wie sie V1 in mehreren CSS-Dateien setzt, ist hier bewusst nicht übernommen. Siehe Abdeckungsmatrix.

Gemessene Grössen auf der Übersicht bei 1440 Pixel Breite: Fliesstext 16px, Gewicht 400. Überschrift 34px, Gewicht 700, Zeilenhöhe 40.8px. Auf schmaleren Breiten ist die Überschrift 28px.

Der Kontrast der verwendeten Farbpaare ist rechnerisch geprüft, nicht mit einem Screenreader. Beispiele: Text `#11171b` auf Weiss 18.1, Text auf Cyan `#00c5e8` 8.7, Navigation `#d5dee3` auf `#101519` 13.5, Link `#0b6e86` auf Weiss 5.9. Das ist keine Fachabnahme für Barrierefreiheit.

## Logo

`assets/studioone-app-logo.png` ist eine Kopie von `apps/akquise/brand/studioone-app-logo.png`. SHA256 beider Dateien: `5cb330a84aae7969b9ec9abe37b2633c154c2a98e280c8414050f93f442e3f2c`. Die Datei ist nicht beschnitten und nicht neu gezeichnet. Original 1280 × 593, deckende Pixel nur Weiss und Cyan `#00c5e8`.

## Tatsächlich ausgeführt

- Lesen von Navigation, Dashboard, Mailstudio, Newsletter, Bibliothek, Kalender, Einstellungen, Prisma-User, Design-CSS und den beiden Workflows. Kein V1-Testlauf.
- `node exportieren.mjs` mit headless Chrome: neun Ansichtsbilder plus die Vorschau-Variante. Kein horizontaler Überlauf bei 1440, 1024 und 768. Keine bedienbare Fläche unter 44 Pixel Höhe in der gesetzten Prüfung. Auf dem iPad-Hochformat bleibt der Betreff «Sichtbarkeit im Dezember» nach dem Wechsel auf Vorschau erhalten, und Bild 2 ersetzt Bild 1 in der Vorschau. Protokoll: `export/messung.json`.
- Plattformschrift wie oben, in einem zweiten Chrome-Aufruf über `CSS.getPlatformFontsForNode`.
- Suche nach Eszett in den Entwurfsdateien: kein Treffer.
- Farbkontrast rechnerisch, siehe oben.

Nicht ausgeführt: Lint, Typecheck, Build oder Playwright von V1. Kein Merge, kein Deployment, keine Veröffentlichung. Kein Test auf einem physischen iPad.

## Offen

- Wireframes fehlen für Recherche, Import, Briefing, persönliche Entwürfe, Zeitpunkt, Einzelresultate, Social, Website, Bild, Video, Grafik, Projekte, Bibliothek, Kalender und Einstellungen.
- Ein 3D-Bereich ist im gelesenen V1-Code nicht vorhanden.
- Kunden über Projekte oder Akquise, Rollen und ein schreibender Kalender-Sync sind nicht entschieden.
- Die Vorschau tippt in der HTML-Datei nicht live mit. Das ist eine Grenze der statischen Datei.
- «Gespeichert» ist eine Beschriftung, keine Ablage.
- Martins visuelle und fachliche Abnahme steht aus.

## Nächste Schritte, erst nach Rückmeldung

1. Diese drei Ansichten beurteilen: eine Aktion, Auswahl ohne Einzelpflicht, Newsletter neben der Vorschau, Schrift auf einem Rechner mit Arial.
2. Danach die fehlenden Wireframes in derselben Art, beginnend mit Briefing und persönlicher Prüfung, dann Bibliothek und Projekte.
3. Erst nach Freigabe der Bediengrundlage eine eigene V2-Laufzeit planen. V1, Versand, Merge und Deployment bleiben gesperrt, bis Martin sie einzeln freigibt.
