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
