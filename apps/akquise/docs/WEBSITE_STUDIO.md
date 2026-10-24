# Website-Studio

Der Bereich Website enthält einen persistenten Editor für neue statische Websites und weiterhin den separaten Sanity-Einstieg für studiojeker.ch.

## Ablauf

1. Projektname, Kunde und Briefing eingeben, Projekt anlegen.
2. Auftrag an GPT formulieren und Übermittlung/Kosten bestätigen. Die bestehende serverseitige OpenAI-Verbindung wird verwendet.
3. Die Antwort bleibt im Projektverlauf. «Vorschau des Vorschlags» zeigt den vorgeschlagenen Stand; «Vorschlag übernehmen» speichert eine neue Version.
4. Seiten, Abschnitte, Mediathek-Bilder oder Bilder-URLs, Links, SEO, Sprache, Akzentfarbe, Hell/Dunkel-Gestaltung und Editorial-/Kampagnen-/Portfolio-Vorlage direkt bearbeiten. Desktop-/Mobilvorschau aktualisiert sich lokal.
5. Speichern; ältere Versionen bei Bedarf als neue Version wiederherstellen. HTML-Paket der ausdrücklich bezeichneten gespeicherten Version exportieren.
6. Webadresse wählen, öffentliche Nutzung der Inhalte/Bilder bestätigen und veröffentlichen. Die gespeicherte Version ist unter `/sites/<adresse>/index.html` erreichbar. Entwürfe verändern die Live-Seite erst nach «Live-Seite aktualisieren». «Veröffentlichung zurückziehen» sperrt HTML und zugehörige Bildrouten. Die Adresse bleibt reserviert.

## Grenzen

- Bis zu zehn Seiten mit je zehn Abschnitten. Die Startseite heisst `index`; Seitenadressen sind eindeutig.
- Der Editor erstellt statische HTML-Seiten auf dem bestehenden StudioONE-Host. Eigene Domains, Formulare, Video-Uploads und beliebiger Code-Import sind nicht enthalten.
- Bestehende studiojeker.ch-Inhalte werden weiterhin in Sanity bearbeitet. Website-Studio-Projekte werden nicht automatisch mit Sanity synchronisiert.
- JPEG-/PNG-/WebP-Bilder aus der bestehenden Mediathek können ausgewählt werden; neue Bilder werden über deren vorhandenen Upload hinzugefügt. Die Auswahl zeigt die neuesten 200 Bilder. Der Export enthält gewählte Bilder unter `assets/`; externe HTTPS-Bilder bleiben extern. Zusammen höchstens 32 MB eigene Bilddaten pro Export/Veröffentlichung. Videos sind noch nicht unterstützt.
- Die Veröffentlichung gibt nur ausgewählte Bild-IDs mit festgehaltenem SHA-256 frei. Andere Dateien bleiben intern. Gelöschte oder veränderte Originaldateien werden nicht mehr ausgeliefert; Bilder sind keine unabhängigen Veröffentlichungskopien. Bereits von Besuchern heruntergeladene Inhalte können nicht zurückgerufen werden.
- GPT arbeitet mit gespeichertem Website-Stand, ausgewähltem Kundenwissen und den letzten acht Antworten. Keine Webrecherche; fehlende Fakten werden benannt.
- Keine bezahlte API-Anfrage in automatisierten Tests. Providerantworten sind synthetisch.

## Implementierung und Betrieb

- `app/cms/WebsiteBuilder.tsx`: Projektwahl, GPT-Dialog, Inhaltseditor, Vorschau, Versionen, Export.
- `lib/websites/{input,service,provider,render}.ts`: validiertes Inhaltsmodell, persistente Versionen, Budget/Provider, sichere HTML-Ausgabe und ZIP.
- `app/api/[...path]/route.ts`: authentifizierte `websites`-Routen mit bestehender Origin-Prüfung und begrenzten Anfragen.
- Additive Migration `20261022140000_website_builder`: WebsiteProject und WebsiteVersion. Bestehender Render-Build wendet Migrationen an.
- Additive Migration `20261022160000_website_publication`: WebsitePublication. `lib/websites/publication.ts` verwaltet Veröffentlichung, Versions-/Revisionskonflikte und Medienmanifest; `app/sites/[slug]/[...path]/route.ts` liefert ausschliesslich aktive öffentliche Snapshots. Briefing, Dialoge und Projektdatei werden über öffentliche Routen nie ausgegeben. Antworten verwenden `no-store`, strikte CSP und keine Scripts.
- KI verwendet bestehende CONTENT_*/OPENAI-Konfiguration und gemeinsame Tages-/Budgetgrenzen. Reservierung pro Anfrage: dreifache bestehende Textreservierung. Keine neuen Secrets oder Abhängigkeiten.
- KI-Aufträge haben idempotente Schlüssel und persistierte Ergebnisse/Fehler. Vorschläge dürfen nur auf ihre Ursprungs-Version angewandt werden. Ein unklarer Providerfehler wird nicht automatisch erneut angefragt.
- Versionsänderungen verwenden transaktionale Sperren und Versionsprüfung. Kundenbindung bleibt nach Erstellung fest. Keine automatischen Veröffentlichungsaktionen.
- HTML rendert ausschliesslich escaped Klartext und validierte Links. Vorschau läuft in einem leeren iframe-Sandbox-Kontext; Scripts und Formulare sind durch CSP ausgeschlossen. Projekt-JSON im ZIP enthält auch das Briefing und ist nur zur internen Weiterbearbeitung gedacht.

## Prüfungen

Unit-/Provider-/ZIP-Prüfungen in `tests/websites.test.ts`, Datenbank-/Berechtigungs-/Konflikt-/KI-Tests in `tests/integration/websites.test.ts`, Benutzerablauf/Responsive/axe in `tests/browser/websites.spec.ts`. Alle sind in die bestehenden Prüfskripte eingebunden. Datenbanktests laufen ausschliesslich gegen lokale PostgreSQL-Instanzen bzw. den isolierten GitHub-CI-Service.

Prüfungen umfassen Vorlagen, Export mit eingebetteten Mediathek-Dateien, Publikations-Snapshots, private Entwürfe, Bildzugriff/Hashprüfung, Adresskonflikte, Revisionsprüfung und Zurückziehen. Datenbankintegration erfordert den isolierten GitHub-CI-Service. Produktive GPT-Verbindung noch nicht mit einer bezahlten Anfrage geprüft.
