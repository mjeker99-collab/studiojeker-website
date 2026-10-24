# Prüfergebnisse – 15. Oktober 2026

> Historischer Stand der lokalen V1. Die Produktionsvorbereitung vom 16. Oktober ist in PRODUCTION.md und PRODUCTION_TEST_RESULTS.md dokumentiert; deren Konfigurations- und Versandregeln ersetzen die ursprüngliche dauerhafte SMTP-Sperre.

Alle Kontakte und Zugangsdaten der Tests sind synthetisch. Kein SMTP-Verbindungsversuch, keine echten E-Mails, kein produktives Deployment.

| Prüfung                         | Ergebnis                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| ESLint                          | Erfolgreich, keine Fehler oder Warnungen im Anwendungscode                                   |
| TypeScript                      | Erfolgreich                                                                                  |
| Produktions-Build               | Erfolgreich mit Next.js 16.4.1 / Webpack                                                     |
| Sicherheits- und Importtests    | 10/10 erfolgreich                                                                            |
| PostgreSQL-Integrationstests    | 12/12 erfolgreich, ohne Docker                                                               |
| Browser-/API-Tests              | 7/7 erfolgreich, Chromium                                                                    |
| Responsive Darstellung          | 1440×1000, 1024×768, 768×1024 und 390×844; kein Seitenüberlauf in allen sechs Hauptansichten |
| Automatisierte Barrierefreiheit | axe-core: keine WCAG 2 A/AA oder WCAG 2.1 AA-Verstösse auf Dashboard und Kontaktformular     |
| Produktionsabhängigkeiten       | `npm audit --omit=dev`: 0 gemeldete Schwachstellen                                           |
| Gesamte Abhängigkeiten          | 5 High-Meldungen in der ESLint-Entwicklungskette wegen `braces <=3.0.3`; siehe unten         |
| Website-Isolation               | Sämtliche neuen Dateien unter apps/akquise; keine Änderung bestehender Website-Dateien       |

## Sicherheits- und Datenbanknachweise

- Unbekannte und deaktivierte Benutzer werden blockiert. Individuelle Anmeldung, Scrypt-Prüfung und persistente Sperre nach fünf Fehlversuchen getestet.
- Freigaben enthalten Benutzer, Zeitpunkt, Kontakt, Version und Nachrichtenhash. Vollständiges Lesen muss bestätigt werden.
- Text-/Betreffänderungen erzeugen neue Versionen und invalidieren bisherige Freigaben. Empfängeränderungen am Kontakt invalidieren zusätzlich die rechtliche Prüfung. Veraltete Versionsstände werden abgewiesen.
- Persönliche verifizierte Adresse, Quelle, Datum und Anknüpfungspunkt sind erforderlich. Allgemeine, geschätzte und ungeprüfte Adressen werden blockiert.
- Rechtliche Prüfung ist separat erforderlich. Öffentliche Auftraggeber benötigen eine ausdrückliche beschaffungsrechtliche Prüfung.
- Zentrale Sperrliste verhindert Entwurfserstellung, Freigabe und Simulation. Ein Kontaktstatuswechsel kann keine Zustellung auslösen.
- Zwei parallele Simulationsanforderungen erzeugen genau einen Protokolleintrag mit derselben Message-ID. Wiederholungen liefern denselben Eintrag. Neue Entwürfe an bereits simulierte Empfänger werden gesperrt. Tageslimit geprüft.
- CSV/XLSX-Validierung, Formelschutz, Dublettenerkennung, URL-Prüfung und Grössenlimits getestet. Importe erzeugen keine Entwürfe, Einwilligungen oder Versandaufträge.
- SMTP-Sperre auch bei `ENABLE_EMAIL_SENDING=true` getestet. Lokaler Nodemailer-Stream erzeugt MIME ohne Netzwerktransport.
- Im HTTP-Test: anonymer Datenzugriff 401, falscher Origin 403, externer Versand 403, übergrosse Anfrage 413.
- Vollständiger Browserablauf: synthetischen Kontakt anlegen, Entwurf erstellen, rechtlich ungeprüfte Freigabe ablehnen, Rechtsprüfung dokumentieren, exakt gelesene Version freigeben, lokal simulieren, neue Textversion speichern und entwertete Freigabe prüfen.

