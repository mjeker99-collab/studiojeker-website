# StudioONE: Bereitstellungsprüfung am 17.10.2026

## Ergebnis und Beleggrenzen

Die App ist im Git-Branch vorhanden und ihre Projektprüfungen sind erfolgreich.
Ein tatsächlicher Render-Service, sein Quellbranch und sein Deploymentstatus konnten
nicht geprüft werden: keine Render-Anbindung, kein Render-API-Key/Service-Identifier
in der Umgebung oder lokalen Konfiguration und keine bereitgestellte Service-URL.
Die Cloud-Umgebung meldet keine konfigurierten Secrets/Identitäten. Deshalb weder
«bereits live», «Deployment fehlgeschlagen» noch «noch nicht eingerichtet» behaupten.
Das sind derzeit **unbekannte Zustände**, keine negativen Prüfergebnisse.

GitHub-Commitstatus für den Merge enthält keine Render-Meldung. Der Check-Run des
Mergecommits ist ausschliesslich GitHub Actions. Das schliesst einen Render-Deploy
nicht aus: Render muss nicht zwingend jeden Deploy über GitHub zurückmelden.
Der GitHub-Connector erlaubt die Deployments-Collection nicht (INVALID_ARGUMENT);
auch daraus lässt sich kein Render-Status ableiten.

## Tatsächlicher Integrationsstand

| PR                           | Status     | Ziel                              |
| ---------------------------- | ---------- | --------------------------------- |
| #133 Akquise V1              | offen      | main                              |
| #140 Produktionsvorbereitung | offen      | feat/akquise-platform-v1          |
| #141 Render                  | offen      | feat/akquise-production-readiness |
| #142 Marketing Hub           | integriert | feat/akquise-render-frankfurt     |
| #143 Content-Studio          | integriert | feat/akquise-render-frankfurt     |
| #144 STUDIOONE-Logo          | offen      | feat/akquise-render-frankfurt     |

Aktueller vollständiger Render-Branch: `feat/akquise-render-frankfurt`, Commit
`0742d73fa0c9c26b9820f707d809d3da366f4745`. Die früheren Hub-/Content-Studio-Featurebranches
sind keine dauerhafte Deploymentempfehlung. Insbesondere der #143-Featurebranch wurde
nach Integration entfernt. Logo #144 ist noch nicht enthalten. Kein automatischer Merge.

main-Head zum Prüfzeitpunkt: `ace2c4d1dc60519b9dccccefccd2cdf62eff9ec1`.
`apps/akquise/package.json` auf main liefert GitHub 404. Ein App-Service, der dort
main mit diesem Root Directory baut, würde den vorbereiteten StudioONE-Stand nicht finden.
Ob ein tatsächlicher Service so eingestellt ist, ist ausdrücklich nicht bekannt.

Projektbelege:

