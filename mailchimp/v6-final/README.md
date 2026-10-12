# Studiojeker Newsletter V6 – geprüfter Entwurf

## Eindeutige Ausgangsbasis

GitHub am 12. Oktober 2026 erneut geprüft: Newsletter-Branches `cursor/mailchimp-newsletter-template-9f09`, `cursor/newsletter-compare-preview-9f09`, `cursor/newsletter-relaunch-final-9f09`; letzte Newsletter-PRs #128 (Versionsvergleich), #127 (Revert von #126), #126 (historische V3) und #124 (V2). Kein V5-Branch/-PR auf GitHub vorhanden. Aktuellster V5-Arbeitsstand dieser Sitzung: lokaler Commit `29253ee` (`mailchimp/v5-desktop/`, auf V4 `e493eb7`). Die zuletzt erzeugte V6-Arbeitsdatei wurde daraufhin weiterbearbeitet; nicht als bereits geprüfte Finalvorlage behandelt.

Verbindliche Designreferenz: V2 aus PR #124, Commit `9584d5e`. Der Code-PR enthält ausschliesslich neue V6-Dateien. V1–V5 werden nicht überschrieben; produktive Website, CMS und Deployment-Dateien bleiben unverändert. Auf `gh-pages` werden nur Dateien unter dem neuen Ordner `v6-final/` ergänzt, alle bisherigen Dateien bleiben byte-identisch.

## Vorschauen

- Desktop 700 px: `https://mjeker99-collab.github.io/studiojeker-website/v6-final/desktop.html`
- Mobile 390 px: `https://mjeker99-collab.github.io/studiojeker-website/v6-final/mobile.html`
- Responsive HTML: `https://mjeker99-collab.github.io/studiojeker-website/v6-final/index.html`

Falls GitHub Pages im Repository noch nicht aktiviert ist, funktionieren die ebenfalls geprüften GitHub-HTMLPreview-Links:

- https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v6-final/desktop.html
- https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v6-final/mobile.html

Die Desktop-/Mobile-Seiten betten das tatsächliche Newsletter-HTML in einen Browser-Viewport mit 700 bzw. 390 px Breite ein. Keine Screenshot-Imitation. Die Browser-Vorschau ersetzt nur accountabhängige Mailchimp-Links/Listenadresse; die Versanddatei enthält alle Original-Merge-Tags.

## Behobene Fehler und Designsystem

- Einheitlich Arial, Helvetica, sans-serif. Hero 32/34.56 px Desktop, 28/30.24 px Mobile; Abschnittsüberschriften 24/27.6 bzw. 22/25.3 px; Text 15/21.75 px; Eyebrows 11 px bold, CTA 14 px bold, Footer 11 px.
- Die Schreibweise `Studiojeker entwickelt sich weiter.` und `Content. Distribution. Visibility.` wurde bereits im verbindlichen V6-Auftrag ausdrücklich freigegeben. Diese zwei Überschriften folgen dieser Vorgabe; alle anderen Texte und Bezeichnungen bleiben wortgetreu. Keine CSS-Versalisierung regulärer Überschriften. Claims bleiben versal.
- Keine künstlichen Inhalts-Mindesthöhen, Spacer-Tabellenzeilen, CSS Grid/Flexbox oder `object-fit`. Inhalte verwenden echte Tabellen und zentrale Inline-Stile. Absatzabstand 12 px, Headline-Abstand 14 px, Hauptbereich-Abstand 28 px, Innen-Padding 22–24 px.
- Hero wieder als gemeinsamer Split-Block mit Cyan, Text links und Bild rechts. Beide echten Zuschnitte füllen die Bildspalte vollständig ohne Seitenränder. Desktop-Bild ist nicht höher als die linke Textzelle. Mobile zeigt zuerst Text und dann den eigenen 4:3-Zuschnitt.
- Intro-Text erhält volle Breite; keine leere linke Spalte neben einer langen Textwand. KI behält Motorradfahrer links / Headline und ersten Absatz rechts, weitere vollständige Absätze laufen darunter über die Textbreite. Dadurch kein grosser leerer Bereich unter dem Bild.
- Cyan aus V2 (`#00c8ff`), überall 10 px breit, Tabellenzellen übernehmen exakt die jeweilige Inhaltsblockhöhe. Bei der tatsächlichen Prüfung wurde ein auf 0 px schrumpfender Balken behoben (konkurrierende 100%-Breite der Nachbarzelle).
- Vier gleich grosse Kompetenzbilder mit echtem 4:3-Zuschnitt. Desktop vier Karten, Mobile zwei Karten pro Reihe – auch bei 320 px. Beschriftungen vollständig sichtbar, einheitlich und umbrechbar.
- Abschluss mit dem bisherigen Rennfahrerbild, kompaktem Textblock und kurzer Verbindung zum Footer.
- Claim-freies Original-PNG-Logo. Footer-Claim einmal separat, saubere Navigation/Legalzeile und gleich grosse Social-Icons. Firmenadresse, Profil-/Abmeldelinks erhalten. Kein technischer Vorschauhinweis in der Versanddatei.

