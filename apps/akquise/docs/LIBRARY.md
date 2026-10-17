# Bibliothek und Markenprofil – Betrieb und Abnahme

## Integration

Basis: tatsächlicher GitHub-Head `cef027a6476cc0fab1354b37f660e59ebb1eebdc` von `feat/akquise-render-frankfurt` (17.10.2026). #144 und #145 sind dort gemergt. #133 → #140 → #141 bleiben gestapelt offen. Der Bibliotheks-PR hat den vollständigen Render-Branch als Ziel; keine automatischen Merges. Die Website und ihre Workflows werden nicht geändert.

Neue Bibliothekseinträge ergänzen die vorhandenen StudioAssets. `20261017150000_library_brand` fügt eine Tabelle, einen Markenrevisionszähler und Bibliotheksmetadaten für bestehende Assets hinzu. Keine Dateien werden verschoben, kein Konto und kein Briefing überschrieben, keine Freigabe neu berechnet. Kein Seed, Reset oder `db push` in Produktion.

## Nutzung

Navigation → Bibliothek. Dateien auswählen (max. acht, je 8 MB), Rechte bestätigen; Verarbeitung erfolgt nacheinander. JPEG/PNG/WebP werden vollständig dekodiert geprüft (20 MP), Originalbytes unverändert gespeichert. SHA256 und Datenbanksperre verhindern identische parallele Uploads desselben Assettyps. Der Status nennt die Wiederverwendung. TTF/OTF bleiben im vorhandenen Schriftenworkflow. Kein SVG-Upload.

PDF/TXT werden als Dokumente abgelegt und ausschliesslich als Download ausgeliefert. PDF-Signatur und Abschluss werden geprüft; keine PDF-Textextraktion, Analyse, Einbettung oder Malwarefreiheit zugesichert. TXT muss gültiges UTF-8 ohne binäre Steuerzeichen sein; bis 16 000 Zeichen stehen als explizit auswählbarer KI-Text bereit. Kein Dokument wird automatisch an OpenAI übertragen.

Texte, Vimeo-/Drive-/sonstige HTTPS-Links mit manuellen Metadaten können ohne Objektspeicher erfasst werden. Es gibt keinen serverseitigen Linkabruf, keine Embeds, keine OAuth-Verbindung und keine Drive-Synchronisation. Ein eigenes privates Bild kann als Vorschau zugeordnet werden. Für reproduzierbare Layouts ein Bild bewusst hochladen und als Motiv wählen.

Suche sowie Typ-, Kampagnen-, Marken- und Schlagwortfilter; Detailansicht mit Metadaten, Originaldownload und Verwendung in Beitragsversionen. V1 verwaltet nur die interne Studiojeker-Marke. Die Datenstruktur ist organisationsgebunden, eröffnet aber keine externen Kundenzugänge.

Archivieren blendet Inhalte aus der normalen Auswahl aus. Originale bleiben lesbar, damit bestehende Entwürfe und genehmigte Versionen weiterhin funktionieren. Keine physische Löschfunktion. Varianten/Einzelexporte verweisen auf das Ursprungsmotiv und nennen Beitrag/Version. Bestehende Exporte vor dieser Erweiterung behalten ihre vorhandenen Namen und Auditnachweise.

## Markenprofil und Content-Studio

Bibliothek → Markenprofil Studiojeker. Originales Unternehmenslogo wird aus dem vorhandenen Asset geliefert. Das StudioONE-Plattformlogo bleibt getrennt. Farben stammen aus dem bisherigen Layout. Claim, Ansprache, Leistungen, Zielgruppen, Beispiele und Lizenznachweise bleiben offen, soweit nicht eingegeben. Keine Ersatzschrift. Schriften erst nach Lizenzdokumentation auswählen. Logo-Varianten ausdrücklich markieren.

Neue Serien speichern einen unveränderlichen Stand des Markenprofils mit Revision und Logo-/Schriftprüfsummen. Bestehende Serien werden nicht automatisch aktualisiert. Layouts verwenden diesen Snapshot, nie das aktuelle Profil. Inhaltsänderungen durchlaufen weiterhin die vorhandene Versionierung/Freigabeentwertung.

Content-Studio → «Aus Bibliothek wählen» für Referenzen und Motive. Dasselbe Bild kann in mehreren Beiträgen verwendet werden. Vor KI-Start sind Briefing und ausgewählte Regeln sichtbar; ausdrücklich ausgewählte Texte können eingeblendet werden. Der Auftrag speichert seine ausgewählten Regeln/Texte vor Providerzugriff. Keine Bibliotheksvollübertragung. Rechte-, Übermittlungs- und Kostenbestätigung sowie vorhandene Budget-/Doppelauftragssperren bleiben bestehen. Link-/PDF-Inhalte werden nicht gelesen. Ohne KI-Zugang sind eigene Inhalte, Bibliothek und Planung nutzbar.

