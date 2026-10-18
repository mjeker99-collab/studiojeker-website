# Newsletter 02 – Bild- und Footer-Korrekturen

Ausgangsbasis: origin/main ace2c4d, Newsletter 02 aus dem bereits gemergten PR #131. V7 und Newsletter 03 unverändert.

## Änderungen innerhalb der fünf beauftragten Punkte

1. Auge aus dem bereitgestellten Original `mailchimp/newsletter03/assets/eye-original.jpg`, mechanisch auf die bisherigen Hero-Exportgrössen 1040×780 und 800×600 zugeschnitten. Eingebrannter Playbutton in bisherigen Grössen; bestehendes Hero-Linkziel unverändert.
2. Nora: vorhandenes freigegebenes Porträt gemäss ausdrücklicher Rückmeldung „Verwenden“ unverändert weiterverwendet. Das verfügbare Original ist bytegleich; kein erfundener Ersatz.
3. Vier aktuelle Website-Motive als einheitliche 600×450-JPEGs. Exakte Quellen in sources.json. Titel und Reihenfolge unverändert, auch die vorhandene Beschriftung „Digital & Social Media Marketing“.
4. Schlussblock: Unternehmerin im blauen Blazer aus dem aktuellen Website-Business-Motiv, engerer Fokus auf die Frau. Export 1140×669 entspricht exakt dem bisherigen Seitenverhältnis 760×446.
5. Footer: doppelte automatische Adress-/vCard-Ausgabe entfernt. Einmalige, im Repository unter lib/content/contact.ts bestätigte vollständige Postanschrift bleibt erhalten: Studiojeker GmbH, Hauptstrasse 73, CH-4528 Zuchwil. Alle sieben verlangten Links unverändert. Mailchimp-Tags ARCHIVE, UPDATE_PROFILE und UNSUB erhalten. Das entfernte HTML:LIST_ADDRESS_HTML ist ein gültiger Mailchimp-Tag; sein Problem war die zusätzliche dynamische Adresse/Adressbuchausgabe, nicht die Syntax.

## Verifikation

- Normalisierter HTML-Vergleich: ausschliesslich Bild-SRC/ALT und Entfernung der zusätzlichen Footer-Adressausgabe unterscheiden sich. Alle href-Werte exakt identisch. CSS, Inline-Styles, DOM-Struktur ausser der entfernten Footer-Zeile, Typografie, Bilddimensionen, Spalten, Cyan-Balken, Abstände und Responsive-Regeln unverändert.
- Chromium bei 700, 390 und 320 px: alle Bilder geladen, kein horizontaler Überlauf. Sämtliche gemessenen TD-/Headline-/Absatz-/Bildgeometrien ausserhalb des Footers exakt gleich zum Ausgangsstand. layout-checks.json und image-checks.json.
- Desktop- und Mobile-Screenshots tatsächlich visuell kontrolliert: Auge zentriert, Playbutton sichtbar, Nora klar erkennbar, Karten Desktop vier / Mobile zwei Spalten, Beschriftungen vollständig, Footer ohne doppelte Adresse.
- Öffentliche HTTPS-Bildquellen, keine lokalen Versand-Bildpfade, keine neuen Skripte oder Video-/iframe-Elemente in der Versanddatei. Iframes ausschliesslich in separaten Browser-Vorschau-Hüllen.

## Prüfgrenzen

Keine verbundene Mailchimp-/Litmus-/Email-on-Acid-Rendering-Umgebung. Echte kampagnen-/empfängergebundene Auflösung von Archiv, Profileinstellungen und Abmeldung erfordert eine Mailchimp-Testsendung; diese ist nicht erfolgt. Website-Lint/Typecheck/Build nicht erneut ausgeführt: Änderungen ausschliesslich an eigenständigem E-Mail-HTML und dessen Bild-/Vorschauartefakten, keine Website-Codeänderung. Kein Versand, kein Merge, keine produktive Websiteänderung.

## Nachtrag: Showreel-Textlink und neues Nora-Foto

Gemäss nachgereichter markierter Vorschau vom 18.10. wurde im bestehenden Weissraum unter der Hero-Headline der Link „→ Video abspielen“ ergänzt. Er führt wie das unveränderte Herobild auf https://www.studiojeker.ch/#home-showreel-title. Gestaltung identisch zu den vorhandenen CTA-Links. Neue eindeutige Bearbeitungsregion `hero_video_cta`.

Noras neue Anlage „Foto 4.jpg“ (1254×1254) ist bytegleich als assets/nora-cyan-original.jpg archiviert und rein mechanisch, ohne generative Bearbeitung, auf das bisherige 16:9-Format zugeschnitten: assets/nora-cyan.jpg, 1200×675. Gesicht und Cyan-Papier bleiben klar erkennbar. Das vorherige Porträt und alle übrigen Assets bleiben erhalten.

Quellvergleich zum vorherigen Stand: ausschliesslich neue CTA-Region und Nora-SRC/ALT geändert. Chromium bei 700/390/320 px ohne Überlauf und mit vollständig geladenen Bildern. Hero-Bildmasse und Kompetenzkarten exakt unverändert. Desktop-Gesamthöhe bleibt 2035.53125 px; Mobile wächst durch den ausdrücklich gewünschten Textlink um 58 px. Beide Renderings tatsächlich visuell kontrolliert. followup-checks.json enthält den Vorher-/Nachher-Vergleich. Kein Merge, keine Websiteänderung.

## Korrektur: Bildlinks nach Branch-Löschung

Nach dem Merge von PR #157 wurde der Arbeitsbranch gelöscht. Die acht darauf referenzierenden Bildadressen lieferten danach HTTP 404. Alle acht SRC-Adressen in Versanddatei und Browser-Vorschau sind deshalb auf den unveränderlichen, bereits vorhandenen Asset-Commit 476a19450a7ae47b1c067d1faed3b8b8eb7c2a48 umgestellt. Diese Links hängen weder vom Arbeitsbranch noch von dessen Namen ab. Inhalte, Layout und Bilddateien ändern sich nicht. Ein normalisierter Vergleich bestätigt ausschliesslich den Austausch des Ref-Segments in den acht Bild-SRC-Werten.

## Höheres Nora-Bild nach Screenshot-Korrektur

Nur Noras Foto erhält einen höheren Zuschnitt aus demselben Original: 1200×1000 (6:5) statt 1200×675 (16:9). Die vorhandene Bildbreite und sämtliche Spalten, Styles, Texte, CTA-Links und übrigen Bilder bleiben unverändert. HTML-Höhenattribut passend von 168 auf 250 bei unveränderter Referenzbreite 300 gesetzt; Anzeige weiterhin proportional mit height:auto. Alter Export bleibt erhalten. Neuer Bildlink ist auf den unveränderlichen Asset-Commit 7361ce0ff0f8d302c29c23ac7cc3ef5a15a6fbc4 fixiert.

Bei 600 px Breite sinkt die leere Fläche unter Nora von 68.64 auf 4.14 px; bei der schmaleren Desktop-Ansicht mit 550 px von 82.14 auf 24.14 px. Bei 700 px endet die Bildzelle bündig mit dem Bild. Bei Mobile bleibt der bestehende 16-px-Abstand zum folgenden Text erhalten. Renderings bei 700/600/550/390/320 px, alle Bilder geladen, keine Verzerrungen oder horizontalen Überläufe. Desktop 700/550 und Mobile 390 tatsächlich visuell kontrolliert. nora-tall-checks.json enthält Messwerte. Quellvergleich bestätigt ausschliesslich die neue Nora-SRC und das dazugehörige HTML-Höhenattribut.
