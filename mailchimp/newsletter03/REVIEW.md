# Studiojeker Newsletter Nr. 3 – Sichtbarkeit im Abo

Versanddatum: 11. November 2026 (nicht automatisch terminiert).  
Betreff in Mailchimp setzen: **Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.**  
Preheader: Professioneller Content, regelmässig geplant, produziert und veröffentlicht.

## Grundlage

PR #131 wurde in main mit d7a7587 gemergt. Als verbindliche Referenz dient Newsletter Nr. 2 einschliesslich der anschliessend ausdrücklich gewünschten Mobile-Korrektur mit 16 px Innenabstand für den Team-Textblock. Die vollständige Referenzkopie liegt in `reference-newsletter02.html`, SHA256 `b3191667d78d8bac964aca498d3c5817e3ac08939a8fe8787b21ff219be195e7`. Die bestehende Vorlage wurde nicht geändert.

## Vorschauen

| Breite | Referenz Nr. 2 | Newsletter Nr. 3 |
| --- | --- | --- |
| 700 px | [Referenz](previews/reference-700.png) | [Neue Ausgabe](previews/newsletter03-700.png) |
| 390 px | [Referenz](previews/reference-390.png) | [Neue Ausgabe](previews/newsletter03-390.png) |
| 320 px | [Referenz](previews/reference-320.png) | [Neue Ausgabe](previews/newsletter03-320.png) |

## Inhalte und Bilder

Die Einleitung und Abo-Beschreibung stehen im bestehenden Einleitungsmodul. Der vorhandene Bild-/Textblock enthält die kanalübergreifende Content-Produktion sowie Strategie, Content und Distribution. Der Textblock vor den Kompetenzkarten beschreibt Nora. Der Schlussblock enthält die kostenlose Analyse, die Angebotsbedingungen und Nora direkt am CTA. Die bestehende Reihenfolge Text, Headline, CTA, Bild im Schlussblock ist unverändert.

Alle fünf gelieferten Motive sind verwendet: Foto 3 (Frau in Blau) im Hero, Foto 1 (Auge) im Content-Block, Foto 2 (Frau im schwarzen Anzug) in der Business-Karte, Foto 4 (Cyan-Motiv) in der Architecture-Karte und Foto 5 (Nora) im Kontaktblock. Die vier Kompetenzkarten und ihre Links bleiben als Module erhalten; Digital- und Product-Motive bleiben unverändert. Die neuen Bildzuordnungen folgen dem späteren Bildauftrag.

Die gelieferten Originaldateien sind bytegleich unter `assets/*-original.jpg` archiviert. Das Nora-Original ist bytegleich mit dem freigegebenen Portrait aus Newsletter Nr. 2. Mechanische Zuschnitte/Skalierungen erhalten die bestehenden Bildproportionen; keine neue Bildgeneration und keine zusätzlichen Personenbilder. Sämtliche neuen Bilder verwenden commitgebundene, geprüfte HTTPS-URLs. Die Herkunft der übrigen gelieferten Motive über die Nutzerbereitstellung hinaus wurde nicht unabhängig bestätigt.

## Prüfungen

`python mailchimp/newsletter03/verify.py`: bestanden. CSS-Blöcke, Tagfolge und Verschachtelung, Inline-Styles, Schriftgrössen, Zeilenhöhen, Spalten, Cyan-Balken, Abstände, Bilddimensionen, responsive Klassen, Mailchimp-Attribute, Merge-Tags, Logos und der gesamte Footer sind identisch mit der freigegebenen Referenz. Ausschliesslich redaktionelle Texte, Bild-SRC/ALT sowie Links und die zugängliche Hero-Linkbeschreibung ändern sich.

Chromium bei 700, 390 und 320 px: alle Bilder geladen, kein horizontaler Überlauf, mobile Kompetenzkarten zweispaltig, mobile Cyan-Balken randbündig, 16 px Team-Textabstand erhalten. Die automatische Gesamthöhe verändert sich durch den neuen Textumfang.

31 URL-Prüfungen: 30 Ziele HTTP 200; der unveränderte LinkedIn-Footerlink blockiert automatisierten Zugriff mit HTTP 999. Sämtliche Bilder, die Abo-Seite `/content-abo/` und das Kontaktziel `/contact/` sind erreichbar. Protokolle: `url-checks.json` und `responsive-checks.json`. `git diff --check` bestanden. Website-Lint/Typecheck/Build sind mangels installierter Projektabhängigkeiten nicht ausführbar; diese Newsletter-Datei ist eigenständiges HTML.

## Offene Punkte vor Versand

Das Angebot ist noch nicht final bestätigt: kostenlose, 30-minütige Analyse mit drei Verbesserungsmöglichkeiten; ein Gespräch pro Unternehmen nach Terminvereinbarung; Gültigkeit bis 30. November 2026. Diese Bedingungen wurden wie beauftragt in den Entwurf übernommen und sind vor Versand freizugeben. Die tatsächliche Terminverfügbarkeit ist nicht geprüft.

Mailchimp-Testsendung für Outlook, Gmail und Apple Mail sowie Prüfung der tatsächlichen Merge-Tag-Auflösung und Abmeldung stehen aus. Keine Versandplanung, kein Versand, keine Änderungen an Website oder Sanity und kein automatischer Merge.
