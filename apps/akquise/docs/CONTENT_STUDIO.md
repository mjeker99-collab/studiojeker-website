# Studiojeker ONE: Content-Studio / Desktop V1

Aktueller Einstieg, Firmen-/Benutzerwissen und Projektgedächtnis: [SIMPLE_CONTENT_STUDIO.md](SIMPLE_CONTENT_STUDIO.md).

## Umfang und Daten

Bestehender Marketing Hub wird erweitert, keine parallele Anwendung. Neues Menü Content-Studio; technische Verzeichnisstruktur bleibt apps/akquise. Akquise, Newsletter/Mailchimp-Export, Kampagnen, Kalender und bisherige Freigaben bleiben erhalten. Keine automatische Veröffentlichung, Newsletter-Übertragung oder Mailzustellung.

Briefings erzeugen 1–6 persönliche Entwürfe. Jeder Entwurf verwendet dieselben MarketingContent/MarketingVersion/MarketingApproval-Tabellen wie bisher. KI-Ergebnisse werden als Auftragsresultat gespeichert und erst durch «Ergebnis als Entwurf übernehmen» zu neuen Inhaltsversionen. Eigene Inhalte funktionieren ohne OpenAI-Zugang. Textfelder werden beim Speichern in Schweizer ss-Schreibweise normalisiert.

Studio-Snapshot enthält Motiv-/Schrift-ID und SHA256, Headline, Bildidee, Hashtags, Ausschnitt, Ebenensichtbarkeit, Formatliste, Templateversion und unveränderte Logo-Prüfsumme. Jede Änderung erzeugt eine neue Version und entwertet Freigaben. Reine Planung ist kein Publikationsnachweis. Die Bearbeitung in Social Media erhält den Studio-Snapshot; dort lassen sich sämtliche gespeicherten Layoutformate vor Freigabe rendern. Keine Bildfreigabe ohne Motiv; keine sichtbare Textebene ohne freigegebene Schriftdatei.

Die additive Migration ordnet bestehende Daten der Organisation studiojeker zu; bestehende Inhalte ohne Studio-/Kampagnenzuordnung bleiben erhalten. Organisation/Markenprofil sowie organisationsgebundene Serien, Assets und Aufträge sind vorbereitet. **Keine Kundenzugänge freischalten:** die alten internen Akquise-/Hub-Abfragen sind noch nicht für externe Mandanten freigegeben. Es gibt keine API zum Anlegen externer Organisationen oder Kundenzugänge.

## Markenlayout

brand/studiojeker-original.svg ist eine unveränderte Kopie der vorhandenen Originaldatei; keine Logo-Generierung, Nachzeichnung oder Farbänderung. Proportionale Einpassung, kein Verzerren. Vorhandene Farbwerte aus styles/tokens.css: Schwarz #000000, Weiss #ffffff, Cyan #00c8ff.

Keine freigegebenen Social-Layoutvorlagen oder originalen Schriftdateien im Repository gefunden. Die zwei neuen Vorlagen PHOTO/PANEL sind ausdrücklich «V1 zur Freigabe», keine behaupteten Bestandsvorlagen. Exportmasse: 1080×1080, 1080×1350 und 1080×1920. Headline-/Claim-Ebenen sind getrennt und optional. Für Text im Bild zuerst die lizenzierte, freigegebene TTF/OTF hochladen und zuordnen. Schriftfamilie wird aus der Originaldatei gelesen; kein automatischer Ersatz. Ohne Schrift sind reine Motive, Textdateien und textfreie Logo-Layouts nutzbar. Claim: We create visibility. Die KI erhält niemals das Logo als Generierungsauftrag.

## API und Aufträge

Serverseitig OpenAI Responses API mit strengem JSON-Schema; Images generations/edits, 1024×1024 medium. Modelle über Environment konfigurierbar. gpt-4.1-mini / gpt-image-1.5 sind die dokumentierten Standardmodelle; neuere Image-Modelle können nach Prüfung von Kompatibilität und Preisen konfiguriert werden. Fest verdrahtete offizielle API-Hosts verhindern frei wählbare Proxy-/SSRF-Ziele.

Ohne OPENAI_API_KEY oder CONTENT_AI_ENABLED=true: Nicht verbunden, keine simulierten KI-Ergebnisse. Kostenpflichtiger Auftrag benötigt explizite Kostenbestätigung und Start. Textauftrag erstellt alle bestellten Kanalvarianten einer Serie; Bildauftrag erzeugt bewusst ein Motiv je Beitrag. Keine unbeaufsichtigte Bild-Massenproduktion. Referenzen werden nur beim Bildauftrag und nur nach Dateiauswahl, bestätigten Nutzungsrechten und bestätigter Übermittlung versandt. Textaufträge übertragen keine Bilder. Identität von Personen wird nicht garantiert.

