# StudioONE: Logik und Bedienbarkeit

Stand: 26. Oktober 2026. Prüfung der vorhandenen Komponenten und automatisierten Browserabläufe. Keine Behauptung einer angemeldeten manuellen Live-Prüfung aller Bereiche. Externe Publikation, SMTP, OAuth und Zahlungs-/Provideraktionen wurden bei dieser Prüfung nicht ausgelöst.

## Verbindliches Ziel für alle Abläufe

1. Eine erkennbare Hauptaktion pro Schritt, beschriftet mit Ergebnis und gegebenenfalls Anzahl.
2. Auswahl, Projekt, aktuelle Version und Eingaben beim Übergang erhalten; Zurück führt zur bisherigen Auswahl.
3. Vorhandene Daten zuerst auswerten. Eingaben erst bei tatsächlichen Lücken verlangen. Keine erfundenen Prüfungen oder Freigaben.
4. Deaktivierte Aktionen mit konkreter fehlender Voraussetzung erklären.
5. Speichern, Freigeben, Einplanen und extern Veröffentlichen eindeutig unterscheiden. Versandbestätigungen beziehen sich auf konkrete Empfänger und Versionen.
6. Nach jeder Aktion Ergebnis, Teilfehler und nächste Aktion nennen. Erfolgreiche Teilmengen nicht erneut auswählen lassen.
7. Zusatzfunktionen einklappen, Fehlermeldungen am betroffenen Schritt anzeigen. Mobile Hauptaktionen müssen erreichbar bleiben.
8. Speichervorgänge gegen Doppelklick und das Wiederöffnen veralteter Daten schützen.

## Befunde und Prioritäten

