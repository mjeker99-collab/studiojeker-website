# Studiojeker Akquiseplattform V1

Eigenständige interne Next.js-Anwendung unter `apps/akquise/`. Die bestehende Studiojeker-Website, ihr CMS und ihre Deployments bleiben unverändert. Kein produktives Deployment wurde eingerichtet.

**Produktionsvorbereitung:** Start-, HTTPS-, Datenbank-, Backup- und Betriebsanleitung: [docs/PRODUCTION.md](docs/PRODUCTION.md). Noch nicht veröffentlicht. Das bestehende Metanet-Webhosting unterstützt laut Projektdokumentation keine Node.js-Runtime und ist daher für diese App nicht ausreichend.

**Versand ist standardmässig deaktiviert.** SMTP benötigt einen expliziten Modus, beide Freigabeschalter, bestätigte Metanet-Konfiguration, die Freigabe der konkreten Nachrichtenversion und eine separate Versandbestätigung. Interner Testmodus leitet Header und Envelope ausschliesslich an eine festgelegte interne Liste um. Aktuell keine echten E-Mail-Versuche.

## Lokal starten und im Browser ansehen

Voraussetzungen: Node.js 22 oder neuer, npm, PostgreSQL. Befehle im Verzeichnis `apps/akquise` ausführen.

```sh
npm ci
cp .env.example .env
```

In `.env` ein individuelles lokales Datenbankpasswort in `DATABASE_URL` setzen. Keine echten SMTP-Zugangsdaten für V1 erforderlich. `APP_URL=http://localhost:3100` beibehalten. In dieser Arbeitsumgebung sind `.env`, PostgreSQL und synthetische Demo-Konten bereits eingerichtet.

Ohne Docker kann das mitgelieferte Entwicklungshilfsmittel PostgreSQL als normalen Benutzer starten:

```sh
npm run db:local
```

Dieses Terminal geöffnet lassen. Der Prozess bindet PostgreSQL nur an `127.0.0.1:5433`. Daten bleiben in `.local/postgres/` erhalten. Bei bereits vorhandenem PostgreSQL stattdessen `DATABASE_URL` auf eine eigene leere Akquise-Datenbank setzen. Das Entwicklungshilfsmittel enthält PostgreSQL 18; für Produktion einen administrierten PostgreSQL-Server verwenden. Docker ist optional, nicht erforderlich. Für `compose.yaml` muss `POSTGRES_PASSWORD` gesetzt werden; dieser Wert muss zu `DATABASE_URL` passen.

In einem zweiten Terminal:

```sh
npm run db:generate
npm run db:migrate
ALLOW_SYNTHETIC_SEED=true npm run db:seed
npm run dev
```

**Browser: http://localhost:3100**. Bei einer entfernten Entwicklungsumgebung Port 3100 lokal weiterleiten. `APP_URL` muss exakt dem Browser-Ursprung entsprechen; eine andere Preview-Domain erfordert Anpassung und Neustart. `NODE_ENV=production` benötigt eine eigene HTTPS-APP_URL, echte persönliche Konten und eine Produktions-Datenbankkonfiguration; localhost und Demo-Konten werden dann abgewiesen.

Der Seed legt ausschliesslich synthetische `.example.test`-Kontakte sowie individuelle lokale Konten `martin@example.test` und `nora@example.test` an. Zufällige Passwörter werden einmalig im Terminal ausgegeben und geschützt unter `.local/demo-access.txt` abgelegt. Diese Datei ist nicht in Git. Kein gemeinsames Passwort, kein eingebauter Login und kein automatischer Demo-Zugang. Seed niemals gegen produktive Daten ausführen.

Für echte individuelle Konten ohne Seed, Passwort über stdin zuführen (mindestens 14 Zeichen):

```sh
npm run user:create -- "Martin Jeker" martin@individuelle-adresse.ch < /geschuetzter/pfad/passwortdatei
npm run user:create -- "Nora Jeker" nora@individuelle-adresse.ch < /geschuetzter/pfad/anderes-passwort
```

Passwortdateien anschliessend sicher entfernen. Es gibt keine öffentliche Registrierung. Beide Konten besitzen dieselben Rechte. Benutzer können administrativ über `User.active=false` deaktiviert werden; die nächste Anfrage wird gesperrt. Passwort-Reset erfolgt administrativ, kein E-Mail-Reset in V1.

## Ablauf

1. Kontakt manuell erfassen oder CSV/XLSX importieren.
2. Persönliche Geschäftsadresse, Quellen-URL, Verifikationsdatum und dokumentierten Anknüpfungspunkt prüfen. Vertrauensstatus auf verifiziert setzen. Geschätzte und allgemeine Postfächer sind nicht freigabefähig.
3. Separate rechtliche Prüfung mit Begründung dokumentieren. Öffentliche Auftraggeber benötigen zusätzlich eine explizite beschaffungsrechtliche Prüfung. Eine publizierte Adresse ist keine Werbeeinwilligung. Newsletter-Einwilligungen sind getrennt zu dokumentieren.
4. Lokalen Entwurf vorbereiten. Die austauschbare KI-Schnittstelle ist vorbereitet; V1 verwendet eine ausdrücklich gekennzeichnete lokale Vorlage und übermittelt keine Kontakte an externe KI-Dienste.
5. Nachricht lesen, bearbeiten und als neue Version speichern. Anschliessend erneut öffnen, vollständiges Lesen bestätigen und einzeln freigeben. Alternativ zur Prüfung vorlegen oder ablehnen. Mehrfachauswahl bereitet nur Entwürfe vor; keine Sammelfreigabe.
6. Eine freigegebene Nachricht kann lokal simuliert werden. Sie erscheint als `SIMULATED` mit eindeutiger Message-ID. Der Kontakt wird dadurch niemals als `SENT` markiert. Identische Wiederholungen liefern denselben Protokolleintrag; weitere Nachrichten an denselben simulierten Empfänger werden blockiert. Zur Wiederholung von Tests eine neue synthetische Adresse verwenden.

