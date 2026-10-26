# StudioONE – verbindliche UX-Guideline
**Beschlossen: 26. Oktober 2026** · **Gilt für:** sämtliche Arbeitsbereiche von StudioONE (KMU-Basis und Studiojeker Pro).

## Leitbild
StudioONE ist eine KI-gestützte Marketingassistentin, keine Sammlung erklärungsbedürftiger Werkzeuge. Primäre Testperson: kaufmännische Mitarbeiterin eines KMU mit 10–30 Angestellten, die neben Administration und Kundenkontakt das Marketing betreut, ohne Marketing-, Grafik- oder IT-Fachausbildung.

**Leitfrage:** Kann diese Person ohne Einführung in maximal zwei Minuten ihre erste sinnvolle Marketingaufgabe starten? Falls nein, ist die Oberfläche zu verbessern.

## Die fünf Grundregeln (verbindlich)
1. **Aufgabe statt Fachbegriff:** „Ich möchte neue Kunden gewinnen“ statt „Kampagne konfigurieren“. Nutzerabsicht erkennen und intern dem passenden Arbeitsbereich zuordnen.
2. **Ein nächster Schritt:** Zu jedem Zeitpunkt genau eine hervorgehobene blaue Primäraktion, mit verständlicher Beschriftung. Sekundäre Optionen klar untergeordnet.
3. **GPT übernimmt die Vorarbeit:** Recherche, Konzept, Textentwürfe, Medienvorschläge und sinnvolle Folgeaufgaben automatisiert vorbereiten. Bei Unsicherheit gezielt und in Alltagssprache nachfragen.
4. **Automatisch speichern:** Laufende Arbeit ohne manuelle Versionsverwaltung sichern und nach Unterbrechungen wiederaufnehmen. Projektdateien, Versionen und technische Einstellungen im Basis-Modus nicht verlangen.
5. **Kontrolle vor Veröffentlichung:** Vorschau und explizite Genehmigung vor E-Mail-Versand, Social-Posting, Website-Publikation, Löschungen und anderen extern wirksamen Aktionen. Nach Freigabe übernimmt StudioONE die Ausführung und zeigt das Resultat.

## Einstieg
Startseite mit „Was möchtest du heute erledigen?“, frei formulierbarem Aufgabenfeld und gut verständlichen Aufgabenalternativen:
- Neue Kunden gewinnen
- Ein Angebot bekannt machen
- Social-Media-Beiträge erstellen
- Newsletter erstellen und versenden
- Website aktualisieren
- Bilder oder Videos erstellen

## Einheitlicher Ablauf
**Wunsch → KI-Vorarbeit → Vorschau → Freigabe → Ausführung und Status.**
Jeder Schritt erklärt in einfacher Sprache, was bereits erledigt wurde und was als Nächstes geschieht. Kein toter Button, keine Sackgasse, keine unbeabsichtigten Mehrfachaktionen. Relevante Fehler mit konkreter Lösung und ohne technische Fachsprache darstellen.

## Geltungsbereich und Prioritäten
- **P1:** Startseite/Navigation, Strategie/Konzepte, Kampagnen/Projekte, Kontakte/Akquise, Content-Studio und GPT-Funktion.
- **P2:** Social Media, Newsletter, Website/Sanity, Foto-, Grafik- und Videostudio.
- **P3:** Administration, Integrationen, technische Einstellungen, Zugänglichkeit und UX-Regressionstests.
Jeder vorhandene und neue Arbeitsbereich ist anhand der fünf Grundregeln zu prüfen.

## Basis und Pro
Die **KMU-Basisversion** ist radikal einfach und auf Aufgaben ausgerichtet. **Studiojeker Pro** bewahrt professionelle Funktionen, individuelle Konfiguration und komplexe Workflows. Gemeinsame technische Grundlage; zusätzliche Komplexität der Pro-Version nicht in der Basis anzeigen. Es darf weder durch Vereinfachung eine erforderliche Pro-Funktion verloren gehen noch die Basis mit Pro-Fachbegriffen überfrachtet werden.

## Abnahme jeder Änderung
1. **2-Minuten-Test:** Neue Nutzerin startet eine sinnvolle Aufgabe ohne Einführung.
2. **Ein-Button-Test:** Eindeutige, funktionierende Primäraktion.
3. **Null-Fachwissen-Test:** Keine Spezialkenntnisse nötig.
4. **Wiederaufnahme-Test:** Bearbeitung bleibt erhalten und ist wiederauffindbar.
5. **Freigabe-Test:** Keine ungewollte Veröffentlichung, Versendung oder Löschung.
Zusätzlich prüfen: mobile Ansicht, Barrierefreiheit, Lade-/Fehlerzustände und die korrekte Nutzerabsicht. Bestehende Tests nicht als durchgeführt ausgeben, wenn sie nicht wirklich ausgeführt wurden.

## Technische Umsetzung
Diese Richtlinie ist produktübergreifend verbindlich und ergänzt die Entwicklungsvereinbarung `docs/STUDIOONE_OPERATING_AGREEMENT.md`. Änderungen erfolgen gemäss deren PR-, Test-, Freigabe- und Deploymentregeln. Die StudioONE-Codebasis muss diese Richtlinie ebenfalls referenzieren, sobald das zuständige Repository verfügbar ist. Keine produktiven Veröffentlichungen allein durch diese Dokumentation.
