# Render Frankfurt – vorbereitete Einrichtung

Stand: 16.10.2026. Noch keine Ressourcen angelegt, kein Deployment, keine DNS-Änderung.
Basis: PR #140 (`feat/akquise-production-readiness`), abhängig von PR #133.
Zuerst #133, dann #140 und anschliessend diesen PR integrieren. Bis dahin den
vollständigen gestapelten Branch verwenden; nicht den aktuellen main-Stand.
Die bestehende Website und ihre Deployment-Konfiguration bleiben unverändert.

## Architektur und Ressourcen

`render.yaml` liegt absichtlich **hier unter apps/akquise/**, nicht im Repository-Root.
Native Node.js 22, eine Web-Instanz `1c-2g` (1 CPU / 2 GB RAM), PostgreSQL 18
`0.5c-1g` (0.5 CPU / 1 GB RAM), 5 GB Datenbankspeicher, beide Frankfurt.
Für zwei Benutzer ist dies eine angemessene Startgrösse mit Reserve für Next.js,
Prisma und begrenzte CSV/XLSX-Imports. Keine Lastmessung auf Render durchgeführt;
nach Inbetriebnahme RAM/CPU, Antwortzeiten und DB-Speicher überwachen.
512 MB Web-RAM ist wegen Next.js/ExcelJS zu knapp als verlässliche Produktionsempfehlung.
Keine Worker, Cronjobs, IMAP-Verarbeitung, Redis, persistenten App-Disks oder
automatischen Preview-Umgebungen nötig. Kontakte, Versionen, Freigaben,
Sperrlisten, Sessions und Versandhistorie liegen ausschliesslich in PostgreSQL.
Temporäre App-Dateien sind nicht dauerhaft; dort keine Backups ablegen.

### Monatliche Kosten (USD, vor Steuern/Währungsumrechnung)

| Bestandteil                                                     | Pro Workspace, empfohlen |
| --------------------------------------------------------------- | -----------------------: |
| Web `1c-2g`, dauerhaft aktiv                                    |                   $25.00 |
| PostgreSQL `0.5c-1g`                                            |                   $19.00 |
| 5 GB PostgreSQL-Speicher × $0.30                                |                    $1.50 |
| Pro Workspace, pauschal inkl. Martin/Nora als Render-Mitglieder |                   $25.00 |
| **Budget pro vollem Monat**                                     |               **$70.50** |

Kein separater Preis pro Mitglied. Wenn bereits ein Pro Workspace vorhanden ist,
betragen die zusätzlichen App-/DB-Kosten $45.50. Hobby kostet $0 Workspacegebühr,
erlaubt aber nur einen Render-Administrator; persönliche App-Logins sind davon
unabhängig. Pro bietet für gemeinsamen Betrieb sieben statt drei Tage PITR.
Die Preisseite nennt auch 1 GB inkludierten Speicher; die offizielle
Kostenanleitung berechnet zugewiesene GB × $0.30. Ob ein Speicherfreibetrag in der
konkreten Dashboard-Kalkulation greift, vor Kauf kontrollieren; $70.50 ist das
Budget ohne einen solchen Abzug (maximal $0.30 Unterschied).
Pro enthält 25 GB ausgehenden Traffic und 1000 Standard-Pipeline-Minuten/Monat;
Mehrverbrauch: $0.15/GB bzw. $5/1000 Minuten. Keine Performance-Build-Pipeline gewählt.
Keine HA/Replikation konfiguriert. Wiederherstellungs-/Testdatenbanken kosten extra,
solange sie bestehen. Externe Langzeitbackups sind nicht in dieser Summe enthalten.
Speicher-Autoscaling ist aus; Kapazität rechtzeitig überwachen und bewusst erhöhen.

Quellen: [Preise](https://render.com/pricing),
[Workspace-Tarife](https://render.com/docs/new-workspace-plans),
[Speicherkalkulation](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses),
[Blueprint-Referenz](https://render.com/docs/blueprint-spec).

## Render-Dashboard Schritt für Schritt

**Jetzt nur vorbereiten. „Create/Apply Blueprint“ erzeugt kostenpflichtige Ressourcen
und löst den ersten Deploy aus, auch bei ausgeschaltetem Auto-Deploy. Diesen Schritt
erst nach einer separaten Freigabe ausführen.** Auch Workspace-Upgrade nicht jetzt buchen.

1. Später einen Studiojeker-Workspace wählen, Pro-Tarif und Rechnungsdaten prüfen,
   Martin und Nora mit individuellen Render-Konten und MFA hinzufügen.
2. **New → Blueprint**, GitHub-Repository `mjeker99-collab/studiojeker-website`
   verbinden. Den freigegebenen Branch mit allen drei PRs wählen. Blueprint-Pfad
   **`apps/akquise/render.yaml`** angeben. Automatischen Blueprint-Sync deaktivieren,
   damit spätere Konfigurationsänderungen nur manuell übernommen werden.
3. Vorschau kontrollieren: ausschliesslich diese zwei neuen Ressourcen, beide
   Frankfurt, genannte bezahlte Pläne, 5 GB, keine vorhandenen Website-Dienste.
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
