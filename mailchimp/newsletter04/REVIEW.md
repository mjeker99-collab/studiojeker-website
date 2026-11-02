# Newsletter V4 – Text, Headlines, Martin-Block (02.11.2026)

Datei: `mailchimp/studiojeker-newsletter-04-visibility.html`  
Basis: vorhandene V4 auf PR #313. V3-Dateien unverändert. Kein Merge, kein Deploy, kein Versand.

## Änderungen

1. **Headlines im Charakter von Helvetica Neue Black**  
   Schriftgrössen unverändert. Stack, der eine echte Black-Schnittstelle wählt, sobald sie installiert ist:
   `Helvetica Now Display`, `HelveticaNeue-Black`, `Helvetica Neue Black`, danach `Arial Black`, erst dann `Helvetica Neue`.  
   `font-weight:900` plus `font-synthesis:none`, damit Arial Black nicht zusätzlich künstlich gefettet wird.  
   Keine Schriftdatei eingebunden. Outlook (MSO) setzt die Überschriften auf Arial Black.  
   Betroffen: Hero, «Sichtbarkeit braucht Kontinuität», «Marketing nebenbei? Selten dauerhaft.», «Die Lösung: Sichtbarkeit im Abo», «Persönliches Gespräch vereinbaren.», «Unsere Visibility Abos.»

2. **Martin-Textblock vor den Servicebildern entfernt**  
   Überschrift «Martin Jeker», «Ihr Ansprechpartner für digitale Sichtbarkeit», der beschreibende Absatz und «Unsere Kompetenzbereiche …» sind weg. Die vier Servicebilder mit Beschriftung und Link bleiben. Der Kontaktblock mit Portrait und «Persönliches Gespräch vereinbaren.» bleibt.

3. **Gekürzter Fachartikel in den bestehenden Modulen**  
   - Betreff / `<title>`: Sichtbarkeit ist kein Luxus. Aber wer hat Zeit dafür?  
   - Preheader: Gute Unternehmen haben viel zu erzählen. Doch im KMU-Alltag fehlt oft die Zeit für Marketing.  
   - Metazeile: `STUDIOJEKER NEWSLETTER Nr. 4 / November 2026`  
   - Hero, Einleitung, zweiter Block und Lösungstext wie vorgegeben.  
   - CTA zum Fachartikel: `https://www.studiojeker.ch/content-abo/#visibility-fachartikel`  
   - Kontakt-CTA unverändert.  
   Hero-Umbruch nach dem ersten Satz, damit die beiden Sätze nicht ineinanderlaufen. Die Metazeile hält «Nr. 4 / November 2026» auf Mobilgeräten zusammen.

4. **Promo inhaltlich unverändert**  
   Start CHF 650/Monat, Plus ab CHF 1’150/Monat, Individuell auf Anfrage. Recherche, Konzeption und Einrichtung kostenlos bis 30.11.2026. Mindestlaufzeit 6 Monate. Kein Gratismonat.  
   Promo-Bild, Baseballer-Hero, Martin-Portrait, Servicebilder, Logo, Farben, Footer, Social-Icons und Mailchimp-Merge-Tags unverändert. Das vorhandene Promo-Bild ist der Regenschirm, kein neues Motiv.

## Chromium

Gemessene Breite des Wortes «Sichtbarkeit» bei 32px: Stack 214.52 px = Arial Black 214.52 px. Liberation Sans Bold liegt bei 183.17 px. In dieser Umgebung ist weder Helvetica Neue Black noch Helvetica Now Display installiert; Chromium verwendet deshalb Arial Black.

| Breite | Ergebnis |
| --- | --- |
| 700 | 14/14 Bilder, kein horizontaler Überlauf |
| 390 | 14/14 Bilder, kein horizontaler Überlauf |
| 320 | 14/14 Bilder, kein horizontaler Überlauf |

Vorschauen: `previews/v4-desktop-700.png`, `previews/v4-mobile-390.png`, `previews/v4-mobile-320.png`.
