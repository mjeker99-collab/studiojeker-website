# Studiojeker Marketing Hub – V1-Abnahme

Die Umsetzung liegt vollständig unter `apps/akquise/` auf dem Branch
`feat/studiojeker-marketing-hub`. Geprüfte Ausgangslage: #133, #140 und #141
sind offen und aufeinander gestapelt. Integrationsreihenfolge:
**#133 → #140 → #141 → Marketing-Hub-PR**. Kein Merge nach main und kein Deployment
wurden ausgeführt. Die bestehende Website bleibt unverändert.

## Funktionen

- Kampagnen: Titel, Ziel, Zielgruppe, Zeitraum und persönliche Verantwortung;
  Bearbeitung mit Revisionsprüfung, Zuordnung von Social, Newsletter und Akquise.
- Social: LinkedIn-, Instagram- und Facebook-Varianten pro Inhalt mit eigenem
  Text, CTA, Link, Bild-/Video-URL oder Medienreferenz und eigenem Termin.
  Vorschau, Filter und persistente Versionen. Keine Medienkopien oder Remote-Fetches.
- Newsletter: Betreff, Preheader, Text, explizites Empfängersegment und Termin.
  Export einer freigegebenen Version als HTML und Klartext. Gestaltung aus
  `mailchimp/studiojeker-newsletter-template.html` übernommen: bestehende Brand-CSS,
  vereinfachte redaktionelle Bereiche ohne automatisch übernommene Beispieltexte.
  Betreff und Preheader zusätzlich im Text-Export. Mailchimp-Abmeldetags bleiben erhalten.
- Kalender: Monats- und Listenansicht für Social-Varianten, Newsletter und Akquise.
  Filter nach Kanal, Kampagne, Person und Redaktionsstatus. Ungeplante Inhalte in
  der Liste; Zeitpunkte werden als UTC gespeichert und in Europe/Zurich angezeigt.
  Ungültige und doppeldeutige DST-Uhrzeiten werden statt stiller Umdeutung abgewiesen.
- Freigaben: Entwurf, zur Prüfung, freigegeben, redaktionell erledigt. Protokoll mit
  Benutzer, Zeitpunkt, Version und Hash. Jede gespeicherte Änderung erzeugt eine
  neue Version und invalidiert bisherige Freigaben. Gleichzeitige Bearbeitungen
  werden durch Sperre und erwartete Version abgesichert.
- Veröffentlichungen sind eigene unveränderliche Nachweise mit Kanal, exakter Version,
  tatsächlichem Datum, Person und optionalem Link. Zukunftsdaten und doppelte Nachweise
  werden abgewiesen. Historische Veröffentlichungen bleiben nach neuen Versionen erhalten.
- „Redaktionell erledigt“ bedeutet nicht veröffentlicht oder versandt.
  Newsletter-Export bedeutet nicht an Mailchimp übertragen. Keine Empfängerlisten
  oder Akquise-Kontakte werden exportiert; Newsletter-Einwilligungen werden nicht abgeleitet.
- Bestehende Kontakte, Akquise-Nachrichten, Rechtsprüfung, Sperrliste und Versandhistorie
  bleiben verfügbar unter Kontakte/Akquise. Planung einer Akquise-Aktion erzeugt
  keinen Versandauftrag und verändert keine Nachricht oder bestehende Freigabe.
- Bestehende Sessions und serverseitige Berechtigungen/Origin-Prüfungen gelten für
  sämtliche Hub-Endpunkte. SMTP-Sperren aus #141 bleiben bestehen.

## Daten und Betriebsgrenzen

Migration `20261016200000_marketing_hub` ergänzt Tabellen und optionale Draft-Felder.
Keine bestehenden Tabellen oder Inhalte werden gelöscht. Bestehende Entwürfe bleiben
mit leerer Kampagnenzuordnung erhalten. `prisma migrate deploy` ausführen, niemals Reset.
Vor Produktionsmigration Backup erstellen; [Render-Anleitung](../render/README.md).

Die Integrationsgrenze in `lib/hub/integrations.ts` definiert einen späteren Adapter
mit versionsgebundener Freigabe und bestätigtem Remote-Beleg. V1 stellt keinen
publizierenden Adapter bereit. LinkedIn, Instagram, Facebook und Mailchimp zeigen
„nicht verbunden“. Kein Scheduler, Follow-up, Social-Publishing, Newslettertransfer
oder echter Versand ist aktiv.

Medienreferenzen müssen vor Freigabe manuell auf Existenz, Rechte und geeignete
Kanalformate geprüft werden. Der Hub lädt die referenzierten Medien nicht serverseitig.
Mailchimp-Import ist manuell: exportiertes HTML in eine eigene Mailchimp-Vorlage
übernehmen, Betreff/Preheader separat setzen, Listen-/Adress-/Abmeldetags und Darstellung
in Mailchimp prüfen. Eine Mailchimp-Testsendung ist nicht Bestandteil dieser Abnahme.

V1 lädt den gemeinsamen Workspace für zwei Benutzer. Bei stark wachsenden Versions-
und Auditbeständen sind Pagination und Archivierung vor einer grossen Skalierung
nachzurüsten; keine zusätzlichen Dienste werden dafür vorsorglich gebucht.

## Prüfen und lokal ansehen

Im App-Verzeichnis:

```bash
npm ci
npm run db:generate
npm run db:local
```

