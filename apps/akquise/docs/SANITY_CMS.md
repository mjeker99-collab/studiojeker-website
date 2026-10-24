# Sanity in StudioONE

## Bedienung

Website öffnet das bestehende Studio (Projekt `tgx6e6jg`, Dataset `production`). Der Editor wird in einem eigenen Tab geöffnet. Der gehostete Studio-Endpunkt leitet zum Sanity Dashboard weiter und erlaubt keine Fremd-Frames (am 18.10.2026 geprüft). Sanity verwendet die persönliche Sanity-Anmeldung; StudioONE-Zugang erteilt keine Sanity-Berechtigung. Website enthält ausschliesslich Website-Zugänge und lädt keine Newsletter-Daten. Die Newsletter-Übersicht und der Import sind ausschliesslich unter Newsletter in StudioONE; dies ist keine lokal eingebettete Kopie des Sanity Editors.

Die Website bleibt über bestehende Schemas und den bisherigen Deploymentweg bearbeitbar. StudioONE veröffentlicht keine Website-Builds. In Sanity kommt der Bereich Newsletter mit den drei vorhandenen Layouts hinzu. Titel, Betreff, Vorschautext, Zielgruppe, Texte, Bilder und Links sind bearbeitbar. Logo, HTML-Struktur, geschützte Fusszeile und Mailchimp-Platzhalter bleiben im bewährten Renderer. Ein gewähltes Sanity-Bild hat Vorrang vor einer URL; für eine externe URL das ausgewählte Bild entfernen. Sanity-Bilder verwenden derzeit das Original, nicht den Hotspot-Ausschnitt.

1. In Sanity unter Newsletter eine Vorlage wählen und eine Ausgabe erstellen.
2. Inhalt bearbeiten und mit Publish bereitstellen. Das versendet keine E-Mail.
3. In StudioONE die Sanity-Liste aktualisieren und die Ausgabe als neuen Entwurf übernehmen.
4. Unter Newsletter Vorschau und Zielgruppe prüfen und persönlich freigeben.
5. Den freigegebenen Stand als Mailchimp-Entwurf übertragen. Versand bleibt in Mailchimp.

Importe sind unveränderliche Snapshots. Ein erneuter Import derselben Sanity-Revision wird auch bei gleichzeitigen Klicks verhindert. Eine geänderte Revision erzeugt einen neuen Entwurf, ohne bestehende Inhalte oder Freigaben zu überschreiben. Änderungen seit dem Listenabruf verlangen einen neuen Listenabruf. Keine automatische Synchronisierung und kein Schreibzugriff auf Sanity. Das Audit protokolliert Projekt, Dataset, Dokument, Revision und lokale Inhalts-ID. Die Liste zeigt die 100 zuletzt geänderten bereitgestellten Ausgaben.

## Aktivierung

Zwei Bereitstellungen sind nötig:

- StudioONE: PR in `feat/akquise-production-readiness` integrieren und bestehenden Render-Dienst deployen. Keine Datenbankmigration oder neue Bibliothek nötig.
- Sanity: Schema/Struktur und `apps/akquise/templates/newsletter-cms.json` gemeinsam bereitstellen. Der bestehende Render-Deploy veröffentlicht Sanity nicht. Aus dem geprüften vollständigen Checkout `cd studio && npm ci && npm run typecheck && npm run build && npm run deploy` mit Sanity-Anmeldung ausführen. Alternativ nur die betreffenden Änderungen nach Prüfung in den Sanity-Deploy-Branch übernehmen. Nicht den gesamten Akquise-Branch nach main mergen.

Öffentlich bereitgestellte Inhalte sind ohne Token lesbar. Für ein privates Dataset optional `SANITY_API_READ_TOKEN` als geheimes Render-Environment mit reinen Leserechten setzen. Keinen Schreib-/Admin-Token verwenden. Keine Secrets im Browser. Ein HTTP-Lesetest prüft nicht die Editor-Anmeldung.

Newsletter liegen im bestehenden Website-Dataset. Bei einem öffentlichen Dataset sind bereitgestellte Newsletter öffentlich abfragbar. Hier nur publikationsfähige Inhalte und allgemeine Zielgruppenbeschreibungen, keine Empfängerlisten oder vertraulichen Kundendaten pflegen. Vertrauliche Redaktion erfordert ein separat abgesichertes Dataset.

## Entwicklung

`node scripts/compile-newsletter-cms.mjs` im Akquise-Verzeichnis aktualisiert den gemeinsamen Feldvertrag aus der Layoutbibliothek. Layout-IDs bleiben unveränderlich; neue Layoutversionen brauchen neue IDs. Die Unit-Tests prüfen den Vertrag gegen den Renderer. E-Mail-Client-Abnahme und Mailchimp-Übertragung erfolgen über den bestehenden Ablauf.

Die bestehende CSP bleibt unverändert; API-Aufrufe gehen serverseitig zum festgelegten Projekt. Auth-/Origin-Schutz gilt für Lesen und Import. Abfragen haben Timeout und Grössenlimit; unveröffentlichte Entwürfe und Release-Versionen sind ausgeschlossen.

## Prüfstand 18.10.2026

- StudioONE: ESLint, TypeScript und alle 44 Unit-/Konfigurationsprüfungen bestanden.
- Sanity Studio: TypeScript und Produktionsbuild bestanden.
- Echte öffentliche Sanity-Leseabfrage erfolgreich; derzeit 0 Newsletter im neuen Schema.
- Datenbanktest für Berechtigung, veraltete Revisionen, konkurrierende Importe und neue Entwürfe ergänzt. Lokal nicht ausgeführt: PostgreSQL kann nicht als Root initialisiert werden und diese Laufzeit bildet keine andere Benutzer-ID ab.
- Browserprüfung für Desktop/iPad/Mobil, Barrierefreiheit, Importstatus und Verbindungsfehler ergänzt. Lokal nicht ausgeführt: kein Chromium installiert, Browserdownload liefert kein gültiges Archiv.
- Persönlicher Sanity-Login, echte redaktionelle Importprobe und E-Mail-Client-Prüfung bleiben nach Bereitstellung offen. Keine Produktionsinhalte verändert und kein Versand ausgelöst.

## Diagnose der Bereitstellung

Der Sanity-Workflow `.github/workflows/deploy-sanity-studio.yml` läuft automatisch nur bei Änderungen unter `studio/**` auf `main`. Der StudioONE-Branch `feat/akquise-production-readiness` enthält die Newsletter-Schemas; ein Render-Deployment dieses Branches aktualisiert den Sanity-Editor nicht. Fehlt dort Newsletter, den Workflow manuell mit diesem Branch ausführen (mit vorhandenem `SANITY_AUTH_TOKEN`) oder die Sanity-Änderungen samt `apps/akquise/templates/newsletter-cms.json` gezielt nach main übernehmen. Danach die Editor-Ansicht und eine Testausgabe prüfen. Eine leere Importliste allein beweist kein fehlendes Schema.