## Produktionsspeicher – konkret erforderlich

Render → Web Service → Environment, ausschliesslich serverseitig:

| Variable                      | Wert / Zweck                                                              |
| ----------------------------- | ------------------------------------------------------------------------- |
| `STUDIO_S3_ENDPOINT`          | HTTPS-Endpunkt des S3-kompatiblen Anbieters, ohne Zugangsdaten in der URL |
| `STUDIO_S3_REGION`            | tatsächliche Bucket-Region; `auto` nur wenn vom Anbieter unterstützt      |
| `STUDIO_S3_BUCKET`            | bestehender privater Bucket                                               |
| `STUDIO_S3_ACCESS_KEY_ID`     | eingeschränkter serverseitiger Zugangsschlüssel                           |
| `STUDIO_S3_SECRET_ACCESS_KEY` | Secret, niemals im Repository oder Browser                                |
| `STUDIO_LOCAL_ASSETS`         | `false`; lokaler Speicher ist in Produktion gesperrt                      |
| `CONTENT_AI_ENABLED`          | zunächst `false`; für manuellen Betrieb kein OpenAI-Key erforderlich      |

Bucket ohne öffentlichen Lesezugriff. Schlüssel nur für erforderliches Put/Get/Delete im Prefix `studiojeker/`; Delete wird für fehlgeschlagene Uploads und das einzelne Verbindungstestobjekt benötigt. Datenregion, Datenschutzvertrag, Versionierung und Backup mit Anbieter festlegen. Kein neuer Anbieter wurde gebucht. Privates Ausliefern erfolgt über die authentifizierten App-Routen mit SHA-Prüfung und ohne öffentliche Object-URLs.

Expliziter kleiner Verbindungstest in Render Shell aus `apps/akquise`:

```bash
npm run storage:check
```

Schreibt ein neu erzeugtes Testobjekt, liest es zurück, vergleicht SHA256 und entfernt nur dieses Objekt. Kein Bibliotheksinhalt wird verändert. Ein unerwarteter Fehler beim Entfernen erfordert manuelle Bereinigung des Testobjekts durch den Administrator. Kein S3-Livetest wurde ohne Zugangsdaten ausgeführt.

## Bereitstellung und erster echter Import

1. Vor Freigabe aktuelle Datenbank per Render Recovery/Export sichern; Wiederherstellungsweg und Objektspeicherbackup prüfen. Lokale Testdaten nicht übernehmen.
2. Bibliotheks-PR prüfen und bewusst in den tatsächlich verwendeten Render-Branch integrieren. Settings → Build & Deploy muss diesen Branch bestätigen. Kein automatischer Merge/Deploy durch diese Arbeit.
3. Fehlende S3-Variablen setzen; SMTP ausgeschaltet lassen (`MAIL_MODE=disabled`, beide SMTP-Schalter `false`, kein SMTP-Passwort). Bestehende `DATABASE_URL`, Login-Adressen und Konten beibehalten.
4. Manual Deploy starten. Bestehender Build `node render/build.mjs`, Pre-deploy `node render/command.mjs migrate`, Start `node render/command.mjs start`. Migration ist additiv. `/api/health/ready` muss 200 liefern.
5. `npm run storage:check` ausführen. Danach als Martin oder Nora ein eigenes kleines Testbild mit belegten Nutzungsrechten hochladen, Vorschau/Download und Neuladen prüfen. Dasselbe Bild erneut auswählen: Status muss Wiederverwendung nennen.
6. Markenprofil mit Original-Logo und lizenzierten Schriften vervollständigen. Einen Entwurf mit «Aus Bibliothek wählen» anlegen; keinen kostenpflichtigen KI-Auftrag starten, bis OpenAI gesondert eingerichtet und freigegeben ist.
7. Echte Bilder in kleinen Gruppen (max. acht) importieren und Kampagne, Quelle, Rechte und Schlagwörter ergänzen. Bildbestand nach Redeploy erneut prüfen. Keine Datenbank ersetzen, keine Newsletter oder Mails versenden.

## Aufbewahrung und Wiederherstellung

Archivierte und referenzierte Dateien werden unbegrenzt erhalten, bis ein separater, geprüfter Löschprozess vereinbart ist. Keine automatische Lifecycle-Regel verwenden, die historische Assets entfernt. Datenbank und Objektspeicher gemeinsam sichern: Metadaten/Versionen ohne Dateien sind kein vollständiges Backup. Aufbewahrungsfrist und Zugriffsverantwortliche vor produktivem Bilderimport festlegen. Restore zuerst in separater Datenbank und separatem Bucket testen, Objektprüfsummen und Referenzen vergleichen. Keine physische Löschung durch diese Oberfläche.