Jede Änderung an einem Kontakt entwertet konservativ dessen bestehende Freigaben und rechtliche Prüfung. Änderungen an Empfänger, Betreff und Text erzeugen eine neue Version. Der Empfänger muss zur verifizierten Kontaktadresse passen. Optimistische Versionsprüfung verhindert das Überschreiben paralleler Änderungen. Es gibt keine Versandaktion allein aufgrund eines Kontaktstatus.

## Import und Google Sheets

CSV: UTF-8, Komma als Trennzeichen, Headerzeile. XLSX: genau ein Tabellenblatt mit Textzellen und derselben Headerzeile. Maximal 500 Kontakte und 2 MB; Formeln, Links als Excel-Zellobjekte, gefährliche Zellpräfixe und übergrosse ZIP-Archive werden abgelehnt.

Pflichtspalten: `organisation`, `firstName`, `lastName`, `email`.

Optionale Spalten: `industry`, `region`, `position`, `website`, `sourceUrl`, `hook`, `service`, `owner`, `notes`, `legalCategory`.

```csv
organisation,firstName,lastName,email,industry,region,sourceUrl,hook
Synthetische Beispiel AG,Anna,Muster,anna.muster@example.test,Architektur,Solothurn,https://example.test/quelle,Dokumentierter synthetischer Anknüpfungspunkt
```

`legalCategory`: `UNASSESSED`, `CONSENT_DOCUMENTED`, `EXISTING_RELATIONSHIP`, `OTHER_REVIEW_REQUIRED`, `PUBLIC_AUTHORITY`. Die Kategorie erteilt keine rechtliche Freigabe. Importierte Kontakte bleiben ungeprüft. Status-, Verifikations-, Einwilligungs- und Freigabespalten werden abgelehnt. Dubletten im Import werden beanstandet; bereits vorhandene Kontakte anhand normalisierter Adresse oder Person/Organisation werden übersprungen. Der Import wird atomar verarbeitet.

Google Sheets: Service-Account über `GOOGLE_CLIENT_EMAIL` und `GOOGLE_PRIVATE_KEY` konfigurieren, Masterliste lesend mit diesem Konto teilen und `GOOGLE_SHEET_ID` setzen. `GOOGLE_SHEET_RANGE` muss zur Spaltenzahl und maximal 500 Datenzeilen passen. In den Einstellungen manuell synchronisieren. Der Adapter liest nur erlaubte Kontaktfelder und verwendet denselben Validator. V1 importiert neue Datensätze und überspringt bestehende Identitäten; keine automatischen Überschreibungen, kein bidirektionaler Sync und keine Statusübernahme.

## Tests

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Integrationstests benötigen laufendes lokales PostgreSQL und legen ein zufälliges separates Schema an, migrieren es und löschen nur dieses Schema danach. Kein Truncate der Anwendungsdaten. Alle Testkontakte sind synthetisch. Kein Test nutzt SMTP.

Browsertests gegen die laufende lokale App nach synthetischem Seed:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" npm run test:browser
```

Die Tests lesen die lokalen Demo-Zugangsdaten aus `.local/demo-access.txt`; alternativ `E2E_EMAIL` und `E2E_PASSWORD` setzen. Die UI-Tests erzeugen einen synthetischen Entwurf, aber keine externen Nachrichten. Screenshots liegen lokal unter `.local/dashboard-*.png`. Ergebnisse und Grenzen: [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md).

## Separates Hosting und Deployment

Die konkret vorbereiteten Produktionswege (Docker Compose oder Standalone/systemd), SMTP-Freigaben, Secrets, Backup/Restore und Datenübernahme stehen in [docs/PRODUCTION.md](docs/PRODUCTION.md). Die vorhandene Website bleibt unverändert. Kein Produktionsdeployment wurde ausgeführt.

- Vollständige Konfiguration: `.env.example`; separate Produktionsvorlage: `deploy/production.env.example`.
- Produktionsstart: `npm start`; Standalone-Artefakt: nach `npm run build` mit `npm run release:package` erzeugen.
- Gesundheitsprüfung: `/api/health/live` und `/api/health/ready`.
- Aktuelle Prüfergebnisse und noch nicht ausgeführte Hostprüfungen: [docs/PRODUCTION_TEST_RESULTS.md](docs/PRODUCTION_TEST_RESULTS.md).
- Historische V1-Ergebnisse vom 15. Oktober sind weiterhin separat dokumentiert und keine Behauptung über neue Produktionsprüfungen.

[Architektur](docs/ARCHITECTURE.md) · [Auslagerung ohne Datenverlust](docs/EXTRACTION.md) · [Produktionsbetrieb](docs/PRODUCTION.md) · [ChatGPT Connector](docs/CHATGPT_CONNECTOR.md)

Bibliothek, Markenprofil, privater Speicher und erster Bilderimport: [Betriebsanleitung](docs/LIBRARY.md).
