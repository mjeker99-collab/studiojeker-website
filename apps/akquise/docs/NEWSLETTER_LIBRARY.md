# StudioONE Newsletter-Bibliothek

## Bedienung

Unter **Newsletter** stehen die Originale als geschützte Vorlagen bereit:
Master-Template V7 (Relaunch), Newsletter 02 (Visibility), Newsletter 03 (Sichtbarkeit im Abo).

1. **Bestehende Ausgaben importieren** übernimmt die drei Originale einmalig als
   persistente Entwürfe. Erneutes Klicken überschreibt nichts und legt keine Dubletten an.
   Importierte Zielgruppen sind ausdrücklich noch festzulegen; es werden keine Empfänger importiert.
2. Vorlage auswählen und **Newsletter erstellen** oder eine vorhandene Ausgabe
   **duplizieren**. Kopien behalten die Kampagne, starten aber ohne Termin/Freigabe/Exportstatus.
3. Betreff, Preheader, Zielgruppe und die Text-, Bild- und Linkfelder bearbeiten.
   Bilder benötigen dauerhaft öffentliche HTTPS-URLs. Die private Content-Studio-
   Asset-URL ist nicht für E-Mail-Empfänger geeignet. Eine Auswahl aus einer künftigen
   öffentlichen Medienbibliothek ist noch nicht angeschlossen.
4. Desktop/Mobil/Mobil-klein prüfen, Version speichern, vollständig prüfen und freigeben.
5. **HTML & Text exportieren**. HTML in Mailchimp übernehmen; Betreff/Preheader separat
   setzen, Empfänger wählen, Mailchimp-Testsendung und endgültigen Versand dort ausführen.

Newsletter 03 enthält noch zu prüfende Angebotsbedingungen; der Hinweis bleibt im
Editor sichtbar. Der Import setzt weder einen Versandtermin noch einen historischen
Versandstatus. Die Originalvorlagen bleiben unabhängig von bearbeiteten Entwürfen erhalten.
Bestehende einfache Newsletter ohne Vorlagenfelder bleiben unverändert bearbeitbar/exportierbar.

## Implementierung

Alle Änderungen liegen in `apps/akquise`. Keine neue Abhängigkeit und keine Migration.
Snapshots nutzen die bestehenden `MarketingVersion`-JSON-Felder. Freigaben und Exporte
bleiben an die exakte Version und ihren Hash gebunden. Änderungen entwerten Freigaben.

`templates/newsletter-library.json` enthält die originalen HTML-Dateien mit Quellpfad,
SHA256 und exakt begrenzten Text-/Attribut-Slots. `scripts/compile-newsletters.py`
kompiliert die drei geprüften Repository-Dateien ohne HTML-Neuserialisierung. Unbearbeitete
Slots behalten sogar ihre Entity-Schreibweise. CSS, Tabellen, Outlook-Kommentare,
Logo, Claim und Footer einschließlich Mailchimp-Tags sind geschützt.

Vorlagen-IDs sind unveränderliche Versionen: veränderte Quelldateien zukünftig unter
**neuen IDs hinzufügen**, nie bestehende IDs überschreiben. Sonst würden alte Freigaben
auf anderes HTML zeigen. SHA256 dokumentiert die Quellfassung.

`lib/hub/newsletter-template.ts`: gemeinsamer Renderer und strikte Feld-/URL-Validierung.
`lib/hub/newsletter-library.ts`: authentifizierter Import und Duplizieren. Ein
PostgreSQL-Advisory-Lock plus Audit-Importmarker serialisiert wiederholte Importe.
`app/newsletter/NewsletterEditor.tsx`: gruppierte Inhaltsfelder und isolierte Vorschau.
`app/hub/Hub.tsx`: Bibliothek, Entwürfe und bestehender Freigabe-/Exportablauf.

HTML-Eingaben werden escaped; Links/Bilder akzeptieren nur HTTPS ohne Zugangsdaten.
Der Server lädt keine externen URLs. Die Vorschau läuft in einem leeren iframe-Sandbox,
mit separater restriktiver CSP und ohne aktive Links. Für die vorhandenen öffentlichen
Newsletter-Bilder erlaubt die App-CSP zusätzlich HTTPS-Bilder; Script-, Connect- und
Origin-Regeln bleiben unverändert. Vorschau-URLs senden keinen Referrer.

## Prüfung in dieser Arbeitsumgebung

- ESLint und TypeScript: bestanden.
- 29 Unit-/Konfigurationstests: bestanden, einschließlich bytegleicher Originalausgabe,
  Slot-Isolation, HTML-Escaping, URL-Validierung und geschützter Mailchimp-Tags.
- Next.js-Produktionsbuild: bestanden.
- PostgreSQL-Integration: neuer Test hinzugefügt, hier nicht ausführbar. PostgreSQL
  lässt sich wegen Root-/Benutzerbeschränkungen der Umgebung nicht starten; der
  Testlauf scheitert im Datenbank-Setup, bevor Anwendungstests ausgeführt werden.
- Browser/Responsive/Accessibility: Test für Import, Duplikat, Bearbeitung, Vorschau
  (1440/1024/390), Freigabe und Download hinzugefügt, hier nicht ausgeführt. Chromium-
  Download lieferte ein unvollständiges Archiv. Keine visuelle Abnahme behauptet.

Vor Merge müssen die vorhandenen GitHub-Actions-Prüfungen mit PostgreSQL und Chromium
sowie die visuelle Prüfung erfolgreich sein. Keine Produktionsdaten geändert,
kein Merge/Deployment und kein Mailchimp-/SMTP-Versand durch diese Implementierung.

## Korrektur nach erster CI-Prüfung

GitHub führte 30 von 31 Integrationstests erfolgreich aus. Der neue Newsletter-Test
deckte auf, dass PostgreSQL JSONB die Reihenfolge der freien Inhaltsfelder ändert.
Die Prüfsumme sortiert deshalb jetzt die Newsletter-Feldschlüssel, ohne Werte oder
gespeicherte Inhalte zu verändern. Bestehende Hashes von Inhalten ohne diese neuen
Vorlagenfelder bleiben kompatibel. Ein zusätzlicher Regressionstest prüft identische
Hashes nach Umordnung, unterschiedliche Hashes nach Textänderung und die unveränderte
Legacy-Berechnung. Die vollständige CI muss den Fix erneut prüfen.
