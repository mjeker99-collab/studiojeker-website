# StudioONE V2 – Arbeitsauftrag und Prüfplan
Stand: 12. November 2026. Auftraggeber: Martin. Status: vorbereitet, Cursor-Lauf noch nicht gestartet.

## Verbindliches Ziel
Eine unerfahrene Person kann eine konkrete Marketingaufgabe ohne Einführung beginnen, vorbereiten, prüfen und später fortsetzen. V2 muss den gesamten Weg zum Ergebnis vereinfachen. Weniger Menüpunkte allein gelten nicht als Mehrwert.

V1 bleibt unverändert. Kein Merge, kein Deployment, kein Ready-Markieren und kein Auto-Merge vor Martins visueller und fachlicher Freigabe. Die älteren PNG-Entwürfe sind wegen der beanstandeten Typografie keine freigegebene Designreferenz.

## Verifizierter Ausgangspunkt
- Repository: mjeker99-collab/studiojeker-website.
- Render-Service studiojeker-akquise, srv-db9lr561egvs73fopbcg: Branch feat/akquise-production-readiness, Root apps/akquise, Auto-Deploy nach erfolgreichen Checks. In diesem Arbeitsschritt lesend geprüft.
- V2-Branch: feat/studioone-v2-review-20261112.
- PR #377 ist offen, Draft, nicht gemergt. Ausgangs-HEAD ab495fd3809cb91b3c1c7c0848dd6776c1e340e2.
- Bestehende V2: Offline-Bedienprototyp unter apps/studioone-v2-prototype. Beispieldaten und localStorage, keine produktiven Funktionen.
- Früherer Zustands-Test ist keine Browser-Abnahme. Kein vollständiger End-to-End-Audit und kein Novizentest durchgeführt.
- Cursor: Plugin-Suche liefert aktuell keinen direkten Zugang. Dieses Dokument ist ein bereitgestellter Auftrag, keine bestätigte Übergabe oder laufende Ausführung.

## Prüfstatus und vollständige Bereichsabdeckung
Quellcode-Lektüre beschreibt sichtbare Implementierung; sie beweist weder die aktuell laufende Revision noch die Funktionsfähigkeit von Verbindungen. Alle Laufzeittests unten sind offen.

| Bereich V1 / Referenz unter apps/akquise/app | Befund aus bisheriger Code-Lektüre | V2-Ziel | Noch nachzuweisen |
| --- | --- | --- | --- |
| Übersicht / Dashboard.tsx | Aufgabenfeld, Aufgabenalternativen, Schnellzugriff und letzte Projekte bieten mehrere Einstiege | Ein Aufgabenstart und ein klarer Weg zum Fortsetzen | Start ohne Erklärung in <= 2 Minuten; tatsächliche Weiterleitung |
| Navigation / page.tsx | Zwölf Hauptbereiche; Akquise-Unterbereiche; Navigation setzt Auswahl/Filter zurück | Höchstens sechs Hauptbereiche, Arbeitskontext beim Wechsel erhalten | Zurück, Neuladen, direkte Links und Rechte |
| Akquise / MailStudio.tsx, MailAssistant.tsx | Kontaktwahl, Vorbereitung, Entwürfe, Prüfung und Versand sind verteilt; MailAssistant-Detailprüfung offen | Empfänger wählen → Nachricht vorbereiten → Vorschau prüfen → ausdrücklich bestätigen | 25/50/97/100 Kontakte; Recherchequalität; persönliche Texte; Teilfehler |
| Kontakte und Kunden / page.tsx, customers/Customers.tsx | Umfangreiche Kontaktdaten und separate Kundenprofile | Person und Unternehmen einmal erfassen; Details bei Bedarf | Dubletten, Import, fehlerhafte Daten, Profilzuordnung |
| Strategie / concepts/Concepts.tsx | Konzeptarbeit mit Dokument, Versionen und Kampagnenübergabe | Ziel beschreiben, Konzept bearbeiten, daraus Inhalte starten | Übergabe ohne erneute Eingabe; Wiederaufnahme |
| Kampagnen / hub/Hub.tsx | Eigener Bereich neben Konzepten und Inhalten | Gemeinsame Projektübersicht mit Ziel, Material, Aufgaben und Ergebnis | IDs und Beziehungen bleiben erhalten |
| Content-Studio / studio/ContentStudio.tsx | Viele Optionen für Briefing, Quellen, Formate, Marke und Generierung | Aufgabe und Vorschau zuerst; zusätzliche Optionen bei Bedarf | Texte, Bild, Grafik, Video jeweils bis zum brauchbaren Ergebnis; Kosten-/Rechteprüfung |
| Social Media / hub/Hub.tsx, hub/SocialConnections.tsx | Kontoverbindung, Unternehmensseite, abgelaufene Rechte und technische Einrichtung separat | Kanal im Inhalt wählen; fehlende Verbindung mit konkretem nächsten Schritt erklären | Testkonto, Medienanforderungen, abgelaufene Freigabe, Resultatnachweis |
| Newsletter / newsletter/NewsletterWorkspace.tsx, hub/Hub.tsx | Vorlagen-/Versionswege und GPT-Dialog; Bildänderungen verlangen teils öffentliche Bildadressen | Vorhandene Vorlage öffnen, Text/Bild/Link direkt bearbeiten, Vorschau bleibt synchron | NewsletterEditor, Preflight, LinkTester vertieft prüfen; tatsächlicher Export/Anbieter-Test |
| Website / cms/ExistingWebsite.tsx, cms/WebsiteBuilder.tsx | Separate Bestandsseite/neue Website; manuelles Speichern, technische Felder und Versionswahl | Seite wählen → Änderung beschreiben/bearbeiten → Vorschau; Technik unter Erweitert | Ungespeicherte Änderungen, Sprachwechsel, Medien, Freigabe des tatsächlich sichtbaren Stands |
| Bibliothek / library/Library.tsx | Ordner, Suche, Filter und umfangreiche Metadaten | Gemeinsame Bild-/Dateiauswahl direkt im Arbeitsablauf | Uploadfehler, Formate, Rechte, Wiederverwendung ohne Kopien |
| Kalender / hub/Hub.tsx | Kalender als eigener Bereich | Tatsächliche geplante Aktionen mit Status und direktem Rückweg zum Inhalt | Zeitzone, Verschieben, fehlgeschlagene Aktion, erneute Freigabe |
| Einstellungen / hub/Hub.tsx, hub/SocialConnections.tsx | Verbindungen und technische Angaben vorhanden | Alltagsnutzer sieht nur relevante Einrichtungshilfe; Administration getrennt | Rollen, fehlende Verbindung, ungültige Konfiguration |
| Versand / MailSchedule.tsx | Versionsbindung, Warteschlange, Teilresultate, unklare Zustellung und Wiederholschutz bereits vorhanden | Schutzlogik erhalten; klare Zusammenfassung und Fehlerkorrektur | Wiederholung ohne Doppelversand; veraltete Freigabe; Ausfall; Versand ≠ Zustellnachweis |

