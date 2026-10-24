# Produktionsvorbereitung – noch nicht veröffentlicht

## Hostingentscheidung mit vorhandenen Belegen

`docs/METANET_STATIC_DEPLOYMENT.md` im Website-Repository, Abschnitt „Why static?“, dokumentiert ausdrücklich: Der bestehende Metanet-Tarif besitzt **keine Node.js-Runtime**. Die Website wird als statischer Export über Apache/Plesk bereitgestellt. Die vorhandenen FTPS-Deployments bestätigen diesen Betriebsweg. WordPress/PHP oder eine vorhandene MySQL-Datenbank ersetzen weder die Node.js-API noch PostgreSQL dieser Anwendung.

**Dieser dokumentierte Tarif ist für die Akquiseplattform nicht geeignet.** Es wurde kein Hostingpanel geöffnet und keine inzwischen erfolgte Tarifänderung bestätigt. Metanet muss konkret beantworten:

- Exakter aktueller Tarif, dauerhafte Node.js-Prozesse (Node 22/24), Prozessüberwachung und Neustart; Plesk-Node-Erweiterung allein ist keine Bestätigung.
- Eigene Subdomain `akquise.studiojeker.ch`, HTTPS-Zertifikat und Reverse-Proxy zu einem internen Port; keine Änderung an Hauptdomain, Website-Webroot oder deren Deployments.
- PostgreSQL 16+ mit Transaktionen, Advisory Locks, persistentem Speicher, Backups und Restore-Zugang; ausdrücklich nicht nur MySQL/MariaDB.
- SSH/CLI und gesonderter Migrationsjob oder isolierter Containerbetrieb; Ressourcen und Verbindungslimits.
- Ausgehende verschlüsselte SMTP-Verbindung zu jovinus.metanet.ch, erlaubter Port und mögliche Firewalllimits.

Bei fehlender Eignung: **separate Linux-VM mit Docker Compose und persistentem PostgreSQL**, beispielsweise bei Infomaniak in der Schweiz; optional administriertes PostgreSQL mit CH/EU-Datenstandort. Richtwert für zwei Benutzer: 2 vCPU, 4 GB RAM, mindestens 40 GB persistenter/verschlüsselter Speicher plus separates Backupziel. Alternativ eine verwaltete Node-/Containerplattform plus verwaltetes PostgreSQL, sofern Datenschutzstandort, SMTP-Egress und Backups passen. Kein Anbieter wurde gebucht; kein Preis oder konkreter Tarif wird als verfügbar vorausgesetzt.

## Laufzeit und Prozesse

Node.js 22.9+ oder 24, Next.js Standalone, PostgreSQL. Ein App-Prozess genügt für Martin/Nora; der gemeinsame Datenbankzustand und Advisory Locks erlauben auch mehrere Instanzen. Keine Kontakte oder Nachrichten werden auf lokalen App-Dateisystemen gespeichert. `.local/postgres` ist ausschliesslich das Entwicklungshilfsmittel. Produktionsdaten liegen in PostgreSQL, Compose verwendet dafür ein benanntes persistentes Volume.

Es gibt keinen Versandworker, keine automatische Queue, keine automatischen Wiederholungen und keine Follow-ups. Versand ist eine explizite HTTP-Aktion mit serverseitigem Timeout. Ein Hintergrundprozess zum Postfachabruf läuft nicht. Betriebliche Jobs sind Backups, externe Healthcheck-Überwachung und optional das Löschen abgelaufener Sessions (`DELETE FROM "Session" WHERE "expiresAt" < now()`). Keine Kontakt-, Versions-, Freigabe- oder Auditdaten automatisch löschen.

## Reproduzierbarer Containerbetrieb

Alle Befehle im **App-Verzeichnis**, ausschliesslich auf einem separaten freigegebenen Akquise-Host. Kein Upload in das Website-Webroot. Kein Website-Workflow wurde geändert. Ein neuer, auf Akquise-Dateien begrenzter CI-Workflow prüft lediglich; er veröffentlicht keine Images oder Anwendung.

