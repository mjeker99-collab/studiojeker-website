# Newsletter V4 – Korrekturrunde (5 Punkte)

Datei: `mailchimp/studiojeker-newsletter-04-visibility.html`

## Exakt vorgenommene Änderungen

1. **Headlines kräftiger**  
   Arial Black / Helvetica Neue, `font-weight: 900`, leicht engerer Zeichenabstand  
   (`letter-spacing: -0.3px` / `-0.4px`). Schriftgrösse unverändert.  
   Betrifft: Hero, Sichtbarkeit im Abo, Professioneller Content, Persönliches Gespräch, Unsere Visibility Abos.  
   «Martin Jeker» bleibt Abschnittstitel (Arial / 700).

2. **Footer**  
   Sichtbaren Platzhalter `*|HTML:LIST_ADDRESS_HTML|*` entfernt (Adresse bleibt über `footer_company`).  
   Logo, Claim, Links, Social Icons sowie Mailchimp-Tags `*|UPDATE_PROFILE|*` / `*|UNSUB|*` beibehalten.

3. **Martin-Portrait ~50 % kleiner**  
   Anzeige von 380×317 auf 190×158 (`width:190px; max-width:50%`). Bilddatei unverändert.

4. **Visibility-Abos-Bild**  
   Schirm → `promo-nora-schild.jpg` (Nora mit Schild) im bestehenden 320×400-Rahmen. Promo-Texte/Button unverändert.

5. **Videolinks**  
   - Hero (Bild + «→ Video abspielen»): `https://vimeo.com/1226148277` (Baseball animation)  
   - Promo-Bild: `https://vimeo.com/1216347773` (Showreel_Allgemein_2026 / Visibility-Spot)  
   - Promo-CTA «Jetzt Promoangebot sichern»: weiterhin `https://www.studiojeker.ch/content-abo/`

## Vorschauen (Chromium)

| Breite | Datei |
| --- | --- |
| 700 px | [v4-desktop-700.png](previews/v4-desktop-700.png) |
| 390 px | [v4-mobile-390.png](previews/v4-mobile-390.png) |
| 320 px | [v4-mobile-320.png](previews/v4-mobile-320.png) |

14/14 Bilder geladen, kein horizontaler Überlauf; kein sichtbarer `LIST_ADDRESS`-Platzhalter.

## Status

Stop – auf Freigabe warten. Kein Merge/Deploy/Versand.
