# StudioONE: KI-gestützte Inhouse-Agentur für KMU

Produktentscheid vom 19. Oktober 2026. Claim: «Dein Marketing. Ein Ort.»

## Ziel und Arbeitsweise

Ein KMU beschreibt sein Geschäft und seinen Auftrag in Alltagssprache. StudioONE begleitet Beratung, Konzeption, Gestaltung, Produktion, Organisation, Veröffentlichung und Auswertung. Studiojeker ist der erste praktische Anwendungsfall und kann professionelle Betreuung, Qualitätsprüfung sowie Foto-/Filmproduktion ergänzen.

StudioONE hält Kundenwissen, Briefings, Aufgaben, Inhalte, Versionen, Kosten und Freigaben zusammen. Spezialisierte Grafik-, Bild- und Videowerkzeuge werden über geprüfte Schnittstellen angebunden. Kein eigener vollständiger Photoshop-, Canva- oder Premiere-Nachbau. Eine ChatGPT-Verbindung ist kein Nachweis für eine verfügbare StudioONE-Schnittstelle.

## Verbindliche Eckpunkte

1. Unternehmenswissen pro Kunde: Angebote, Zielgruppen, Positionierung, Sprache, Markenregeln, belegte Aussagen und Einschränkungen. Keine automatische Übernahme der Marke Studiojeker für andere Kunden.
2. KI-Konzeption: geführte Briefings, Kommunikations- und Marketingkonzepte, Kampagnen und Redaktionspläne. Fakten, Annahmen und offene Fragen unterscheidbar.
3. Grafische Gestaltung: KI-Unterstützung und bearbeitbare Text-, Bild- und Logoebenen. Originale Logos, Schriften und freigegebene Vorlagen erhalten.
4. Bild und Video: Generierung und Bearbeitung, Retusche, Zuschnitt, Untertitel, Schnitt und Formatvarianten. Original und Ergebnis getrennt erhalten, nachvollziehbarer Auftragsstatus und Ergebnisablage.
5. Produktion und Wiederverwendung: aus freigegebenen Konzepten passende Kanalvarianten entwickeln; Kunde, Projekt und Quellen bleiben zugeordnet.
6. Planung und Freigabe: Verantwortliche, Termine, Versionen, persönliche Freigaben. Geänderte Inhalte benötigen neue Freigabe.
7. Veröffentlichung und Erfolg: Schnittstellen für freigegebene Inhalte, überprüfbarer Veröffentlichungsstatus, Tracking und Kampagnenkennzahlen. KI schlägt Verbesserungen auf Basis tatsächlicher Daten vor.
8. Menschliche Kontrolle: bewusster Start kostenpflichtiger Aufträge, Budgets und Limits, nachvollziehbare Freigabe vor Versand/Veröffentlichung. Keine erfundenen Erfolgs-, Ausführungs- oder Integrationsbehauptungen.
9. Späterer KMU-Zugang: echte Mandantentrennung, Berechtigungen, Datenexport und Betriebskonzept vor externen Kundenkonten. Interne Kundenprofile sind noch keine Mandantenplattform.

## Umsetzungsfolge und Abnahme

| Stufe | Ergebnis | Abnahme |
| --- | --- | --- |
| 1: Unternehmenswissen und Konzeptarbeit | Kundenprofil plus geführter Konzeptdialog, bestehende Version/Freigabe/Kampagnenübergabe nutzen | Profil speichern/neuladen, richtiger Kunde im KI-Auftrag, gespeicherte Profilrevision nachträglich unverändert |
| 2: Grafikstudio | Bearbeitbare Vorlagen, Text-/Logo-/Bildebenen und Formatvarianten | Texte und Logo unabhängig ändern, Exporte und Varianten prüfen |
| 3: Bild- und Videobearbeitung | Verifizierte Anbieteranbindung mit Kosten, Status und Ergebnisablage | Echter freigegebener Auftrag, Fehler-/Abbruchfall und Ergebnisrückgabe |
| 4: Produktion und Veröffentlichung | Konzept in Produktionsaufträge überführen, Kalender und Kanalübergabe | Ein vollständiger Kampagnenablauf ohne ungewollte Veröffentlichung |
| 5: Auswertung und Optimierung | Messdaten pro Kunde/Kampagne, verständliche Empfehlungen | Datenquelle und Zeitraum sichtbar, keine erfundenen Kennzahlen |
| 6: Externe KMU-Nutzung | Getrennte Firmenzugänge und betreutes Angebot | Serverseitige Isolation, Rechte-/Export-/Backup-Abnahme |

## Erste Implementierung

Kundenprofile erhalten acht optionale Wissensfelder. Der Konzeptdialog übernimmt das gespeicherte Profil des zugeordneten aktiven Kunden samt Revision als unveränderlichen Bestandteil des jeweiligen KI-Auftrags. Drei Einstiege bereiten eine Nachricht vor; erst der Nutzer sendet sie mit bestehender Übermittlungs-/Kostenbestätigung. Alte Profile bleiben nutzbar. Ältere Clients ohne Wissensfeld überschreiben gespeichertes Wissen nicht.

Dies ergänzt die bestehende Strategie-Funktion. Es stellt noch keinen Grafikeditor, keine automatische Medienbearbeitung, keinen automatischen Redaktionskalender und keine neue Veröffentlichung bereit. Wissen wird in dieser Stufe im Konzeptdialog verwendet; die vorhandene Übergabe trägt das ausdrücklich freigegebene Konzept in Kampagnen weiter. Unternehmenswissen wird nicht ungeprüft in bestehende freigegebene Inhalte geschrieben.

## Bereitstellung

Additive Migration `20261019220000_customer_knowledge`; vorhandene Kunden erhalten ein leeres JSON-Profil. Vor Deployment Datenbankbackup und bestehende Render-Migrationsroutine. Keine neuen Pakete oder Secrets. Betriebs- und Providerkosten bleiben in den bisherigen Limits. Keine kostenpflichtige Generierung oder Veröffentlichung für Entwicklungstests.
