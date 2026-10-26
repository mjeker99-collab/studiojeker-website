# StudioONE & Studiojeker – verbindlicher KI-Entwicklungsworkflow

**Beschlossen am 25. Oktober 2026.** Gilt für StudioONE (Render) und die Studiojeker-Website (Next.js, Sanity, Metanet Staging).

## Rollen
- Auftraggeber: definiert Ziele, fachliche Anforderungen und gibt wesentliche produktive Änderungen frei.
- KI-Assistent: übernimmt nach Möglichkeit eigenständig Analyse, Codeänderung, Tests, PR, Konfliktbehebung, Merge, Staging-Deployment und technische Prüfung.
- Nur wenn ein Zugriffsrecht, eine Sicherheitsregel oder eine Entscheidung tatsächlich Eingreifen erfordert, stellt der Assistent **eine konkrete, zielgerichtete Rückfrage**. Keine routinemässigen Screenshot-, Merge- oder Deploy-Aufgaben an den Auftraggeber delegieren.

## Auftraggeber gibt Ziele vor – technische Ausführung ist delegiert
- Der Auftraggeber liefert Anforderungen und prüft bei Bedarf das fachliche Ergebnis; er ist **nicht** für PR-Freigaben, Tests, Merge-Klicks, Deployment oder routinemässige technische Kontrollen zuständig.
- Für **StudioONE-Anwendungsänderungen** besteht die ausdrückliche generelle Beauftragung, sichere, getestete Änderungen nach bestandenen Prüfungen eigenständig zu mergen, über den korrekt zugeordneten Render-Service auszurollen und die Live-Version zu kontrollieren. Dafür keine erneuten Standard-Rückfragen stellen.
- Bei fehlgeschlagenen Prüfungen Fehler selbstständig analysieren, beheben und erneut testen; die Prüfung nicht umgehen. Wenn ein tatsächlicher Zugriffs- oder Sicherheitsblocker verbleibt, diesen knapp und konkret melden.
- Abschlussberichte enthalten das Ergebnis in Alltagssprache: **umgesetzt / live verifiziert / noch blockiert**. Keine technischen To-dos an den Auftraggeber delegieren.
- Davon ausgenommen bleiben externe Marketingveröffentlichungen und Mailversand im Namen von Kunden, Datenlöschungen, Berechtigungsänderungen und wesentliche produktive Website-Änderungen: die jeweiligen Freigabegrenzen weiter beachten.

## Standardablauf pro Auftrag
1. Bestehenden Stand direkt in StudioONE, Repository, Sanity und Deploy-System prüfen; keine Annahmen als geprüft darstellen.
2. Änderung in einem passenden Branch oder via gesicherte Entwurfs-API umsetzen. Vorhandene Implementierungen erweitern statt duplizieren.
3. Tests und relevante Checks ausführen bzw. deren Status prüfen. Bei Fehlern Ursachen untersuchen und beheben.
4. PR erstellen/aktualisieren und bei technischer Freigabe selbst mergen. Branchschutz und Sicherheitskontrollen respektieren, nicht umgehen.
5. Staging-Deployment kontrollieren (GitHub Actions für Website, Render für StudioONE). Deploy nur explizit auslösen, wenn kein Auto-Deploy greift und das richtige Ziel geprüft ist.
6. Funktion, Inhalte und Layout auf Staging so weit möglich verifizieren (desktop/mobile, kritische Seiten, Sanity-Fallback/Publikation). **Merge ≠ Deploy ≠ Sichtprüfung.**
7. Kompakten Abschlussbericht liefern: umgesetzt; Tests; PR-Link; Merge-Status; Deploy-Status; Staging-Prüfung; verbleibende Blocker. Keine unbelegten Erfolgsmeldungen.

## Veröffentlichungsregeln
- Website: regulär zuerst Staging unter https://staging2026.studiojeker.ch; produktive Veröffentlichung von grösseren Änderungen erst nach fachlicher Freigabe.
- StudioONE: Render-Branch und Auto-Deploy-Zuordnung vor Änderungen prüfen. Niemals versehentlich StudioONE-Deploy als Website-Staging-Deploy bezeichnen.
- Externe Publikation, Versand, Datenlöschung oder sensible Berechtigungsänderung benötigen gesonderte Erlaubnis, soweit nicht zuvor explizit für den jeweiligen Ablauf freigegeben.
- Tokens und Schreibschlüssel niemals im Chat oder Repository ablegen.

## Dauerhafte Referenz
Diese Datei ist ein arbeitsorganisatorischer Standard. Sie ersetzt weder Sicherheitsregeln noch Rechteprüfungen oder verbindliche Fachspezifikationen. Bei widersprüchlichen älteren Dokumenten ist die tatsächliche aktuelle Systemarchitektur und die zuletzt bestätigte Anforderung zu verifizieren.