In einem zweiten Terminal mit vorhandener `.env` und erhaltenen Daten:

```bash
npm run db:migrate
npm run dev
```

Safari: http://localhost:3100 – bestehende persönliche lokale Konten verwenden.
Die Render-Produktion bleibt unveröffentlicht. Neue Produktionskonten später mit
`node render/command.mjs create-user` und verdeckter stdin-Passworteingabe anlegen,
wie in der [Betriebsanleitung](../render/README.md) beschrieben.

Automatisierte Prüfungen:

```bash
npm test
npm run lint
npm run typecheck
npm run test:integration
npm run build
npm run release:package -- .local/hub-release
```

PostgreSQL-Integrationstests nutzen ein zufälliges lokales Schema und entfernen nur
jenes Schema anschliessend. Für reproduzierbare Browserprüfungen zuerst den eigenen
Dev-Server auf Port 3100 beenden und PostgreSQL weiterlaufen lassen:

```bash
npx playwright install chromium
npm run test:browser:isolated
```

Der Browser-Harness erzeugt ein eigenes Schema, ausschliesslich synthetische Konten,
startet einen Testserver und entfernt anschliessend nur dieses Schema. Existierende
Daten und `.local/demo-access.txt` werden nicht verändert. Alternativ kann eine
installierte Chromium-Version über `PLAYWRIGHT_CHROMIUM_EXECUTABLE` angegeben werden.
CI verwendet weiterhin den vorhandenen Workflow mit eigener synthetischer Datenbank.

Screenshots liegen unter [screenshots/](screenshots/). Sie zeigen nur synthetische
Daten auf Desktop und iPad. Produktionsdaten und Passwörter gehören nicht in Bilder.

## Dokumentierte Ergebnisse (17.10.2026)

| Prüfung                                                                                | Ergebnis     |
| -------------------------------------------------------------------------------------- | ------------ |
| Unit-/Konfigurationstests inkl. Zeitumstellung, sichere Exporte, SMTP-Sperre           | 22 bestanden |
| PostgreSQL-18-Integration, lokal ohne Docker                                           | 24 bestanden |
| Browser: bestehende Akquise und neuer Hub                                              | 14 bestanden |
| Desktop, iPad quer/hoch, Mobil; WCAG-AA-Automatik                                      | bestanden    |
| ESLint / TypeScript / Next.js-Produktionsbuild                                         | bestanden    |
| Standalone-Paketierung / Secret-Datei-Filter                                           | bestanden    |
| Produktions-Launcher, Login, persistentes Speichern, Kontaktimport und parallele Reads | bestanden    |
| Render-Blueprint lokal geparst und Sicherheits-/Kosteninvarianten geprüft              | bestanden    |

Die lokalen Produktionstests nutzten ein eigenes synthetisches Schema und das
gefilterte Standalone-Paket über den Render-Launcher. 500 synthetische Kontakte
(CSV-Import), 20 Newsletter und 40 Leseanfragen mit Parallelität zwei:
**251 MiB maximal gemessener RSS des gesamten App-Prozessbaums**, 489 ms für den
lokalen Lese-Batch. Das Schema wurde anschliessend entfernt; kein SMTP-Transport.
Die Messung ist ein lokaler Kapazitätsindikator, kein Benchmark auf einem
Render-0.5-CPU-Dienst und keine Simulation beliebig grosser XLSX-Dateien.
Die 512-MB-Webinstanz ist damit ein begründeter kleiner Start. Datenbank mit
256 MB und drei App-Verbindungen vor Go-live auf dem tatsächlichen Anbieter
überwachen. Erst bei gemessenem Druck vergrössern, nicht vorsorglich buchen.

Browser-Screenshots zunächst unter `.local/hub-screenshots/` schreiben und erst
nach dem Stoppen des Next.js-Testservers in die Dokumentation kopieren. Dateien
im überwachten Quellverzeichnis während des Tests können im Next-Dev-Modus eine
Neuübersetzung auslösen. Der lokale Test-Harness übernimmt diese Trennung.

Render-Ressourcen und DNS wurden nicht verändert. Providerseitiger Blueprint-Dry-run,
PITR auf Render und tatsächliche Hosting-Limits sind mangels Provisionierung noch
nicht praktisch geprüft. Die bestehende CI führt zusätzliche Container-Builds aus;
keine Images veröffentlichen oder Dienste deployen.

## Noch vor Go-live

- Gestapelte PRs prüfen und in der genannten Reihenfolge integrieren.
- Ein Hosting-Administrator mit MFA, Hobby oder bewusst Pro wählen; keine zwei
  Render-Mitglieder allein wegen der App-Konten erforderlich.
- [Kleine Render-Konfiguration und Kosten](../render/README.md) im Dashboard validieren;
  tatsächliche Kontaktmenge und Laufzeitlast vor Live-Nutzung prüfen.
- Kosten/Einrichtung separat freigeben. Create/Apply erzeugt Ressourcen und deployt.
- Persönliche reale Login-Adressen als serverseitige Variablen und individuelle
  Passwörter erst bei Provisionierung setzen, keine Demo-Konten übernehmen.
- Externes verschlüsseltes Backup-Ziel, Verantwortung und Restore-Test festlegen.
- Bestehende recherchierte Kontakte gezielt übernehmen; keine automatischen Demoimporte.
- SMTP bleibt aus. Social-/Mailchimp-Verbindungen wären ein separater geprüfter Schritt.