## Grenzen

Keine Kundenzugänge, Videobearbeitung, Metadatenabrufe, PDF-Analyse oder Publikation. Die Markenfilterauswahl zeigt derzeit bewusst nur Studiojeker. Keine Änderungen an bestehenden genehmigten Beiträgen bei Profiländerungen. Reale Render-Speicherkonfiguration und OpenAI-Verbindung sind ohne Dashboard-/Secretzugriff nicht bestätigt; lokale Testadapter ersetzen keinen Produktionsnachweis. Last-/Speicherverhalten auf dem tatsächlich gebuchten Render-Tarif vor grösseren Imports beobachten.

## Dokumentierte lokale Testergebnisse (17.10.2026)

- `npm run build`: erfolgreich, einschliesslich Next.js-TypeScript-Prüfung und statischer Logo-Route.
- `npm run typecheck` und `npm run lint`: erfolgreich.
- `npm run release:package -- .local/library-release-20261017`: erfolgreich; Standalone-Artefakt auf lokale Secret-/Demo-Dateien geprüft.
- `npm test`: 29 erfolgreiche Prüfungen einschliesslich Bibliotheks-/Markenvalidierung; keine Live-KI.
- `npm run test:integration`: 30 bestehende und 5 neue PostgreSQL-Tests erfolgreich, ohne Docker. Für jeden Lauf ein zufälliges isoliertes lokales Schema, Migrationen aus leerem Stand und anschliessende Entfernung nur dieses Schemas. Produktionsdatenbank nicht verbunden.
- `review-browser.ts library.spec.ts studio.spec.ts`: beide Abläufe erfolgreich in Chromium. Upload, parallele serverseitige Dublette, Metadaten, Text-/Vimeolink, Such-/Tagfilter, Wiederladen, Medienauswahl desselben Originals in zwei Beiträgen, iPad-Querformat 1180×820 ohne horizontalen Überlauf. Bestehender Studio-Ablauf mit Freigabe, Layout-Export und Entwertung ebenfalls erfolgreich. Bestehender Studio-Test prüft zusätzlich 1024 und 390 Pixel.
- Bibliotheksintegration: Kampagnenzuordnung, Rechteverweigerung, Dateiinhaltsprüfung, beschädigte Objektprüfsumme, Archivierung ohne Löschen, unveränderte freigegebene Snapshots und identischer Layout-Output nach Markenprofiländerung, explizit begrenzter Providerkontext, Doppelauftragssperre und fehlende KI geprüft.
- Fehlender Speicher: echtes Adapterverhalten lokal geprüft; Browseranzeige zusätzlich mit ausdrücklich markiertem Konfigurationsadapter. Keine fingierte Produktionsverbindung.
- Im Browserlauf gefundene Formular-/Beschriftungsprobleme behoben. Die vorhandene Manipulations-Testdatei wird nach dem Prüfsummentest wiederhergestellt, weil sie durch die neue Deduplizierung später bewusst wiederverwendet wird. Ein offener Claim erzeugt keine erfundene Textebene und keinen Sharp-Fehler.
- Screenshots mit ausschliesslich synthetischen Inhalten: [Bibliothek](screenshots/library-desktop.png), [Markenprofil](screenshots/library-brand-desktop.png), [Medienauswahl](screenshots/library-picker-desktop.png), [iPad quer](screenshots/library-ipad-landscape.png).

Nicht geprüft: reales Render-Deployment, echter S3-Schreib-/Lesezugriff, OpenAI-Liveaufrufe, physisches Safari/iPad, Malware-Scan oder vollständige semantische PDF-Validierung. Diese Punkte werden nicht als produktiv bestätigt dargestellt. Kein zusätzlicher Worker und keine neuen gebuchten Dienste. Ein eigener Speicheranbieter und dessen Kosten müssen vor dem ersten echten Bilderimport festgelegt werden.

### CI-Korrektur: synthetische Browserzugänge

Der erste GitHub-Lauf von #147 bestand Build, Unit-/Datenbanktests und 15 von 16 Browserprüfungen. Der neue Bibliothekstest verlangte jedoch ausschliesslich `E2E_EMAIL`/`E2E_PASSWORD`, während der vorhandene CI-Seed seine zufälligen synthetischen Zugänge in `.local/demo-access.txt` bereitstellt. Der Test unterstützt jetzt beide vorgesehenen Wege, weiterhin nur `@example.test`. Drei zusätzliche Tests prüfen den Harness-Weg, das CI-Dateiformat und die Ablehnung realer beziehungsweise unvollständiger Zugangsdaten. Keine Änderung an App-Authentifizierung, Produktionszugängen oder Deployment-Workflows.
