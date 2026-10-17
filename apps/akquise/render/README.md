# Render Frankfurt – vorbereitete Einrichtung

Stand: 17.10.2026. Noch keine Ressourcen angelegt, kein Deployment, keine DNS-Änderung.
Basis: PR #141 (`feat/akquise-render-frankfurt`), aufbauend auf #140 und #133.
Zuerst #133, dann #140, #141 und anschliessend den Marketing-Hub-PR integrieren. Bis dahin den
vollständigen gestapelten Branch verwenden; nicht den aktuellen main-Stand.
Die bestehende Website und ihre Deployment-Konfiguration bleiben unverändert.

## Architektur, App-Konten und Hostingverwaltung

Stand: 17.10.2026, Marketing Hub V1. Die zwei persönlichen **App-Logins**
Martin und Nora sind Datenbankkonten der Anwendung. Dafür benötigt niemand einen
Render-Zugang. Für Deployment, Billing und Backups genügt **ein** Hosting-Administrator
auf einem Hobby-Workspace ($0). Pro und zwei Render-Mitglieder sind nicht technisch
notwendig. Wenn beide Personen zusätzlich Render verwalten oder sieben statt drei
Tage PITR benötigen, ist Pro optional ($25 pauschal, keine zusätzlichen Sitzgebühren).

Der Blueprint verwendet für neue Ressourcen native Node.js 22, eine bezahlte
Web-Instanz `0.5c-512mb` (0.5 CPU / 512 MB RAM) und bezahltes PostgreSQL 18
`0.1c-256mb` (0.1 CPU / 256 MB RAM), beide Frankfurt. Ein GB Datenbankspeicher
ist für den Einstieg mit zwei Personen und Text-/URL-Daten vorgesehen. Medien
werden nicht hochgeladen, Videos nicht verarbeitet und nichts automatisch publiziert.
Daher sind kein Worker, Redis, Cronjob oder persistenter App-Datenträger erforderlich.
Prisma nutzt drei Verbindungen pro Web-Instanz. Build und Migration laufen getrennt
vom Webprozess. Kein kostenloses, ablaufendes PostgreSQL verwenden.

Dies ist die kleinste bezahlte Startkonfiguration, keine Zusage unbegrenzter Kapazität.
Vor Go-live mit der tatsächlichen Kontaktliste Last und freien DB-Speicher prüfen.
Die lokalen Messungen stehen in [Marketing-Hub-Abnahme](../docs/MARKETING-HUB.md).
Bei Web-RAM-Druck gezielt auf `1c-2g` ($25), bei DB-Druck auf `0.5c-1g` ($19)
umstellen; dafür ist kein Pro-Workspace erforderlich. Speicher kann nur wachsen:
Wenn bereits eine 5-GB-Datenbank besteht, nicht auf 1 GB zurückstellen oder ersetzen.
Es wurden hier keine Render-Ressourcen angelegt; die Änderung betrifft eine neue Einrichtung.

### Monatliche Kosten (USD, vor Steuern/Währungsumrechnung)

| Bestandteil                         | Kleiner Start | Optional Pro-Workspace |
| ----------------------------------- | ------------: | ---------------------: |
| Web `0.5c-512mb`, dauerhaft aktiv   |         $7.00 |                  $7.00 |
| PostgreSQL `0.1c-256mb`, inkl. PITR |         $6.00 |                  $6.00 |
| 1 GB DB-Speicher × $0.30            |         $0.30 |                  $0.30 |
| Workspace                           |   $0.00 Hobby |             $25.00 Pro |
| **Monatliches Budget**              |    **$13.30** |             **$38.30** |

Die bisher genannten $70.50 waren eine grössere Auslegung mit 2 GB Web-RAM,
1 GB DB-RAM, 5 GB Speicher und Pro. Diese Kombination ist für V1 nicht vorgeschrieben.
Mit 2 GB Web-RAM und kleinem Postgres würde Hobby $31.30 kosten; bei beiden
Compute-Upgrades und weiter 1 GB Speicher $44.30. Vor Buchung Dashboard-Preise
gegenprüfen: Render nennt auf der Preisseite auch 1 GB inkludierten Speicher,
die offizielle Kostenanleitung kalkuliert zugewiesene GB × $0.30. Das Budget
enthält vorsichtig $0.30; ein angewendeter Freibetrag reduziert es entsprechend.