Die Tabelle ist ein Prüfregister, keine Behauptung eines abgeschlossenen Gesamtaudits. Vor Ausbau der jeweiligen Funktion sind Komponenten, API, Datenmodell und Fehlerpfade gemeinsam zu prüfen.

## Vorgeschlagene Zuordnung
Noch visuell zu beurteilen; keine produktive Navigationsänderung.

| V2-Einstieg | Enthält / erschliesst |
| --- | --- |
| Übersicht | Neue Aufgabe, zuletzt bearbeitete Arbeit, konkrete offene Schritte |
| Akquise | Recherche, Kontakte, Nachrichten, Prüfung, Versandstatus |
| Inhalte | Social Media, Newsletter, Website, Text, Bild, Grafik und Video |
| Projekte | Konzepte, Kampagnen und zugehöriger Kundenkontext |
| Bibliothek | Wiederverwendbare Medien und Vorlagen |
| Kalender | Geplante Aktionen und deren tatsächlicher Status |

Kundenprofile bleiben direkt aus Suche, Projekt und Akquise erreichbar. Einstellungen sind separat zugänglich. Die Oberflächen-Zusammenfassung ist keine Datenmigration; IDs, Historie und professionelle Funktionen bleiben erhalten.

## Durchgängiger Ablauf
1. Wunsch in Alltagssprache angeben oder bestehende Arbeit fortsetzen.
2. Nur fehlende Angaben erfragen; vorhandenen Kunden-, Marken- und Projektkontext nutzen.
3. Entwurf vorbereiten. Fortschritt, Kostenhinweis falls relevant und Fehler verständlich anzeigen.
4. Ergebnis direkt bearbeiten und prüfen. Änderungen automatisch sichern; Speicherfehler sichtbar machen.
5. Extern wirksame Aktion mit konkretem Inhalt, Ziel, Empfängern und Zeitpunkt bestätigen.
6. Tatsächliches Ergebnis zeigen und bei Teilfehlern nur betroffene Elemente weiterbearbeiten.

Pro Arbeitszustand genau eine klar hervorgehobene Hauptaktion. Keine vorgetäuschte Funktionsfähigkeit: Demo, nicht verbunden, noch nicht implementiert und echte Verarbeitung eindeutig unterscheiden.

## Cursor-Auftrag V2-01: belastbare Bediengrundlage
Arbeite auf dem genannten V2-Branch; vor Beginn aktuellen HEAD und Änderungen anderer prüfen. Lies AGENTS.md, docs/STUDIOONE_OPERATING_AGREEMENT.md und docs/STUDIOONE_UX_GUIDELINES.md.