Dauerhafte Aufträge: QUEUED → RUNNING → SUCCEEDED → APPLIED, alternativ FAILED/UNKNOWN/CANCELLED. Eindeutiger Request-Key, PostgreSQL-Sperre und Zustandswechsel verhindern doppelte Starts und parallele KI-Aufträge. Browser-Neuladen ist lesend; kein automatischer Neustart. Ergebnisse bleiben gespeichert. Übernahme prüft alle Ausgangsversionen und überschreibt zwischenzeitliche Bearbeitungen nicht. RUNNING nach >3 Minuten kann ausdrücklich als UNKNOWN markiert werden. UNKNOWN und Fehler werden nie automatisch wiederholt; vor einem neuen bewussten Auftrag Anbieter-Verbrauch prüfen. HTTP-/Timeout-Meldungen werden ohne Secrets oder ungeprüfte Providertexte ausgegeben.

API-Zeitlimit 95 Sekunden. Kein Hintergrundworker gebucht. Lange Bildaufträge können UNKNOWN ergeben; das ist bewusst kein automatischer Retry. Für häufig längere Aufträge wäre ein separater Worker mit Queue nötig – als spätere Erweiterung zurückgestellt. Reservierungen sind geschätzte Budgets; tägliche Anzahl und Reservierungssumme sind serverseitig begrenzt. Tatsächliche Abrechnung bleibt beim Anbieter; dort zusätzlich Budgetwarnungen/Projektlimits einrichten. Aufbewahrte Usage-Daten/Request-IDs unterstützen Nachprüfung, ersetzen keine Rechnung.

## Privater Speicher, Sicherung und Löschung

Produktion benötigt privates S3-kompatibles Object Storage. Keine Render-Dateisystem-Persistenz und kein öffentliches Bucket. S3-Schlüssel nur serverseitig; Berechtigungen auf genau den Bucket und GetObject/PutObject/DeleteObject begrenzen. Die App liefert Dateien ausschliesslich über authentifizierte /api/studio/assets/:id aus, prüft Organisation und SHA256, mit no-store und nosniff. Nicht authentifizierte Aufrufe scheitern vor dem Asset-Zugriff. Upload nur JPEG/PNG/WebP (tatsächlicher Decoder), keine SVG/HTML, maximal 8 MiB / 20 MP und keine Animationen. Schriften separat als TTF/OTF mit Rechtebestätigung. Originaldatei bleibt unverändert; Exporte sind neue Objekte. Schriften werden zur Laufzeit mit unveränderter SHA256 in einen privaten /tmp-Cache kopiert; stabile Pfade verhindern Pango-Fallback nach wiederholten Exporten. Der Cache ist keine dauerhafte Ablage und wird aus dem privaten Objektspeicher wiederhergestellt. EXIF ist in Originaldownloads enthalten; in neu gerenderten Sujets nicht übernommen.

Für lokale Entwicklung STUDIO_LOCAL_ASSETS=true setzen; nur ausserhalb production wirksam. .local/studio-assets und Datenbank zusammen sichern. Testadapter nutzen explizit injizierten Speicher und KI im Testprozess, keinen Produktionsschalter für Fake-Ausgaben.

Backup: bestehende PostgreSQL-Sicherung/PITR beibehalten und vor Migration ein manuelles Backup prüfen. Zusätzlich Object-Storage-Backup in getrennten privaten Bucket/Account (z.B. rclone copy mit serverseitigen Credentials); periodischer Restore-Test. DB allein enthält keine Bildbytes. Restore zuerst in isolierter Umgebung: DB wiederherstellen, Objekte samt Schlüsseln kopieren, SHA256 über geschützte Assetroute prüfen, erst danach Freigabe zum Umschalten. Nie demo-access.txt oder lokale Seeds in Produktion übernehmen.

Aufbewahrung: aktive und historische Inhaltsversionen samt zugehörigen Motiven, Fonts und Exporten erhalten. Keine automatische Bucket-Lifecycle-Löschung referenzierter Assets konfigurieren. In V1 keine Asset-Löschfunktion in der Oberfläche: Löschung nur nach dokumentierter Prüfung aller MarketingVersion.payload-Referenzen, StudioSeries.briefing-Referenzen und StudioJob.input/result-Referenzen. Nicht mehr benötigte, unreferenzierte Assets: zunächst deletedAt setzen, nach Sicherung das Objekt löschen, Metadaten/Audit erhalten. Verwaiste Objekte nach fehlgeschlagenem DB-Commit dürfen nach Abgleich und Schonfrist bereinigt werden. Keine pauschale Bucket-Löschung. Gesetzliche Lösch-/Aufbewahrungspflichten organisatorisch festlegen.

## Desktop lokal ansehen

Im vorhandenen Projektordner, bestehende .env nicht überschreiben:

```sh
cd ~/studiojeker-akquise-test/apps/akquise
npm ci
npm run db:generate
```

