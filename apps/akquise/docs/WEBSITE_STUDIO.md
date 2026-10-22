# Website-Studio

Der Bereich Website enthält einen persistenten Editor für neue statische Websites und weiterhin den separaten Sanity-Einstieg für studiojeker.ch.

## Ablauf

1. Projektname, Kunde und Briefing eingeben, Projekt anlegen.
2. Auftrag an GPT formulieren und Übermittlung/Kosten bestätigen. Die bestehende serverseitige OpenAI-Verbindung wird verwendet.
3. Die Antwort bleibt im Projektverlauf. «Vorschau des Vorschlags» zeigt den vorgeschlagenen Stand; «Vorschlag übernehmen» speichert eine neue Version.
4. Seiten, Abschnitte, Bilder-URLs, Links, SEO, Sprache, Akzentfarbe und Hell/Dunkel-Gestaltung direkt bearbeiten. Desktop-/Mobilvorschau aktualisiert sich lokal.
5. Speichern; ältere Versionen bei Bedarf als neue Version wiederherstellen. HTML-Paket der ausdrücklich bezeichneten gespeicherten Version exportieren.

## Grenzen

- Bis zu zehn Seiten mit je zehn Abschnitten. Die Startseite heisst `index`; Seitenadressen sind eindeutig.
- Der Editor erstellt statische HTML-Seiten. Kein automatisches Hosting/Domain-Deployment, keine Formulare und kein beliebiger Code-Import.
- Bestehende studiojeker.ch-Inhalte werden weiterhin in Sanity bearbeitet. Website-Studio-Projekte werden nicht automatisch mit Sanity synchronisiert.
- Bilder verwenden öffentliche HTTPS-Adressen und bleiben beim Export extern. Private StudioONE-Bilder benötigen zuerst eine geeignete öffentliche Bereitstellung.
- GPT arbeitet mit gespeichertem Website-Stand, ausgewähltem Kundenwissen und den letzten acht Antworten. Keine Webrecherche; fehlende Fakten werden benannt.
- Keine bezahlte API-Anfrage in automatisierten Tests. Providerantworten sind synthetisch.

## Implementierung und Betrieb

- `app/cms/WebsiteBuilder.tsx`: Projektwahl, GPT-Dialog, Inhaltseditor, Vorschau, Versionen, Export.
- `lib/websites/{input,service,provider,render}.ts`: validiertes Inhaltsmodell, persistente Versionen, Budget/Provider, sichere HTML-Ausgabe und ZIP.
- `app/api/[...path]/route.ts`: authentifizierte `websites`-Routen mit bestehender Origin-Prüfung und begrenzten Anfragen.
- Additive Migration `20261022140000_website_builder`: WebsiteProject und WebsiteVersion. Bestehender Render-Build wendet Migrationen an.
- KI verwendet bestehende CONTENT_*/OPENAI-Konfiguration und gemeinsame Tages-/Budgetgrenzen. Reservierung pro Anfrage: dreifache bestehende Textreservierung. Keine neuen Secrets oder Abhängigkeiten.
- KI-Aufträge haben idempotente Schlüssel und persistierte Ergebnisse/Fehler. Vorschläge dürfen nur auf ihre Ursprungs-Version angewandt werden. Ein unklarer Providerfehler wird nicht automatisch erneut angefragt.
- Versionsänderungen verwenden transaktionale Sperren und Versionsprüfung. Kundenbindung bleibt nach Erstellung fest. Keine automatischen Veröffentlichungsaktionen.
- HTML rendert ausschliesslich escaped Klartext und validierte Links. Vorschau läuft in einem leeren iframe-Sandbox-Kontext; Scripts und Formulare sind durch CSP ausgeschlossen. Projekt-JSON im ZIP enthält auch das Briefing und ist nur zur internen Weiterbearbeitung gedacht.

## Prüfungen

Unit-/Provider-/ZIP-Prüfungen in `tests/websites.test.ts`, Datenbank-/Berechtigungs-/Konflikt-/KI-Tests in `tests/integration/websites.test.ts`, Benutzerablauf/Responsive/axe in `tests/browser/websites.spec.ts`. Alle sind in die bestehenden Prüfskripte eingebunden. Datenbanktests laufen ausschliesslich gegen lokale PostgreSQL-Instanzen bzw. den isolierten GitHub-CI-Service.

Prüfstand der Implementierung: Lint, Typprüfung, 84 Unit-/Provider-/Exporttests und Produktionsbuild erfolgreich. Browser: Erstellen, Speichern, Fehlererhalt, GPT-Vorschau/Übernahme, Wiederöffnen und Wiederherstellung erfolgreich; Layout/axe bei 1440, 1180, 820 und 390 px sowie separater Export-Accessibility-Test. Bestehende CMS-/Assistenten-Browsertests erfolgreich. Die Datenbankintegration ist als Test vorbereitet, lokal wegen fehlender PostgreSQL-Laufmöglichkeit noch nicht ausgeführt; vor Merge im isolierten GitHub-CI-Service erforderlich. Produktive GPT-Verbindung noch nicht mit einer bezahlten Anfrage geprüft.