1. Freigegebenen Git-Commit auschecken; Node-/PostgreSQL-Major-Versionen aus dem Dockerfile/Compose verwenden. Vor Go-live Image-Digests im Betriebsinventar festhalten; Security-Updates bewusst mit Tests einspielen. Die Quellabhängigkeiten sind durch package-lock.json fixiert.
2. `deploy/production.env.example` nach `deploy/production.env` kopieren, Rechte 600, tatsächliche Werte setzen. Secrets gehören in einen serverseitigen Secret-Store bzw. eine nur administrativ lesbare Datei, niemals in Build-Argumente, Git, NEXT_PUBLIC-Variablen oder Browser. Docker-Administratoren können Container-Umgebungsvariablen lesen und sind deshalb vertrauenswürdig zu halten.
3. DNS-A/AAAA nur für die neue Subdomain auf den neuen Host setzen. DNS-Änderung wurde **nicht** ausgeführt. Ports 80/443 werden durch Caddy genutzt; SSH nur administrativ. PostgreSQL und App-Port werden nicht öffentlich veröffentlicht. SMTP-Egress muss nach Bestätigung möglich sein.
4. Beim ersten Einsatz: `AKQUISE_DEPLOY_CONFIRMED=yes sh deploy/deploy.sh`. Dieses Skript baut Runtime und Operations-Image, startet PostgreSQL, führt `prisma migrate deploy` aus, wartet auf App-Readiness und startet Caddy. Ein Migrationsfehler stoppt den Ablauf. Niemals `migrate reset`, `db push --force-reset` oder Seed einsetzen. Bei Updates zuerst bestehende Daten sichern, siehe unten.
5. Persönliche Konten provisionieren (kein Demo-Seed): `docker compose --env-file deploy/production.env -f compose.production.yaml run --rm -T migrate node --import tsx scripts/create-user.ts "Martin Jeker" "$MARTIN_LOGIN" < /sicher/martin-passwort`. `MARTIN_LOGIN` ist die tatsächliche Adresse, exakt passend zu MARTIN_EMAIL. Analog Nora. Passwörter mindestens 14 Zeichen, unabhängig und nur über stdin. Provisionierung nicht mit `set -x` ausführen; Passwortdateien geschützt behandeln und anschliessend entfernen.
6. `/api/health/live`: Prozess-Liveness, keine Geheimnisse. `/api/health/ready`: Datenbank erreichbar und neue Delivery-Spalte vorhanden, sonst 503. Container-Healthcheck nutzt Ready. Externes Monitoring zusätzlich einrichten. Caddy übernimmt HTTPS-Erneuerung und HSTS nur auf dieser Subdomain.
7. Login, Rechte, Änderung einer Nachricht, neue Freigabe und lokale Simulation unter HTTPS mit beiden Konten prüfen. SMTP bleibt ausgeschaltet. Das Dashboard darf erst nach Abnahme für recherchierte Daten verwendet werden.

Dockerfile enthält getrennte Runtime-/Operations-Stages. Runtime läuft unprivilegiert mit schreibgeschütztem Root-Dateisystem und flüchtigem Cache. Runtime enthält weder CLI/Seed noch lokale Dateien. `.dockerignore` ist eine Positivliste. BuildKit-CA nur in dieser Cloud-Umgebung bei Bedarf via `--secret id=proxy_ca,src=...` einhängen; TLS niemals abschalten. Keine Umgebungspfade sind für den späteren Host erforderlich.

## Betrieb ohne Docker

`npm ci`, `npm run db:generate`, `npm run build`, `node scripts/package-release.mjs /leerer/release-pfad`. Das erzeugte Standalone-Artefakt enthält ausschliesslich Laufzeitdateien und entfernt `.env*`, `.local`, Demo-Zugangsdaten und Schlüsseldateien aus der Kopie. Danach kein gesamtes Repository als öffentliches Verzeichnis ausliefern.

Migrationen aus dem separaten Quell-/Operations-Verzeichnis mit dem privilegierten Migrationskonto ausführen. Artefakt nach `/opt/studiojeker-akquise/releases/<commit>` übertragen, `current`-Symlink umstellen und `deploy/akquise.service` als Vorlage nutzen. Der Dienstbenutzer benötigt nur Leserechte am Artefakt und Schreibrechte für `.next/cache`. Eigene serverseitige Runtime-Konfiguration unter `/etc/studiojeker-akquise/runtime.env`, Modus 600. Caddy/anderer Reverse-Proxy leitet HTTPS auf 127.0.0.1:3100 weiter; Port durch Firewall sperren. Pfade und Node-Binary im systemd-Unit auf den tatsächlichen Host anpassen. `node scripts/start-production.mjs` prüft HTTPS-Origin, Datenbanksecret, individuelle Konten und Mailkonfiguration vor dem Start; kein localhost-Fallback in Produktion.

## Sessions, Zugänge und Secrets

Nur die exakt konfigurierten Paare Martin Jeker/MARTIN_EMAIL und Nora Jeker/NORA_EMAIL dürfen sich in Produktion anmelden und serverseitige Aktionen ausführen. `.test`-/Demo-Konten werden auch nach versehentlichem Datenbankrestore abgewiesen. Beide haben identische Freigaberechte. Keine öffentliche Registrierung.