### Erster begrenzter Bauabschnitt
1. Bestehenden Prototyp prüfen; nur Dateien unter apps/studioone-v2-prototype ändern oder ergänzen. Keine V1-Dateien, Root-Abhängigkeiten, Workflows, Render-Konfiguration oder Produktionsdaten verändern.
2. Aufgabenstart und Wiederaufnahme konkret machen. Ein Aufgabeneinstieg darf nicht lediglich auf eine generische Bereichsseite führen.
3. Akquise-Ablauf mit synthetischen Kontaktgruppen vervollständigen: Auswahl, individuelles Nachrichten-Preview pro Empfänger, fehlende Angaben korrigieren/zurückstellen, Zusammenfassung, Bestätigung. Simulation deutlich kennzeichnen.
4. Auswahl, Entwurf und Schritt beim Wechsel und Neuladen erhalten. Fehlende/defekte lokale Speicherung verständlich behandeln. Browserlokalspeicherung nicht als serverseitige Sicherung ausgeben.
5. Gemeinsame Statusdarstellung implementieren: vorbereitet, Eingabe fehlt, wird verarbeitet, gespeichert, Fehler. Kein «bereit», solange erforderliche Prüfungen fehlen.
6. Typografie anhand der tatsächlichen StudioONE-CSS-Regeln abgleichen. Ausgangsreferenz: app/studioone-design-system.css mit Arial, Helvetica, sans-serif; zusätzlich area-intro und dashboard Overrides lesen. Das ist die technische V1-Referenz, noch keine Freigabe von Martins gewünschtem V2-Schriftbild. Keine neue Ersatzschrift wie in den früher gezeichneten PNGs verwenden. Newsletter-/Werbemittel-Typografie getrennt vom UI prüfen. Font-Familie, real gerenderter Font, Gewicht, Grösse, Zeilenhöhe und Laufweite für Text, Heading, Navigation und Button dokumentieren.
7. Echte Screenshots des implementierten Prototyps liefern: Übersicht, Empfängerwahl, individuelle Nachricht, Prüfung, Wiederaufnahme/Fehler; Desktop und iPad Hoch-/Querformat. Wenn Browserzugang fehlt, keine gezeichneten Bilder als Screenshots ausgeben.
8. Vorschauzugang vorbereiten, aber vor Martins Freigabe nichts deployen. Keine lokalen HTML-Dateilinks als auf dem iPad funktionierende Vorschau ausgeben. Die nach Freigabe eingerichtete HTTPS-Vorschau muss isoliert sein und darf keine produktiven Schlüssel besitzen.

### Erforderliche Prüfung und Ergebnis
- Relevante bestehende Zustandsprüfungen ausführen; nur notwendige neue Verhaltenstests ergänzen.
- Auswahlgruppen 25, 50, 97 und 100; mindestens ein unvollständiger Kontakt; Teilfehler; Zurück; Neuladen; Doppelklick.
- Änderung an Text oder Empfängern entwertet eine frühere Bestätigung.
- Tastaturführung, Fokus, beschriftete Felder, verständliche Fehler; kein horizontaler Overflow bei 390/768/1024/1440 Pixeln. Touch-Ziele und 200-%-Zoom prüfen.
- Jede sichtbare Hauptaktion führt zum versprochenen Ergebnis oder erklärt eine echte Voraussetzung.
- Neue Screenshots mit Commit-ID, Viewport und verwendeter Schrift dokumentieren.
- Draft-PR #377 aktualisieren, Änderungen und offene Grenzen berichten. Nicht als ready markieren, nicht mergen, nicht deployen.
- Abschluss mit: implementiert, tatsächlich ausgeführte Tests, visuell geprüft, offen. Kein Erfolgsstatus allein aus einem vorhandenen Testskript.

## Anschliessender Funktionsmeilenstein V2-02
Erst nach Bewertung der Bediengrundlage: separate V2-Laufzeit und Testdatenbank planen, bestehende Kontakt-/Entwurfs-/Freigabe-/Queue-Logik wiederverwenden. Kein eigener konkurrierender Versandmechanismus. Keine Produktionsschlüssel oder produktiven Versandjobs in der V2-Vorschau. Den ersten Ablauf mit echten persistierten Testdaten vollständig prüfen, bevor weitere Module breit ausgebaut werden.

## Messbare Abnahme
Zielwerte sind Anforderungen, noch keine gemessenen Ergebnisse.
- Drei unerfahrene Testpersonen beginnen eine sinnvolle Aufgabe ohne Erklärung in höchstens zwei Minuten.
- Dieselben Aufgaben in V1 und V2 mit denselben Testdaten vergleichen: Dauer, erforderliche Entscheidungen, Fehlversuche, Hilfebedarf und Ergebnisqualität aufzeichnen.
- V2 verlangt bei den geprüften Kernaufgaben weniger Entscheidungen und keine doppelte Dateneingabe; benötigte Funktionen bleiben erreichbar.
- Unterbrechung und Wiederaufnahme verlieren keine bestätigten Eingaben; Speicherfehler und Konflikte werden sichtbar.
- Kein Versand/Posting/Publizieren ohne gültige Freigabe des konkreten Stands.
- Kein «vollständig geprüft», solange ein Bereich, Browser-/iPad-Test oder externer Testablauf offen ist.

## Nächste Prüfungen
MailAssistant, NewsletterEditor/Preflight/LinkTester und zugehörige APIs vertieft prüfen. Danach alle Bereiche mit Testdaten praktisch durchlaufen. Die Bewertung der Benutzerfreundlichkeit braucht beobachtete Bedienung zusätzlich zur Quellcodeanalyse.