- [CI auf dem tatsächlichen Mergecommit / #141](https://github.com/mjeker99-collab/studiojeker-website/actions/runs/39027052894): vollständig erfolgreich, Build/Migrationstests/Browser/Imagebau, kein Deployment.
- [Content-Studio #143](https://github.com/mjeker99-collab/studiojeker-website/actions/runs/39026650679): erfolgreich.
- [Logo #144](https://github.com/mjeker99-collab/studiojeker-website/actions/runs/39027188099): erfolgreich; noch nicht integriert.

## Benötigte Render-Ansichten – zuerst nur lesen

Im [Render-Dashboard](https://dashboard.render.com/) den bestehenden Workspace öffnen.
Nicht New/Create/Apply wählen und keinen Website-Service umstellen.

1. **Workspace / Projects / Services:** existiert ein eigener StudioONE-/Akquise-
   Web-Service? Benötigt: dessen Dashboard-URL oder `srv-…`-ID und öffentliche
   `https://…onrender.com`-URL. Ein Blueprint allein beweist keinen laufenden Web-Service.
   Falls kein eigener Service existiert, die leere/entsprechende Serviceübersicht
   bestätigen; erst danach ist «noch nicht eingerichtet» belegbar.
2. **Dieser Web-Service → Settings → Build & Deploy:** Repository, Branch, Root
   Directory, Build Command, Pre-Deploy Command, Start Command, Auto-Deploy und
   gegebenenfalls Build Filters ablesen. Die dort gespeicherten Werte sind der
   Nachweis, nicht render.yaml. Nur den separaten App-Service betrachten.
3. **Deploys** (je nach Ansicht zusätzlich **Events**): letzten Versuch öffnen.
   Benötigt: Status, Zeitpunkt, Commit-SHA und Phase. Live = erfolgreich laufender
   Deploy; Build/Pre-deploy/Start-Fehler getrennt benennen. Ein älterer Live-Commit
   beweist nicht, dass #143 bereitsteht. Bei Fehler den ersten aussagekräftigen
   Fehler samt etwa 20 Zeilen Kontext aus Logs bereitstellen, keine Secrets.
4. **Environment:** nur Variablennamen und «gesetzt/nicht gesetzt» prüfen; Werte
   von Datenbankpasswort, S3-/API-Schlüsseln, privaten Google-Schlüsseln und Deploy
   Hook nicht in Chat/Screenshots offenlegen. Gespeicherte APP_URL muss zum aufgerufenen
   HTTPS-Origin passen. Auto-Deploy off und ein Merge bedeuten für sich keinen Deploy.
5. **Verknüpfte PostgreSQL-Ressource:** Verfügbarkeit, Region Frankfurt, Version,
   Backups/PITR und interne Anbindung prüfen. Service/Speicher nicht ersetzen oder
   verkleinern. Bereits gespeicherte Daten zuerst inventarisieren und sichern.

Optionaler zusätzlicher Beleg in der **Shell des tatsächlich laufenden App-Service**:

```sh
node -e 'for (const k of ["RENDER_SERVICE_ID","RENDER_GIT_REPO_SLUG","RENDER_GIT_BRANCH","RENDER_GIT_COMMIT","RENDER_EXTERNAL_URL"]) console.log(k+"="+(process.env[k]||"nicht gesetzt"))'
```

Diese feste Allowlist enthält keine Secrets. Sie zeigt den laufenden Deploy;
Settings zeigt dagegen den für künftige Deploys eingestellten Branch. Nicht `env`
oder `printenv` ausgeben. Für direkte Prüfung wäre ein sicher eingerichteter
Render-Lesezugriff erforderlich; API-Schlüssel niemals im Chat posten.

## Vorgesehene Servicewerte – NICHT als Istzustand lesen

| Feld               | Sollwert für den separaten App-Service |
| ------------------ | -------------------------------------- |
| Repository         | mjeker99-collab/studiojeker-website    |
| Branch derzeit     | feat/akquise-render-frankfurt          |
| Root Directory     | apps/akquise                           |
| Runtime / Region   | Node / Frankfurt                       |
| Build Command      | node render/build.mjs                  |
| Pre-Deploy Command | node render/command.mjs migrate        |
| Start Command      | node render/command.mjs start          |
| Health Check Path  | /api/health/ready                      |
| Auto-Deploy        | Off, bewusste manuelle Freigabe        |

Die Befehle sind relativ zum Root Directory. `npm start` aus der Repository-Wurzel
würde die Website betreffen und ist für den App-Service falsch. Ein Static Site-
Service reicht nicht für Authentifizierung, Prisma und private Medienrouten.
Keinen anderen vorhandenen Website-Service dafür zweckentfremden.

## Variablen und Dienste

**Zum Anmelden und Speichern erforderlich:** bestehender separater Node-Webdienst,
PostgreSQL, dessen interne DATABASE_URL (Secret), persönliche MARTIN_EMAIL und
NORA_EMAIL, vorhandene/gezielt angelegte individuelle Konten. Render erzeugt die
HTTPS-URL; APP_URL kann beim Render-Launcher unset bleiben, dann wird
RENDER_EXTERNAL_URL verwendet. Bei eigener Domain muss APP_URL exakt übereinstimmen.
DATABASE_CONNECTION_LIMIT=3. Node-Version laut Blueprint 22.22.0.

**Fest deaktiviert:** MAIL_MODE=disabled, ENABLE_EMAIL_SENDING=false,
SMTP_CONFIGURATION_CONFIRMED=false, CONTENT_AI_ENABLED=false,
STUDIO_LOCAL_ASSETS=false. SMTP_PASSWORD und ALLOW_SYNTHETIC_SEED nicht setzen.
SMTP-Ports/TLS oder IMAP-Zugänge sind für diese Bereitstellung nicht erforderlich.

**Für eigene Bilder/Fonts/Exporte erforderlich, unabhängig von KI:** privater
S3-kompatibler Objektspeicher und STUDIO_S3_ENDPOINT (HTTPS), STUDIO_S3_REGION,
STUDIO_S3_BUCKET, STUDIO_S3_ACCESS_KEY_ID, STUDIO_S3_SECRET_ACCESS_KEY.
Kein öffentliches Bucket und keine Persistenz allein auf Render-Dateien. Ein bereits
vorhandener geeigneter Speicher kann benutzt werden; in dieser Prüfung nichts buchen.
Kontakte, Entwürfe, Freigaben und Kampagnen benötigen keinen OpenAI-Zugang.
Ohne S3 bleiben Textplanung und Freigaben nutzbar, Bild-Upload/Export ist nicht verbunden.

**Optional später:** OPENAI_API_KEY + bewusstes CONTENT_AI_ENABLED=true, Modelle
und Kostenlimits. Ohne Key bleiben Generierungsbuttons deaktiviert, eigene Inhalte
mit konfiguriertem privatem Speicher vollständig nutzbar. Freigegebene TTF/OTF ist
für Headline/Claim im Bild nötig, nicht für normale Textbearbeitung oder reinen Motivexport.
Google-Sheets-Zugang nur bei gewünschtem Import. Kein Social-/Mailchimp-API-Zugang
für manuelle Planung/Exporte nötig. Kein neuer Worker/Redis-Dienst erforderlich.

Die Produktionsvorlagen render/.env.example und deploy/production.env.example sind
um diese Variablen ergänzt. Die separate lokale .env.example bleibt nur Entwicklung.
Keine .env-Datei aus dem Repository mit lokalen URLs in Render hochladen.

## Migrationen ohne Datenverlust vorbereiten

Die Kette besteht aus:

1. 202610150001_initial
2. 202610160001_production_delivery
3. 20261016200000_marketing_hub
4. 20261017103000_content_studio

Der Pre-deploy-Befehl führt nur `prisma migrate deploy` aus. Bereits angewendete
Migrationen bleiben laut _prisma_migrations unverändert; keine Migration neu schreiben,
kein db push, migrate reset oder automatischer Seed. Content-Studio legt zusätzliche
Tabellen an und ordnet alte Kontakte/Entwürfe/Kampagnen Studiojeker zu. Es löscht keine
bestehenden Inhalte oder Freigaben. Der Ready-Healthcheck verlangt die neuen Tabellen.

Vor einem tatsächlichen Deploy:

- Prüfen, welche Datenbank der bestehende Service nutzt und welche Migrationen dort
  angewendet sind. In Shell vom App-Root: `node node_modules/prisma/build/index.js migrate status`.
  Bei MIGRATION_DATABASE_URL den Status gegen dieselbe Zieldatenbank prüfen, die der
  Pre-deploy benutzt. Niemals ein anderes Ziel nur zum Beheben einer Fehlermeldung wählen.
- Aktuelles DB-Backup/PITR und Wiederherstellungsweg bestätigen. Bestehende Datenbank
  nicht ersetzen. Bei Datenübernahme Quelle/Ziel, IDs, Versionen und Mengen vergleichen.
- Lokale eigene Bilder liegen zusätzlich unter `.local/studio-assets`, die DB enthält
  nur Referenzen. Bei Übernahme vollständiger Daten zusätzlich diese Objekte mit exakt
  gleichen Schlüsseln in den privaten Bucket übertragen und SHA256 prüfen. Ein DB-Dump
  allein erhält keine Bilddateien. Schreibzugriffe während konsistenter Übernahme pausieren.
  Eine reine CSV-Übernahme ersetzt keine Entwurfs-/Freigabe-/Historienübernahme.
- Erst nach bestätigtem Ziel und Backup die bestehende Pre-deploy-Migration beim
  ausdrücklich freigegebenen Deployment ausführen. Bei Fehler stoppen und Logs prüfen,
  nicht Reset/Seed als Reparatur verwenden. App-Rollback rollt Schema nicht zurück.
- Anschliessend beide persönlichen Konten prüfen; nur fehlende Konten über die bestehende
  verdeckte stdin-Provisionierung erstellen, nie Datenbank oder Benutzer neu seeden.

## Konkreter nächster Schritt

Zuerst **Service-Link + Settings/Build-&-Deploy + letzter Deploy/Logs** aus dem
Dashboard abgleichen. Das trennt «falscher Branch», «vorhandener fehlgeschlagener Deploy»
und «noch kein Service». Erst nach diesem Nachweis passende bestehende Einstellungen
und fehlende Secrets korrigieren. Speichern von Service-/Environment-Einstellungen kann
bereits einen Deploy auslösen; deshalb jetzt nur ablesen.

Wenn der eigene Service und seine Datenbank bereits existieren und Ziel, Backup,
Secrets und Befehle stimmen: nach ausdrücklicher Bereitstellungsfreigabe im App-Service
**Manual Deploy → Deploy latest commit** für den bestätigten Branch verwenden; vor
Klick den aufgelösten Commit prüfen. Für den aktuellen geprüften Hub-Stand ist das
0742d73…; nach weiteren Merges erneut abgleichen. Logo #144 ist separat zu integrieren,
wenn es beim ersten Live-Stand enthalten sein soll. Nichts automatisch mergen.

Wenn kein eigener Service/keine DB existieren: die Einrichtung ist vorbereitet, aber
wegen des Verbots neuer kostenpflichtiger Ressourcen hier bewusst nicht ausgeführt.
Create/Apply ist kein kostenloser Vorschau-Schritt, sondern kann Ressourcen und ersten
Deploy starten. Keine DNS-Änderung ist für die generierte onrender.com-HTTPS-URL nötig.

Quellen für Dashboard-/Deploy-Verhalten (offizielle Dokumentation, geprüft 17.10.2026):

- https://render.com/docs/deploys
- https://render.com/docs/monorepo-support
- https://render.com/docs/environment-variables

Keine Ressourcen angelegt, keine Serviceeinstellung verändert, kein Deployment
angestossen, keine E-Mail/Social-Veröffentlichung, Website/Workflows unverändert.

## Gezielte Projektprüfung dieser Dokumentationskorrektur

Vier Render-Sicherheitsprüfungen und fünf Content-Studio-Konfigurationsprüfungen
bestanden. Zusätzlich beide Produktionsvorlagen auf vollständige Variablennamen,
leere Secret-Platzhalter und deaktivierte Mail-/KI-/Dateisystem-Schalter geprüft.
Mit ausdrücklich synthetischer S3-Konfiguration ohne OpenAI-Key liefert die
Produktionskonfiguration S3 als Speicher und KI als nicht verbunden. Es wurden
keine Object-Storage- oder Provideranfragen ausgeführt. Keine Runtimefunktion
geändert und keine vollständige lokale Testsuite erneut gestartet; der tatsächliche
Mergecommit ist bereits durch die oben verlinkte vollständige CI geprüft.