Sessions: zufälliger Token, nur SHA-256 in PostgreSQL, acht Stunden Laufzeit, HttpOnly, SameSite Strict und im Produktionsmodus Secure mit `__Host-`-Cookie (keine Domain-Angabe). Origin-Prüfung verwendet ausschliesslich APP_URL; Proxyheader können ihn nicht überschreiben. Persistente Login-Sperre nach fünf Fehlversuchen. Passwortreset administrativ via `scripts/reset-password.ts` (stdin); alle zugehörigen Sessions werden widerrufen. Für öffentliche Erreichbarkeit zusätzlich IP-basiertes Rate-Limiting/WAF oder VPN beim Host vorsehen; Account-Lock allein verhindert keinen verteilten Lastangriff. Ein eigener Session-Signaturschlüssel ist bei zufälligen serverseitig gespeicherten Tokens nicht erforderlich.

## SMTP: drei bewusste Freigabeschritte

Standard: `MAIL_MODE=disabled`, `ENABLE_EMAIL_SENDING=false`, `SMTP_CONFIGURATION_CONFIRMED=false`. **Aktuell wurde nichts aktiviert und keine Mail versandt.** Lokale MIME-Simulation ist unabhängig davon weiterhin möglich.

1. Metanet muss den tatsächlichen Submission-Port und die Verschlüsselung für **jovinus.metanet.ch / njeker@studiojeker.ch** bestätigen. Häufige Kombinationen 465/implizites TLS oder 587/STARTTLS sind nur Beispiele, keine bestätigte Serverkonfiguration. SMTP_PORT und SMTP_SECURE bleiben bis dahin leer. Zertifikatsprüfung und mindestens TLS 1.2 sind fest aktiv; bei SMTP_SECURE=false ist STARTTLS zwingend. SMTP_PASSWORD ausschliesslich serverseitig setzen.
2. Zum später ausdrücklich freigegebenen internen Test `MAIL_MODE=test`, `TEST_MAIL_RECIPIENTS=<exakte interne @studiojeker.ch-Liste>`, Bestätigung und Enable-Schalter setzen. Header-To und SMTP-Envelope werden ausschliesslich auf diese Liste gesetzt; es gibt kein CC/BCC an Kontaktadressen. Betreff erhält `[INTERNER TEST]`. Ein Test benötigt genauso eine aktuelle Inhaltsfreigabe und rechtliche Prüfung. Zustand TEST_SENT ist von echtem SENT getrennt. Testnachrichten werden jetzt **nicht** gesendet.
3. Produktiver Versand erfordert zusätzlich den bewussten Wechsel auf `MAIL_MODE=production`. Die Oberfläche zeigt diesen Modus an. Nach exakter Versionsfreigabe durch Martin oder Nora ist eine separate Versandbestätigung erforderlich. Kontaktdaten, Hash, Sperrliste und rechtliche Zulässigkeit werden vor dem tatsächlichen Transport erneut geprüft.

Ein dauerhaft gespeicherter SENDING-Eintrag wird vor der Netzwerkaktion reserviert. Unique-Idempotenzschlüssel und globale/contactbezogene Advisory Locks verhindern parallelen Doppelversand. Ein Produktionskontakt wird nur einmal versandt; es gibt keine automatische Follow-up-Funktion. Fehler-/unklare Zustellungen werden mit stabiler Message-ID und maskiertem Fehlercode protokolliert. Timeout, Prozessabsturz oder unklarer SMTP-Erfolg führen zu UNKNOWN bzw. verbleibendem SENDING und **niemals zu automatischem Retry**. Vor jeder manuellen Korrektur Message-ID in Metanet-Logs prüfen; keine Idempotenzschlüssel löschen, um einen Versand zu erzwingen. Bei längerer SENDING-Reservierung Betrieb alarmieren und manuell abgleichen. SMTP-Annahme ist keine Zustell-/Lesegarantie.

Tageslimit gilt pro Modus und UTC-Tag; reservierte/fehlgeschlagene Netzwerkversuche zählen mit. Interne Tests und lokale Simulationen verhindern nicht einen später freigegebenen echten Versand. Frühere SENT-Einträge bleiben konservativ als Doppelversandsperre erhalten.

## Backup, Restore und Datenübernahme

