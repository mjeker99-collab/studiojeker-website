# V1 vereinfachen nach V2 – Prüfstand vom 26. November 2026

## Ziel und Stand

Die freigegebene V2-Vorschau dient als Bedienvorlage für die bestehende V1.
Dieser Änderungsstand überarbeitet die gemeinsame Navigation und Startübersicht
auf der echten V1-Codebasis. Er ist keine vollständige Neuimplementierung der
internen Newsletter-, Social-, Website- oder Akquise-Editoren.

Basis: `d3b1a6c53c55347295555a2a22d2f4b987ae02aa` auf
`feat/akquise-production-readiness`.
Render-Zuordnung am 26.11.2026 gelesen: `studiojeker-akquise`,
`apps/akquise`, Auto-Deploy nach erfolgreichen Checks auf diesem Branch.
Daher ausschliesslich Änderungsbranch und Entwurfs-PR; kein Merge/Deploy.

## Umgesetzt

- Sechs Hauptbereiche: Übersicht, Akquise, Inhalte, Projekte, Bibliothek, Kalender.
- Einstellungen separat beim Konto, weiterhin erreichbar.
- Inhalte bündelt Bilder/Videos/Texte, Newsletter, Social Media und Website.
- Projekte bündelt Kampagnen, Konzepte und Kunden.
- Letzter Unterbereich wird beim Wechsel zwischen Hauptbereichen in derselben
  Sitzung wieder geöffnet. Dies ist keine Zusage, dass jeder Editor seinen
  gesamten ungespeicherten Zustand nach einem Neuladen wiederherstellt.
- Kontaktselektion und Listenfilter werden beim Navigieren nicht mehr pauschal
  geleert. Bestehende bereichsspezifische Änderungen bleiben wirksam.
- Startübersicht: zuletzt bearbeitetes/erstelltes Projekt weiterbearbeiten,
  eine neue Aufgabe beginnen, weitere Projekte bei Bedarf aufklappen.
- Eine hervorgehobene Hauptaktion auf der Übersicht; verständliche Aufgaben
  ersetzen doppelte Funktionskacheln und pauschale Statistik-Karten.
- Offene Mail-Entwürfe/Freigaben nur anzeigen, wenn tatsächlich vorhanden.
- Doppelte Bereichseinführung entfernt; bestehende Arbeitsbereiche eingebunden.
- „Neue Kunden gewinnen“ führt jetzt zur Akquise, statt fälschlich zu Kampagnen.
- Originales Logo und vorhandene Arial/Helvetica-Typografie beibehalten;
  normale Laufweite auf der Übersicht, bedienbare Touch-Ziele.

## Unverändert

Backend, Berechtigungen, Datenmodell, Versand, Freigabeprüfungen, Integrationen,
Produktionsumgebung, Studiojeker-Website und eigenständiger V2-Prototyp.
Keine Migration, kein Zugriff auf produktive Kundendaten für Tests, kein Versand.

## Prüfung

- `npm test`: erfolgreich, inklusive neuer Routing-/Navigationsprüfungen.
- `npm run typecheck`: erfolgreich.
- `npm run lint`: keine Fehler, drei bestehende Warnungen in unveränderten Dateien.
- `npm run build`: erfolgreich; Next.js meldet eine bestehende Sicherheitswarnung.
  Abhängigkeiten wurden in diesem UX-Auftrag nicht geändert. Vor Produktion
  ist diese Meldung zu klären.
- Gezielte Browserprüfung: 5 Tests erfolgreich (Aufgabenübergabe und vier
  Ansichten: 1440, 1024, 768, 390 Pixel). API-Antworten vollständig synthetisch;
  alle API-Aufrufe abgefangen, keine schreibenden Aufrufe in diesen Abläufen.
- Übersicht ohne horizontalen Überlauf; axe-Prüfung der Übersicht ohne Verstösse.
- Chromium-Prüfung in iPad-Abmessungen, kein Test auf einem echten Safari/iPad.

Vorschaubilder liegen unter `screenshots/v1-simple-*.png`.
Die Bilder zeigen die echte React-Oberfläche mit synthetischen API-Antworten.

## Noch erforderlich vor einer vollständigen V1-Abnahme

1. Einzelne Arbeitsabläufe vollständig vereinfachen: Auswahl → Erstellen →
   Prüfen/Bearbeiten → Freigeben bzw. Planen; dabei vorhandene Versions- und
   Versandkontrollen erhalten. Dieser PR verändert diese Fachlogik nicht.
2. Wiederaufnahme innerhalb jedes Editors separat prüfen, einschliesslich
   Newsletter-Auswahl, Bildwechsel/Abbrechen und ungespeicherter Eingaben.
3. Ältere Browser-Szenarien an die neue gruppierte Navigation anpassen;
   diese vollständige integrationsabhängige Suite wurde nicht ausgeführt.
4. Test mit unerfahrener Person und auf echtem iPad/Safari; der Zwei-Minuten-Test
   ist durch automatisierte Klicktests nicht bewiesen.
5. Erst nach visueller/fachlicher Abnahme über einen Produktionsmerge entscheiden.
