# StudioONE – isolierter Praxistest

## Zweck
Externe Testpersonen können mit persönlicher E-Mail-Adresse und selbst gewähltem Passwort die StudioONE-Bedienung erproben, ohne Zugang zu produktiven Studiojeker-Kontakten oder Integrationen zu erhalten.

## Sicherheitsgrenze (verbindlich)
- Eigener Render-Web-Service und **eigene leere PostgreSQL-Datenbank**. Niemals die produktive DATABASE_URL wiederverwenden oder eine Kopie echter Kontakte importieren.
- `STUDIOONE_TEST_SANDBOX=true` ausschliesslich auf dem isolierten Test-Service.
- `TEST_ACCESS_CODE` als zufälliger geheimer Wert mit mindestens 32 Zeichen, ausschliesslich in Render Secrets; über einen separaten, geschützten Kanal mit Testpersonen teilen.
- `MAIL_MODE=disabled`, `ENABLE_EMAIL_SENDING=false`, `SMTP_CONFIGURATION_CONFIRMED=false`, `CONTENT_AI_ENABLED=false`, `SITE_CMS_ALLOW_PUBLISH=false`.
- Keine SMTP-, Mailchimp-, Drive-, Google-Sheets-, OpenAI-, Sanity-, Social-OAuth-, S3- oder ChatGPT-Schreibschlüssel an den Test-Service übergeben. Der App-Start prüft kritische Verbote.
- Zugänge werden via `/testzugang` mit individuellem Namen, echter E-Mail und mindestens 14 Zeichen Passwort erstellt. Maximal 20 Konten pro Testdatenbank.
- Es gibt fünf synthetische Kontakte; neue Testeinträge und Entwürfe bleiben in der gemeinsamen Testdatenbank. Keine echten personenbezogenen Daten eingeben.
- Die vorhandene produktive Martin/Nora-Allowlist bleibt ausserhalb der Testumgebung unverändert.

## Deployment
1. Separate Datenbank in Render (nicht dieselbe Datenbank / nicht nur ein anderes Login).
2. Render-Webservice aus Branch `feat/akquise-production-readiness` aufbauen, Verzeichnis `apps/akquise`.
3. Build: `cd apps/akquise && node render/build.mjs`.
4. Start: `cd apps/akquise && node render/command.mjs migrate && node render/command.mjs start` (DB-Schema vor erstem Login einrichten).
5. In Render konfigurieren: `DATABASE_URL` als interner URL **der neuen Testdatenbank** (geheim), `STUDIOONE_TEST_SANDBOX=true`, `TEST_ACCESS_CODE` (geheim), `MAIL_MODE=disabled`, `ENABLE_EMAIL_SENDING=false`, `SMTP_CONFIGURATION_CONFIRMED=false`, `CONTENT_AI_ENABLED=false`, `SITE_CMS_ALLOW_PUBLISH=false`; `APP_URL` wird von Render gesetzt.
6. Gesundheitsprüfung: `/api/health/ready`; anschliessend Anmeldung und Anlegen eines Testkontos mit korrektem Code durchspielen.
7. Testlink `https://<test-dienst>.onrender.com/testzugang` teilen, Einladungscode vertraulich separat weitergeben.

## Testumfang / Grenzen
Echte Versand- und Publikationsaktionen, Mailchimp, Drive, Social-Verbindungen und AI-Provider sind absichtlich nicht nutzbar. Alle übrigen integrierten Arbeitsabläufe mit lokaler Datenbank sollten im Rahmen des Praxistests überprüft werden. Ohne diese Integrationen kann der Livebetrieb nicht vollständig end-to-end getestet werden. Die Testdatenbank darf zurückgesetzt werden, muss aber nicht vor jeder Testperson neu angelegt werden.

Ein kostenloser Render-Postgres-Testzugang kann zeitlich befristet sein; das Ablaufdatum in Render kontrollieren. Eine Testfreigabe ersetzt nicht die Freigabe produktiver Veröffentlichungen.