Mindestens tägliches verschlüsseltes Backup, vorgeschlagene Aufbewahrung 7 tägliche/4 wöchentliche/12 monatliche Backups. RPO-Ziel 24 Stunden, RTO-Ziel 4 Stunden; erst durch gemessene Wiederherstellung bestätigen. Backupziel muss ausserhalb des App-Hosts liegen. Beispiel: `BACKUP_DIR=/verschluesseltes/backupziel sh deploy/backup.sh`. Skript nutzt pg_dump Custom-Format mit restriktiven Dateirechten und prüft Lesbarkeit. Es konfiguriert keine Offsite-Replikation oder Verschlüsselung automatisch. Terminierung, Verschlüsselungsverwaltung und Monitoring bleiben Aufgaben des Betreibers.

Restore-Test ausschliesslich in eine neue leere Staging-Datenbank: pg_service.conf und PGPASSFILE geschützt konfigurieren, dann `RESTORE_CONFIRMED=empty-staging-database TARGET_PGSERVICE=akquise_restore BACKUP_FILE=/sicher/akquise.dump sh deploy/restore.sh`. Das Skript verweigert vorhandene Tabellen und nutzt weder DROP noch CLEAN. Inventar und ID-/Hash-Stichproben vorher/nachher vergleichen. Erst danach einen geplanten Produktionsumzug freigeben.

**Auf den Mac von Martin/Nora wurde nicht zugegriffen.** Die lokale Datenbank dort ist nicht diese Cloud-Datenbank. Nichts lokal löschen oder `.env` überschreiben. Vor Übernahme die lokale App stoppen, PostgreSQL weiterlaufen lassen und ein vollständiges pg_dump mit passender Major-Version erstellen. Bei Embedded PostgreSQL 18 dafür pg_dump 18 verwenden. Prisma-Parameter `schema` aus der libpq-URL entfernen; Passwort über PGPASSFILE, nicht Befehlsargumente liefern. Vollständiger Dump erhält Kontakte, Versionen, Freigaben, Sperrliste, Audit und Zustellhistorie. Die additive Migration verändert keine IDs und löscht keine Daten.

Demo-Daten nicht blind mitrestoren. Empfohlener Weg für den bisherigen Demo-Stand: neue leere Produktionsdatenbank migrieren, echte Konten provisionieren, recherchierte Kontaktmasterliste im dokumentierten CSV/XLSX-Format importieren. Alle Kontakte bleiben ungeprüft; keine Einwilligungen oder Versandstatus werden übernommen. Falls bereits echte Entwürfe/Freigaben lokal existieren: vollständiges Backup zuerst in isoliertes Staging restaurieren, `scripts/data-inventory.ts` verwenden, synthetische `.test`-Datensätze und deren Abhängigkeiten manuell prüfen, bereinigten Übernahmeplan erstellen und erst nach Abnahme übernehmen. Kein automatisches Datenbereinigungs-/Löschskript wurde eingebaut. Ein reiner Kontaktimport ersetzt keine Übernahme der vorhandenen Entwurfshistorie.

Bei Migration einer bestehenden echten Datenbank: Schreibpause, Backup, Restore-Probe, Inventarvergleich, additive `migrate deploy`, alte Sessions gezielt widerrufen, Domain/App umstellen und beide Logins prüfen. Keine zwei unabhängigen Datenbanken gleichzeitig beschreiben. App-Rollback nur auf ein zum Schema kompatibles Release; Datenbankbackup nicht blind zurückspielen, wenn bereits neue Daten eingegangen sind.

## Noch benötigte Angaben und Go-live-Abnahme

- Bestätigter Hostingtarif bzw. gewählter separater Node-/Containerhost und PostgreSQL-Betrieb, Region, Verantwortlicher für Updates/Backups, SSH-/Deployment-Zugang.
- Freigabe der Subdomain/DNS-Zone, Serveradresse, Zertifikatskontakt, endgültige APP_URL.
- MARTIN_EMAIL und NORA_EMAIL (tatsächliche persönliche Adressen), individuelle initiale Passwörter über sicheren Kanal, Produktions-Datenbanksecret/URL.
- Metanet-Bestätigung für Port und TLS, SMTP_PASSWORD und exakte interne Testempfänger. Keine echte Testmail ohne zusätzliche Freigabe.
- Geprüfte Kontaktmasterliste bzw. Inventar der bereits vorhandenen echten lokalen Daten samt Backup; Service-Account-Secrets nur falls Sheets benötigt wird.
- Host-Preflight (Containerbuild bzw. Standalone-Start), DB-Migration/Restore-Test, HTTPS-/Cookie-/Zugriffstest auf Safari/iPad und externer Healthcheck; betriebliche Alarmierung und Rate-Limiting konfigurieren.
- Explizite Abnahme vor Veröffentlichung. In diesem Auftrag kein DNS-Wechsel, keine Buchung, kein Deployment und keine SMTP-Verbindung.
