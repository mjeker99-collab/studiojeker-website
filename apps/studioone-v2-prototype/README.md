# StudioONE V2 – Review-Meilenstein 1

Stand: 12. November 2026. Auftrag Martin: V2 beginnen, Visualisierungen vor Merge/Deploy, V1 unangetastet.

## Geliefert
- Eigenständiger, ohne Build offline öffnbarer HTML-Prototyp, ohne Fremdskripte oder API-Aufrufe.
- Sechs Hauptbereiche, Einstellungen separat. Original-Logo und bestehende Cyan-/Schwarz-Farbwelt.
- Akquise mit drei Ansichten und durchgehendem Vier-Schritt-Ablauf. Auswahl bleibt erhalten, unvollständiger Beispielkontakt lässt sich zurückstellen, Bestätigung vor lokaler Planung.
- Lokales Speichern und Wiederaufnahme von Text, Auswahl, Ansicht und Schritt.
- Gemeinsamer Inhaltseditor mit unmittelbarer Textvorschau und Rückgängig.
- Navigation und Beispielzusammenhänge für Projekte, Bibliothek und Kalender.

## Klare Grenzen
Dies ist ein funktionaler UI-Prototyp, keine fertige V2. Recherche, KI-Generierung, persönliche Textgenerierung je Empfänger, Uploads, Vorlagen, Provider-Anbindungen, Export und Versand sind nicht implementiert. Beispielmedien sind ausdrücklich Platzhalter. Die Browserlokalspeicherung ist keine produktive Datensicherung. Keine echten Daten eingeben.

## Prüfung
`node check-state.cjs`: Syntax und Ablaufzustände mit minimalem DOM-Testdouble, keine Browser- oder Accessibility-Abnahme.
`python3 check.py`: vorbereiteter Chromium-Klicktest inkl. 1440/1024/768/390 px. Hier blockiert der Sandbox-Start von Chromium (socket Operation not permitted); erweiterte Ausführung nicht zugelassen. Cloud-Browser blockiert file-URLs. Kein Browser-Test als bestanden behaupten.
Die ausgelieferten PNGs sind separat gezeichnete Designvisualisierungen desselben Layoutkonzepts, keine Screenshots des HTML.

## Produkt-Meilensteine und Abnahme
1. **Navigation und Abläufe freigeben**: Nutzer startet ohne Erklärung in <= 2 Minuten eine sinnvolle Aufgabe; klare Primäraktion; Desktop/iPad prüfen. Dieser PR ist die Review-Basis.
2. **Akquise produktionsfähig anbinden**: bestehende Kontakt-/Draft-/Freigabe-/Queue-Services wiederverwenden, serverseitige Versionsbindung, Sperren und Dublettenschutz unverändert. Beispieladapter durch autorisierten Serviceadapter ersetzen. Alle Empfängertexte einzeln prüfbar. Gegen synthetische 25/50/97/100-Gruppen und Teilfehler testen. V1 bleibt parallel.
3. **Einheitlicher Inhaltseditor**: echte V4-Vorlage statt Beispielgrafik, Bibliotheksauswahl mit Vorschau, versioniertes Autosave, Undo, Linkprüfung, nur ein gültiger Vorschaustand. Social-/Newsletter-Exports und Publikation gesondert bestätigen.
4. **Projektkontext verbinden**: Konzepte/Kampagnen gemeinsam erschliessen, vorhandene IDs und Beziehungen bewahren; keine automatische Datenzusammenlegung. Kunden-/Markenprofile einmalig nutzen. Kalenderstatus aus tatsächlicher Queue/Publikation.
5. **Abnahme vor Einführung**: echte iPad-Touch-Prüfung, Tastatur/Screenreader, Autosave-Konflikte und Fehlerbehandlung, messbarer Vergleich der V1/V2-Aufgaben, Sicherungs-/Rückkehrplan. Erst Martins ausdrückliche Merge-/Deploy-Freigabe ermöglicht Veröffentlichung.

## Isolierung
Nur neue Dateien unter `apps/studioone-v2-prototype`. Keine Änderung an `apps/akquise`, Website, Workflows, Datenbank oder Render. Draft-PR: nicht als ready markieren, nicht mergen, kein Auto-Merge aktivieren. Der bekannte Express-Automerge-Workflow überspringt Drafts.
