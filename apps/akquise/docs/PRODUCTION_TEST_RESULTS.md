# Produktionsvorbereitung: Prüfergebnisse vom 16. Oktober 2026

## Hier ausgeführt

- ESLint: erfolgreich, keine Anwendungsfehler/-warnungen.
- TypeScript: erfolgreich. Next.js-Build verwendet die vollständige TypeScript-Compiler-API statt des hier problematischen abgetrennten CLI-Unterprozesses; Typprüfung wird nicht übersprungen.
- 14 Sicherheits-/Konfigurations-/Importtests erfolgreich: vier neue Produktionsprüfungen und zehn bestehende Tests. HTTPS-Pflicht, eigene Produktionskonten, Host-Cookie, Demo-Sperre, Default-Versandsperre, Bestätigungsschalter, interne Empfängerliste, Passwörter, Hashbindung, Rechtsprüfung und CSV/XLSX-Abwehr sind abgedeckt.
- Produktions-Build erfolgreich: Standalone-App mit live-/ready-Healthchecks und serverseitiger API.
- Prisma-Schema validiert. Additive Migration manuell gegen Schema geprüft: zusätzliche Zustände und Delivery-Felder/Indizes; keine Drop-/Reset-/Delete-Anweisung, keine Änderung bestehender IDs/Hashes.
- Deployment-, Backup- und Restore-Skripte mit `sh -n` geprüft. Compose-Konfiguration und isolierte CI-Struktur syntaktisch geprüft.
- Standalone-Paketierung auf dem gebauten Artefakt ausgeführt und rekursiv auf verbotene Secret-/Demo-Dateinamen geprüft. `.env`, `.local`, Demo-Passwörter, Schlüsseldateien und Seed werden nicht in das Release kopiert. Docker-Buildkontext verwendet zusätzlich eine Positivliste.
- Unsichere Produktionskonfiguration mit localhost/HTTP wird vor Serverstart verweigert.
- Änderungen liegen in apps/akquise plus einem neuen ausschliesslich prüfenden, auf Akquise-Pfade begrenzten CI-Workflow. Bestehende Website-Dateien und Deployments unverändert.

## Hier blockiert – nicht als erfolgreich ausgegeben

Die aktuelle Ausführungsumgebung verbietet das Anlegen von TCP- **und** Unix-Domain-Sockets: PostgreSQL meldet `could not create IPv4 socket ... Operation not permitted` bzw. `could not bind Unix address ... Operation not permitted`. Docker meldet beim Daemonzugriff `permission denied ... connect: operation not permitted`.

Deshalb wurden die 17 PostgreSQL-Integrationstests dieses Produktionsstands hier nicht erfolgreich ausgeführt. Der Testcode enthält die zwölf bisherigen V1-Szenarien sowie fünf neue Dispatchprüfungen mit ausschliesslich simuliertem SMTP-Transport: Default-Sperre ohne Transportaufruf, interne Empfängerliste, paralleler Einzelversand, UNKNOWN ohne Wiederholung und Änderungsblockade nach Freigabe. Die historischen zwölf V1-Datenbanktests waren am 15. Oktober erfolgreich; dies ersetzt keine Prüfung der neuen Migration.

Aus demselben Grund konnten der tatsächliche HTTP-/HTTPS-Produktionsstart, neue Live-/Ready-Endpunkte gegen eine laufende Datenbank, die sieben bestehenden Browserprüfungen und Docker-Imagebau/-Start hier nicht erneut Ende-zu-Ende geprüft werden. Vollständiger Restore mit realem pg_restore und externe Healthcheck-/Zertifikatserneuerung bleiben Host-Abnahmeschritte. Kein „production verified“ behauptet.

## Separater CI-Prüflauf

`.github/workflows/akquise-checks.yml` führt ausschliesslich Akquise-Prüfungen aus: synthetischer PostgreSQL-18-Dienst, npm ci, Prisma-Generierung, Lint/TypeScript/Unit- und Integrationstests, Produktionsbuild, sichere Paketierung, Browserchecks sowie Bau beider Docker-Stages. Er benötigt keine echten Zugangsdaten, setzt Versand explizit aus und veröffentlicht weder Anwendung noch Images. Der tatsächliche CI-Laufstatus ist im Pull Request einzusehen; bis zu einem erfolgreichen Lauf bleiben die genannten Umgebungsprüfungen offen.

## Betriebliche Freigabepunkte

Keine SMTP-Verbindung, kein Versand, kein Transport-verify und kein Postfachabruf ausgeführt. Metanet-Port/TLS sind weiterhin unbestätigt. Noch kein ausgewählter/bezahlter Host, keine DNS-Änderung, keine echten Benutzer provisioniert und kein Produktionssecret gespeichert. Das aktuelle lokale Mac-System der Benutzer wurde weder gelesen noch verändert.

Das Abhängigkeits-Audit des vorherigen V1-Stands meldete keine Produktionsschwachstellen und fünf High-Meldungen in der ESLint/braces-Entwicklungskette. Hier wurden keine Bibliotheksversionen geändert und kein neues Online-Audit als erfolgreich behauptet; vor Go-live aktuelles Audit auf dem freigegebenen Build-Host wiederholen.

Die wesentlichen nächsten Schritte stehen unter „Noch benötigte Angaben und Go-live-Abnahme“ in PRODUCTION.md. Erst nach grüner CI, Host-/Restore-Probe und expliziter Abnahme veröffentlichen. Echter SMTP-Versand bleibt eine separate Freigabe.
