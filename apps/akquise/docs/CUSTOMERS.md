# Interne Kundenprofile in StudioONE

Unter **Kunden** erfassen Martin und Nora interne Firmenprofile mit Name, Website,
Ansprechperson, E-Mail und Notizen. Ein Profil kann aktiv oder inaktiv sein.
Es ist ausdrücklich **kein Benutzerkonto**: Kunden können sich nicht anmelden und
erhalten keinen Zugriff auf StudioONE, Entwürfe oder Medien.

Kampagnen und neue Content-Serien können einem aktiven Kunden zugeordnet werden.
Bei einem Serienbriefing werden nur Kampagnen desselben Kunden angeboten; der
Server prüft diese Zuordnung erneut. Ohne Kunde bleiben interne Kampagnen und
Serien möglich. Bereits bestehende Datensätze behalten ihre leere Zuordnung.
Der bestehende Studiojeker-Workspace samt Markenprofil bleibt erhalten; ein
Kundenprofil übernimmt das Studiojeker-Branding nicht automatisch und führt
keine Kundendaten an externe Dienste über.

## Bereitstellung

Vor dem Render-Deploy Datenbankbackup erstellen und die additive Migration
`20261018160000_internal_customers` mit `prisma migrate deploy` ausführen.
Keinen Reset und keine automatische Zuordnung bestehender Kontakte vornehmen.
Nach dem Deploy ein internes Testprofil anlegen, Kampagne und Serie zuordnen,
Bearbeitung und Inaktivsetzung prüfen. Kein E-Mail-Versand wird ausgelöst.

Bestehende Akquise-Kontakte sind personenbezogene Leads und werden vorerst nicht
automatisch mit Kundenprofilen verknüpft. Künftige Erweiterungen können eigene
Kundenmarkenprofile, Medienfreigaben und Mandatsübersichten ergänzen.

## GPT-Recherche im Kundenformular

«Mit GPT recherchieren & ausfüllen» startet eine Webrecherche auf Basis von
Firmenname und Website. «Vorhandene Angaben ausformulieren» arbeitet nur mit
bereits ausgefüllten Wissensfeldern. Kontaktperson, Kontakt-E-Mail und interne
Notizen werden nicht übertragen. Beide Aktionen verwenden die bestehende
OpenAI-Verbindung (`CONTENT_AI_ENABLED`, `OPENAI_API_KEY`, `CONTENT_TEXT_MODEL`).
Der Button erklärt die Übermittlung vor dem Start; keine weitere Bestätigung.

Ergebnisse sind Vorschläge: einzelne Felder bewusst ersetzen oder alle leeren
Felder ergänzen. Bereits geschriebene Inhalte bleiben bei der Sammelübernahme
erhalten. Quellen werden pro Feld anklickbar angezeigt und als URL im Feldtext
mitgespeichert. Fehlende Angaben erscheinen als Rückfragen. Speichern bleibt eine
separate Aktion. Wechsel des Kunden verwirft die Vorschau.

Recherche nutzt Responses `web_search` mit erzwungenem Suchaufruf und höchstens
drei Tool-Aufrufen. Quellen werden gegen die vom Provider gelieferten
Suchquellen/Zitate geprüft. Diese Prüfung bestätigt die URL-Herkunft, nicht die
Richtigkeit jeder Aussage; menschliche Prüfung bleibt erforderlich. Unvollständige
Ausgaben oder erfundene Quellen werden nicht übernommen. Keine stillen Retries.
API-Dokumentation: https://developers.openai.com/api/docs/guides/tools-web-search

Die Aufträge nutzen dasselbe StudioJob-Konto, denselben Organisations-Lock und
dieselben Tageslimits wie das Content-Studio. Recherche reserviert drei Text-
Reserven, Ausformulieren eine; dies ist kein garantierter API-Preis. Es werden
keine Content-Serien angelegt und keine Kundenrecherchen in andere Projekt-
Gedächtnisse aufgenommen. Einmalige requestKeys verhindern Doppelstarts.

Vor Bereitstellung `npm run db:migrate` ausführen. Die Migration
`20261022090000_customer_assistant` erlaubt Aufträge ohne Content-Serie und
verändert keine bestehenden Kundendaten. Kein neuer Schlüssel oder Paket nötig.
Ein unklar abgebrochener Recherche-Auftrag wird nach drei Minuten beim nächsten
Rechercheversuch als UNKNOWN markiert; die Budgetreserve bleibt bestehen.

Prüfung: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`;
zusätzlich `tests/integration/customer-assistant.test.ts` gegen eine isolierte
lokale PostgreSQL-Datenbank und `tests/browser/customer-assistant.spec.ts`.
Ein Live-Aufruf mit der tatsächlich konfigurierten Modellfreigabe bleibt der
abschliessende Betriebscheck; Tests verwenden synthetische Providerantworten.