Vor der Migration vorhandene DB sichern (bestehende Backup-Anleitung). Laufende lokale PostgreSQL-Sitzung offen lassen; falls sie nicht läuft, in eigenem Terminal npm run db:local starten. Dann npm run db:migrate. In .env für die lokale Medienablage STUDIO_LOCAL_ASSETS=true ergänzen, CONTENT_AI_ENABLED=false und die bestehenden SMTP-Sperren beibehalten. npm run dev starten. Safari: http://localhost:3100. Mit vorhandenem persönlichem Konto anmelden; Menü Content-Studio → Neues Briefing. Keine neue Demo-Seeding-Routine ausführen. Persönliche Konten bei Bedarf nur über bestehendes user:create-Skript anlegen.

Production build/start und Render-Deployment bleiben wie in render/README.md / README.md beschrieben. Render muss im isolierten App-Root starten. Die Brand-Datei wird über Next File Tracing und Docker mitgeliefert; lokale Secrets/Assets bleiben ausgeschlossen. Healthcheck prüft auch StudioJob, damit eine fehlende Migration nicht als bereit gilt.

## Zusätzliche Konfiguration und Kosten (Stand 17.10.2026)

Fehlend für reale KI: OpenAI API-Projekt/Key, ausdrücklich gesetztes Enable-Flag, organisationsseitige Datenschutz-/Anbieterentscheidung und Budgetwerte. Ein ChatGPT-Abonnement stellt diese API-Credits nicht bereit. Fehlend für Produktionsbilder: privater S3-Bucket, Endpoint, Region, Access-Key/Secret. Fehlend für Textebenen: freigegebene Schriftdatei. Die Anwendung startet ohne KI-Verbindung; Produktions-Uploads benötigen S3.

Bestehende Render-Empfehlung bleibt zunächst ein Webdienst Frankfurt (512 MB / USD 7), PostgreSQL Frankfurt (256 MB / USD 6), 1 GB DB-Speicher (USD 0.30) und Hobby-Workspace (USD 0): USD 13.30/Monat vor Steuern. Martin/Nora sind App-Konten, keine zwei kostenpflichtigen Render-Mitglieder. Native Bilder werden seriell verarbeitet, Sharp-Concurrency 1, begrenzter Cache, ZIP höchstens 96 MiB; Bildobjekte liegen nicht in PostgreSQL. 512 MB ist eine Einstiegskonfiguration, kein ungemessener Kapazitätsnachweis für sechs hochauflösende Motive. Render-RSS unter realistischen eigenen Bildern beobachten; bei Speicherengpässen Webdienst 2 GB / USD 25 → insgesamt USD 31.30. Kein Worker oder Tarifwechsel wurde angelegt.

OpenAI-Standardtextmodell: USD 0.40 pro Mio. Eingabetokens, USD 1.60 pro Mio. Ausgabetokens. Beispiel 3000 Input + 6000 Output = ca. USD 0.0108 pro Textserie. Standardbildmodell gpt-image-1.5: 1024² medium ca. USD 0.034 Bildausgabe, zuzüglich prompt-/referenzabhängiger Eingabe; sechs Motive ab ca. USD 0.204. Reservierungen standardmässig USD 0.10/Textauftrag und USD 0.25/Bildauftrag sind ausdrücklich Planungswerte, keine Preisgarantie oder harte Rechnungslimits. Modellwechsel erfordert Aktualisierung der Schätzung.

R2 Standard: USD 0.015/GB-Monat, Class A USD 4.50/Mio., Class B USD 0.36/Mio.; Standardfreimenge 10 GB-Monat / 1 Mio. A / 10 Mio. B, kein R2-Egress. Annahme 2 MB Motiv + 3×2 MB Export je Beitrag: 100 Sechser-Serien ≈ 4.8 GB ohne Backupkopien/zusätzliche Vorschauen. Innerhalb der Freimenge ggf. USD 0; sonst ca. USD 0.072/Monat reine Speicherung. Render-Ausgangsbandbreite bleibt separat, Backupkopien/Retention vermehren Speicher. Keine kostenpflichtigen Ressourcen angelegt.

Primärquellen:

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://developers.openai.com/api/docs/models/gpt-image-1.5
- https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
- https://developers.cloudflare.com/r2/pricing/
- https://render.com/pricing

## Integration

#142 ist bereits in feat/akquise-render-frankfurt (#141) integriert (Mergecommit 03688c06448326ed40a38620ae948ebb10050545; Codebaum identisch zur lokalen Hub-Basis). #133, #140 und #141 bleiben offen. Neuer Content-Studio-PR hat deshalb feat/akquise-render-frankfurt als Basis, nicht den bereits integrierten Hub-Branch und nicht main. Reihenfolge: #133 → #140 → #141 (enthält #142) → Content-Studio. Nach Integration der Vorgänger den Zielbranch des Content-Studio-PR kontrolliert aktualisieren. Keine automatischen Merges oder Deployments. Website und Root-Deployment-Workflows unverändert.