Hobby: 5 GB Traffic und 500 Standard-Pipeline-Minuten pro Monat inklusive.
Pro: 25 GB und 1000 Minuten. Mehrverbrauch: $0.15/GB und $5/1000 Minuten.
Standard-Build verwenden; keine zusätzliche Performance-Build-Pipeline bestellt.
Keine separaten Kosten für Render-HTTPS. Ein Restore erzeugt vorübergehend eine
weitere kostenpflichtige DB. Externe Langzeitbackup-Speicherung ist nicht gebucht
und nicht enthalten. Speicher-Autoscaling und Preview-Deployments sind aus.

PITR ist bei **beiden bezahlten DB-Plänen** enthalten: Hobby drei Tage,
Pro sieben Tage. Logische Exporte bleiben sieben Tage bei Render abrufbar.
Regelmässig verschlüsselt extern sichern; Ziel und Verantwortlicher vor Go-live festlegen.
Die neuen Social-/Newsletter-/Kalenderfunktionen brauchen keine zusätzlichen Dienste.

Quellen (17.10.2026): [Preise](https://render.com/pricing),
[Workspace-Berechtigungen](https://render.com/docs/platform-features-by-plan),
[Speicherkalkulation](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses),
[Backups](https://render.com/docs/postgresql-backups),
[Blueprint](https://render.com/docs/blueprint-spec).

## Render-Dashboard Schritt für Schritt

**Jetzt nur vorbereiten. „Create/Apply Blueprint“ erzeugt kostenpflichtige Ressourcen
und löst den ersten Deploy aus, auch bei ausgeschaltetem Auto-Deploy. Diesen Schritt
erst nach einer separaten Freigabe ausführen.** Auch Workspace-Upgrade nicht jetzt buchen.

1. Später einen Studiojeker-Workspace wählen, Hobby-Tarif und Rechnungsdaten prüfen. Einen Hosting-Administrator mit MFA festlegen.
   Nur bei zwei Hosting-Administratoren oder gewünschter 7-Tage-PITR Pro wählen.
2. **New → Blueprint**, GitHub-Repository `mjeker99-collab/studiojeker-website`
   verbinden. Den freigegebenen Branch mit allen drei PRs wählen. Blueprint-Pfad
   **`apps/akquise/render.yaml`** angeben. Automatischen Blueprint-Sync deaktivieren,
   damit spätere Konfigurationsänderungen nur manuell übernommen werden.
3. Vorschau kontrollieren: ausschliesslich diese zwei neuen Ressourcen, beide
   Frankfurt, genannte bezahlte Pläne, 1 GB, keine vorhandenen Website-Dienste.
   `MARTIN_EMAIL` und `NORA_EMAIL` mit den tatsächlichen unterschiedlichen
   Login-Adressen füllen. **Bis zur Freigabe vor Create/Apply stoppen.**
4. Nach Freigabe Blueprint anwenden. Build installiert auch die Betriebsmittel
   Prisma/tsx; Runtime startet das gefilterte Standalone-Artefakt. Pre-deploy führt
   ausschliesslich `prisma migrate deploy` aus, niemals Seed oder Reset.
   `DATABASE_URL` kommt automatisch aus der internen Datenbankverbindung.
5. Environment prüfen: keine Demo-/SMTP-/IMAP-Secrets; E-Mail-Schalter müssen
   exakt deaktiviert bleiben. `APP_URL` zunächst leer/unset lassen: der Launcher
   übernimmt `RENDER_EXTERNAL_URL` als kanonischen HTTPS-Origin. Render stellt
   die `https://…onrender.com`-Adresse und TLS bereit; kein DNS-Eingriff nötig.
6. Readiness `/api/health/ready` muss HTTP 200 liefern, auch nach Neustart.
   `/api/health/live` prüft nur den Prozess. Render setzt PORT; Bindung erfolgt
   auf `0.0.0.0`. Keine zusätzliche öffentliche DB-Freigabe nötig oder erwünscht.
7. Persönliche Konten einmalig im Web-Service unter **Shell** erstellen (unten).
   Anschliessend mit beiden Personen Login, synthetischen Kontakt, Entwurf,
   Freigabe/Änderungsentwertung und blockierten Versand prüfen; keine echten Mails.
   Persistenz nach einem manuellen Redeploy überprüfen. Erst dann echte Kontakte übernehmen.

Auto-Deploy ist aus. Spätere Releases bewusst per Manual Deploy starten; Migration
läuft davor. Ein fehlgeschlagener Pre-deploy darf nicht durch Seed/Reset umgangen
werden. Schemaänderungen künftig abwärtskompatibel ausführen; App-Rollback macht
Datenbankmigrationen nicht rückgängig. Region ist nach Erstellung nicht umstellbar.

## Konten und Secrets

Vollständige Render-Variablenreferenz: [`.env.example`](.env.example).
Keine privaten Schlüssel im YAML, keine NEXT_PUBLIC-Secrets, keine Passwörter als
CLI-Argument oder in Dateien. Render verwaltet das Datenbankpasswort. Ein separates
Session-Secret ist nicht erforderlich: Sessions sind zufällige, gehashte DB-Tokens.
Die App erlaubt nur die beiden konfigurierten Konten, sichere HTTPS-Cookies und
serverseitige Authentifizierung/Origin-Prüfung gelten unverändert aus #140.

In der **Bash-Shell** des Web-Service, Projektwurzel `apps/akquise`:

```bash
set +x
read -r -s -p 'Neues Passwort für Martin (mindestens 14 Zeichen): ' AKQUISE_PASSWORD
printf '\n'
printf '%s' "$AKQUISE_PASSWORD" | node render/command.mjs create-user 'Martin Jeker' "$MARTIN_EMAIL"
unset AKQUISE_PASSWORD
read -r -s -p 'Neues Passwort für Nora (mindestens 14 Zeichen): ' AKQUISE_PASSWORD
printf '\n'
printf '%s' "$AKQUISE_PASSWORD" | node render/command.mjs create-user 'Nora Jeker' "$NORA_EMAIL"
unset AKQUISE_PASSWORD
```

Zwei eigene starke Passwörter aus einem Passwortmanager verwenden, nur der jeweiligen
Person übergeben. Keine Einladung per E-Mail. Existierende Konten werden nicht überschrieben.
Für Reset dieselbe verdeckte Eingabe, dann `node render/command.mjs reset-password
"$MARTIN_EMAIL"` mit Passwort über stdin; dies widerruft die Sessions dieses Kontos.
Kein automatisches Erstellen von Demo-Konten. Spätere Änderung der Allowlist auch im
Dashboard pflegen; Blueprint `sync: false` aktualisiert bestehende Werte nicht automatisch.

## Migration und bestehende Daten

Lokale PostgreSQL-Daten bleiben unangetastet. Vor Übernahme Schreibzugriffe pausieren,
Inventar erstellen (`npm run data:inventory`) und PostgreSQL-18-Dump verschlüsselt sichern.
Für neue Produktion bevorzugt nur recherchierte Kontakte via geprüftem CSV/XLSX-Import
übernehmen: Import erstellt keine Freigaben, Newsletter-Einwilligungen oder Versandaufträge.
Lokale Demo-Daten, Benutzer und Sessions nicht übernehmen.

Falls bestehende reale Entwürfe/Freigaben/Historie mitwandern müssen: vollständigen
Dump zunächst in eine **separate leere** Datenbank wiederherstellen, synthetische
Datensätze anhand Herkunft/Inventar identifizieren und eine geprüfte Bereinigung
planen. Nicht pauschal Kontakte löschen; Beziehungen und Audit-Nachweise erhalten.
Erst nach Vergleich von IDs, Mengen, Versionen, Sperrlisten und Freigabehashes die
Produktionsverbindung umstellen. Ein Restore in eine bereits migrierte produktive
Datenbank ist kein sicherer Importweg. Keine `db push`, `migrate reset`, `seed`,
`--clean` oder `--create` gegen die Produktionsdatenbank.

## Backup und Restore

Bezahltes Render Postgres bietet kontinuierliche PITR-Sicherung, Pro sieben Tage,
Hobby drei. Dashboard **Database → Recovery** prüfen; PITR erstellt eine neue
kostenpflichtige DB, niemals ungeprüft die aktuelle ersetzen. Nach Restore die
interne URL des Web-Dienstes umstellen und einen Deploy auslösen; Blueprint-Verweis
auf die neue DB ebenfalls aktualisieren, damit ein Sync die URL nicht zurücksetzt.
Vor Wiederaufnahme aktive Sessions widerrufen und Versand weiterhin sperren.

Zusätzlich regelmässig sowie vor Migrationen in Recovery einen logischen Export
erzeugen, herunterladen und ausserhalb Render verschlüsselt ablegen. Render hält
diese Exportdateien sieben Tage. Backup-Verantwortung und einen täglichen
Export-/Aufbewahrungsprozess vor Go-live festlegen; hier wurde kein bezahlter
Backup-Cronjob eingerichtet. Empfohlen: mindestens 30 Tage externe Aufbewahrung,
monatlicher Restore-Test, dokumentierte Prüfsummen und Zugriff nur für Berechtigte.

Render-Export `.dir.tar.gz` in einem geschützten temporären Verzeichnis entpacken,
dann mit PostgreSQL-18-Tools gegen eine **leere, separate** Datenbank:

```bash
# RESTORE_DATABASE_URL ausschliesslich als Secret setzen, niemals ins Kommando schreiben.
pg_restore --no-owner --no-acl --exit-on-error --format=directory \
  --dbname="$RESTORE_DATABASE_URL" /geschuetzter/pfad/export-verzeichnis
```

Für einen eigenen `pg_dump --format=custom` entsprechend `--format=custom` nutzen;
das bestehende `deploy/restore.sh` erwartet dieses andere Format.
Die produktive DB hat `ipAllowList: []` (keinen externen Zugriff).
Exports per Dashboard herunterladen; Restore nur aus privatem Netzwerk oder
einem bewusst befristeten Administrationszugang mit exakter IP, niemals `0.0.0.0/0`.
Für einen solchen Restore nötige Tools/privaten Zugang zuerst bereitstellen;
keine Zugangsdaten in Logs. Nach Test Mengen, Migrationstand, beide Logins,
Entwürfe, Freigaben, Audit und Sperrlisten prüfen. RPO innerhalb PITR-Fenster,
RTO erst nach gemessenem Restore-Test zusagen.
[Render-Backup-Dokumentation](https://render.com/docs/postgresql-backups).

## E-Mail bleibt aus

Der Render-Launcher verweigert Start, Migration und Kontoprovisionierung, wenn
MAIL_MODE nicht disabled ist, einer der beiden SMTP-Schalter nicht false ist
oder ein SMTP-Passwort hinterlegt wurde. Kein SMTP-Transport wird hier aktiviert.
Bestehende Freigabe-, Sperrlisten-, Rechtsprüfungs- und Doppelsendeschutzlogik
bleibt erhalten. Für späteren Versand wäre ein eigener geprüfter Code-Change
erforderlich; jetzt keine SMTP-Verbindungsprüfung und keine Test-E-Mail.

## Prüfung und verbleibende Freigaben

Lokal: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run release:package -- .render/runtime`. Render-Guard-Tests sind Teil von npm test.
YAML muss vor dem späteren Anwenden zusätzlich im Render-Dashboard validiert werden;
ohne Render-Zugang ist kein providerseitiger Dry-run erfolgt.
Es fehlen noch: freigegebener Workspace/Billing, tatsächliche Login-Adressen,
individuelle Passwörter bei Provisionierung, Backup-Ziel/Verantwortlicher,
Datenübernahmeentscheidung und anschliessende Inbetriebnahme-Freigabe.
SMTP-Secrets werden für diesen Stand ausdrücklich nicht benötigt.