| Bereich | Beobachteter Ablauf / Beleg | Bewertung und nächste Verbesserung |
| --- | --- | --- |
| Übersicht | `app/Dashboard.tsx`: Bereichskarten und direkte Einstiege | Orientierung vorhanden. Künftig konkrete nächste Aufgaben und offene Mengen vor Funktionskatalog zeigen. |
| Kontakte → Mail-Studio | `app/page.tsx`: vorher nur `setTab("Mail-Studio")`, Auswahl blieb ungenutzt; Formular erschien vor Auswertung | P0 in diesem Auftrag umgesetzt: feste Auswahlaktion, automatische Vorschau, Auswahlübergabe, Lücken getrennt, direkte Mailprüfung. |
| Mailprüfung → Versand | `app/MailStudio.tsx`, `app/MailSchedule.tsx`: gemeinsame Freigabe/Einplanung, Versionskontrolle, Ergebnisliste, Zeitplan | PR229 vorhanden. Neuer Kontakteinstieg nutzt denselben Prüfablauf. Gespeicherter Zeitplan und aktive Produktionsfreigabe bleiben explizit. |
| Kunden | `app/customers/CustomerAssistant.tsx`: Recherche verlangt Name und Website; fehlende Website wird erklärt | P2: auch fehlenden Namen bzw. fehlendes Ausgangsmaterial direkt erklären; Vorschlag → Übernehmen → Speichern als feste Folge. |
| Strategie & Konzepte | `app/concepts/Concepts.tsx`: GPT-Aktion hängt von Eingabe, Zustimmung, Verbindung und laufendem Auftrag ab; getrennte Projekt-/Versionsspeicherung | P1: eine Startfrage, Voraussetzung direkt am Startknopf, nach GPT-Ergebnis eine klare Übernahmeaktion; Projekt sichern und Version speichern begrifflich zusammenführen. |
| Kampagnen | `app/hub/Hub.tsx`: Kampagnenformular, Datumsbedingungen, Assistentenübergabe und verknüpfte Inhalte | P1: Ziel → Zeitraum → Inhalte; Projekt-/Kampagnenkontext bei jedem Übergang sichtbar halten. Fehlende Datumsangaben statt nur deaktiviertem Button anzeigen. |
| Social Media | `app/hub/Hub.tsx`, `app/hub/SocialConnections.tsx`: Kontoverbindung, gespeicherter Inhalt, Freigabe und Publikation getrennt; Kontoablauf sichtbar | P1: Kanal → Inhalt → Vorschau → Termin/Publikation als geführter Ablauf. Technische Render-Konfigurationshinweise in Administrationsdetails verschieben. OAuth-Verbindung ist keine Publikation. |
| Content-Studio inkl. Grafik/Foto/Film | `app/studio/ContentStudio.tsx`: Erstellung/Bearbeitung, Version speichern, Prüfung, Freigabe, Export; mehrere parallele Aktionen | P1: pro Zustand eine Hauptaktion. Nach Speicherung unmittelbar Prüfung anbieten; Format-/Exportvarianten unter Zusatzoptionen. Bestehende Kanal- und Projektzuordnung erhalten. |
| Bibliothek | `app/library/Library.tsx`: Auswahl liefert Asset an Aufrufer; Upload meldet je Datei Ergebnis; Initialfehler ersetzt Ladeanzeige | P2: Initialfehler mit Wiederholen-Aktion; Upload → Auswählen/Verwenden unmittelbar anbieten. Fehlgeschlagene Dateien separat erneut laden. |
| Newsletter | `app/hub/Hub.tsx`, Newsletter-Komponenten: Vorlagen, Bearbeitung, Vorschau, Mailchimp-Test/Übertragung; native confirm/alert beim Test | P1: Vorlage → Bearbeiten → Test → Mailchimp-Entwurf. Ein einheitlicher Ergebnisdialog statt Browser-Alert; Empfänger und Wirkung des Tests weiter klar benennen. Export ist kein Versand. |
| Website / Sanity | `app/cms/ExistingWebsite.tsx`, `WebsitePublication.tsx`: bestehende Website bzw. Builder, Entwurf und explizite Veröffentlichung | P1: bestehende Website bearbeiten als primärer Einstieg; aktueller Entwurf und Live-Version nebeneinander, danach eine passende Hauptaktion. Veröffentlichung separat bestätigen. |
| Kalender | `app/hub/Hub.tsx`: Monats-/Listenansicht, ungeplante Inhalte, expliziter Hinweis „Termin ist keine Veröffentlichung“ | P2: Kalendertermin mit dem tatsächlichen Veröffentlichungsstatus verbinden; geplante, freigegebene und publizierte Inhalte sichtbar unterscheiden. |
| Einstellungen / Integrationen | `app/hub/Hub.tsx`, Verbindungs-Komponenten: technische Zustände und Anbieter-Konfiguration | P2: „Verbunden / Aktion nötig“ zuerst, technische Variablen in Details. Verbindungsprüfung mit unmittelbar verständlichem Ergebnis. |
| Gemeinsame Projekte und Dialoge | `app/projects/ProjectSave.tsx`, `app/dialogs/DialogManager.tsx`: Projekt sichern/als Kopie sichern, öffnen, Archiv-/Auswahlaktionen | P1: Unterschied zwischen Projektstand und Inhaltsversion erklären; Rückkehr zum zuletzt bearbeiteten Inhalt erhalten. Destruktive Aktionen als sekundäre Aktionen lassen. |

## Abnahme für diesen Auftrag

- Kontakte markieren → genau diese Auswahl vorbereiten, ohne eine zweite Auswahl im Mail-Studio.
- Automatische Auswertung schreibt keine Kontaktdaten und erteilt keine Versandfreigabe.
- Vollständige bestehende Daten benötigen keine erneute Bestätigung. Vorgeschlagene Änderungen aus Notizen werden vor Übernahme angezeigt und bestätigt.
- Unvollständige Kontakte können separat ergänzt werden; vollständige Teilmenge bleibt nutzbar.
- Bestehende aktuelle Entwürfe werden wiederverwendet; keine Doppelanlage.
- Zurück erhält Kontaktmarkierungen. Teilfehler bleiben sichtbar.
- Mobile, Tablet, Desktop sowie automatisierte Barrierefreiheit und bestehende Versandprüfungen prüfen.

Die übrigen Befunde sind eine priorisierte Arbeitsliste, keine bereits umgesetzten Umbauten. Externe Kontoverbindungen und produktive Publikationsabläufe benötigen zusätzlich eine angemeldete Funktionsprüfung.