## Bilder / dauerhaftes Hosting

Alle neuen Bilddateien liegen versioniert unter `assets/` und öffentlich auf dem bestehenden `gh-pages`-Branch. Die E-Mail verwendet deren öffentliche `raw.githubusercontent.com`-HTTPS-Adressen. Keine lokalen Bildpfade. Logo, Motorradfahrer, Rennfahrer und Social-Icons behalten ihre nachgewiesenen bestehenden HTTPS-Adressen.

Baseballer-Original bleibt unverändert:
https://mcusercontent.com/7a63bdb9ae2206b3172aeb686/images/a92174a5-2cf6-6a47-e913-705a5ab4e10b.jpg

Original 2000×2940 px. Desktop: Ausschnitt `(220,660)–(1980,1980)`, Export 1040×780 px. Mobile: eigener Ausschnitt `(260,660)–(1980,1950)`, Export 800×600 px. Person, Schläger und Bewegung bleiben erhalten, dunkle Leerflächen reduziert. Nur Zuschnitt/Verkleinerung/JPEG-Optimierung, keine Bildgenerierung. Die vier 600×450-px-Kompetenzexporte stammen aus den bestehenden Originalbildern aus V3/PR #126.

## Qualitätssicherung

- Wirkliche Chromium-Renderings bei **700, 600, 390 und 320 px**, inklusive vollseitiger PNG-Dateien `preview-*.png`.
- Desktop 700 und Mobile 390 selbst visuell geprüft; Fehler vor Veröffentlichung korrigiert.
- Automatisierte Prüfungen: alle 28 freigegebenen Textblöcke vollständig vorhanden; identische Typografie/Hierarchie; keine Versalisierung normaler Headlines; alle Bilder geladen und proportional; Hero füllt Bildzelle; Desktop-Bildhöhe ≤ Textzelle; Cyan 10 px und bündig zur Zeile; Kartenformate gleich; vier Spalten bzw. 2×2; keine abgeschnittenen Captions; kein horizontaler Überlauf.
- `python verify-copy.py` als reproduzierbare Inhalts-/Mailchimp-Prüfung.
- `qa-layout.json` dokumentiert gemessene Breiten, Höhen und Schriftwerte. `qa-links.json` dokumentiert HTTP-/MIME-Prüfung; neue öffentliche Links nach dem Pages-Push zusätzlich live geprüft.
- E-Mail-HTML ca. 25 KB vor Mailchimp-Inlining/Tracking.

## Mailchimp und offene Grenzen

Mailchimp → Code your own → Paste/Import **`studiojeker-newsletter-v6.html`**, nicht die Browser-Wrapper. Alle Bilder sind bereits öffentlich gehostet. Audience-/Firmenadresse in Mailchimp prüfen.

Keine angebundene Mailchimp-/Litmus-/Email-on-Acid-Rendering-Umgebung verfügbar. Daher kein echter E-Mail-Client-Test und kein Versand durchgeführt. Chromium und Tabellen-/Inline-CSS-Prüfung ersetzen keine Testsendung an Apple Mail/iPad, Gmail und Outlook Desktop/Web. Die MSO-Hülle und ein einziger Desktop-Hero sind für Outlook vorgesehen; Clients ohne Media Queries zeigen das Desktop-Layout. Vor Versand ist eine echte Mailchimp-Testsendung noch erforderlich. Nicht automatisch mergen.
