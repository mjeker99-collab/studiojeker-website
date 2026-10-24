# Projekt sichern

Die gemeinsame Sicherungsleiste steht im Website-Studio, in Konzepten, in den GPT-Einstiegen von Kampagnen, Social Media und Website sowie im Content-Studio (GPT und Beitragseditor).

- «Projekt sichern» speichert einen benannten, persönlichen Arbeitsstand in PostgreSQL. Dazu gehören offene Eingaben, Referenz-Auswahl und die Zuordnung zum bestehenden Projekt. GPT-Ergebnisse bleiben in ihren bestehenden Projekt-/Auftragsdatensätzen.
- «Projekt öffnen» stellt diesen Arbeitsstand wieder her. Rechte-, Kosten- und Freigabe-Checkboxen werden nicht wiederhergestellt.
- «Als Kopie sichern» erstellt einen unabhängigen Arbeitsstand. Gleichzeitige Änderungen in zwei Tabs führen zu einem sichtbaren Versionskonflikt statt zum Überschreiben.
- Bestehende Funktionen zur Konzept-/Website-/Beitragsversionierung, Freigabe und Veröffentlichung bleiben separat. Ein gesicherter Arbeitsstand wird nicht automatisch freigegeben, an GPT gesendet oder veröffentlicht.
- Die Sicherungen sind dem angemeldeten Benutzer zugeordnet und funktionieren über Geräte hinweg. Es gibt keine automatische Hintergrundsicherung; Änderungen nach dem letzten Klick müssen erneut gesichert werden.
- Die neue additive Migration `20261024190000_project_drafts` muss beim Deployment angewendet werden.

Zusätzlich lädt der GPT-Dialog das ausgewählte Gespräch unabhängig vom globalen 100-Aufträge-Fenster nach. Die bestehende allgemeine Serienauswahl bleibt auf 100 Projekte begrenzt; benannte GPT-Sicherungen können ältere Serien über ihre ID wieder öffnen.

Prüfungen: Integrationstest für Datenbank-Roundtrip, Benutzertrennung, Versionskonflikte und Eingabegrenzen; Browsertest für Sichern, Neuladen, Wiederöffnen, Konflikt/Kopie und responsive/zugängliche Bedienung. Keine echten GPT-Anfragen oder Veröffentlichungen im Test.