Die Integrationstests nutzen echte lokale PostgreSQL-Transaktionen und Advisory Locks. Das eingebettete PostgreSQL läuft ohne Docker als normaler Benutzer. Jeder Testlauf verwendet ein zufällig benanntes separates Schema und löscht nur dieses anschliessend. Die Entwicklungsdaten bleiben erhalten.

## Gefundene und behobene Probleme

TypeScript-Typ des MIME-Buffers korrigiert. CSP für benötigtes Entwicklungs-Eval angepasst, ohne diese Ausnahme im Produktionsmodus zu setzen. Ein absolut positionierter Tabellen-Hilfstext verursachte Seitenüberlauf; sein Positionierungsbezug ist korrigiert. Kontraste der Kennzahlen, Navigation und Fusszeile verbessert. Dialoge besitzen Fokussteuerung, Escape-Schliessen, Fokus-Rückgabe und gesperrten Hintergrund. Next.js-Tracing und Turbopack-Root sind auf die isolierte App begrenzt.

Next.js, Nodemailer und CSV-Parser aktualisiert. Sicherheitskorrekturen für die transitiven Abhängigkeiten effect, deepmerge-ts und UUID über explizite Overrides eingebunden; Import-, Migrations-, Typ- und Build-Prüfungen mit diesen Versionen durchgeführt.

## Verbleibende Grenzen

- Die fünf High-Meldungen betreffen dieselbe nicht behobene `braces`-Schwachstelle in der ESLint-Kette (`@next/eslint-plugin-next → fast-glob → micromatch → braces`). Die Registry liefert derzeit `3.0.3` als neueste Version. Diese Werkzeuge verarbeiten hier vertrauenswürdige Projektdateien, keine Kontaktimporte. Keine Produktionsabhängigkeit ist laut aktuellem Audit betroffen. Ein Patch ist vor späteren Releases erneut zu prüfen; kein erzwungenes Downgrade auf eine inkompatible Next-Version vorgenommen.
- Google-Sheets-Adapter vorbereitet, aber ohne echte Service-Account-Zugangsdaten nicht live getestet. V1 importiert neue Kontakte und überspringt bestehende Identitäten; keine bidirektionale Synchronisation.
- KI-Interface und Fakten-/Sprachregeln implementiert. Der Standardgenerator ist eine ausdrücklich gekennzeichnete lokale Vorlage; noch kein externer KI-Provider angebunden.
- SMTP-Port, TLS und Authentifizierung sind unbestätigt. Kein externer Transport implementiert, keine Test-Mailbox-Weiterleitung. IMAP ist als Header-Zuordnung vorbereitet, nicht verbunden.
- Browserprüfung erfolgte mit Chromium in simulierten Viewports, nicht auf physischem iPad/Safari. Automatisierte axe-Prüfungen ersetzen keine vollständige manuelle WCAG-Abnahme.
- Benutzerverwaltung und Passwort-Reset erfolgen administrativ per CLI/Datenbank. Kein E-Mail-Reset und keine Selbstregistrierung. Lokale Demo-Konten sind ausschliesslich für Entwicklung.
- Die Oberfläche lädt bis zu 1000 Kontakte/Entwürfe, 500 Protokolle und 100 Audit-Ereignisse. Für grössere Bestände sind serverseitige Pagination und Suche vor Ausbau vorzusehen; die Datenbank bewahrt sämtliche Einträge.
- Keine Produktionsabnahme, kein Live-Deployment, keine Domain-/DNS-Änderung. Backup-/Restore-Plan für spätere Repository-Auslagerung ist dokumentiert, noch kein produktiver Umzug durchgeführt.

## Reproduktion und Artefakte

Befehle in README.md. Lokale Browserbilder: `.local/dashboard-1440.png`, `.local/dashboard-1024.png`, `.local/dashboard-768.png`, `.local/dashboard-390.png`. Diese enthalten nur synthetische Kontakte und liegen wie Zugangsdaten und Datenbankdateien ausserhalb der Versionsverwaltung.
