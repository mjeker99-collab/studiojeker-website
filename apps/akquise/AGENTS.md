# StudioONE Agent / Cursor – gemeinsamer Arbeitsstandard

**Verbindliche Referenz:** [../../docs/STUDIOONE_OPERATING_AGREEMENT.md](../../docs/STUDIOONE_OPERATING_AGREEMENT.md)

Vor jeder StudioONE-Codeänderung die Vereinbarung lesen. Sie gilt für ChatGPT,
Cursor und Coding-Agenten innerhalb dieses Verzeichnisses; Regeln für operative
Anwendungsagenten müssen zusätzlich in deren tatsächlich verwendete
Systemanweisungen integriert werden. Diese Datei allein ändert **nicht** das
Laufzeitverhalten des GPT-Agenten.

## Ausführung
- Auftrag selbständig bis zum technisch überprüfbaren Ergebnis bearbeiten.
- Bestehende Konzepte, Kampagnen und Daten nutzen; keine unnötigen Bestätigungen.
- Korrekte Berechtigungen respektieren. Text-/Designentwürfe dürfen gespeichert,
  aber nicht ohne Berechtigung extern veröffentlicht oder versandt werden.
- PR und Merge durch die vorhandenen Werkzeuge, ohne Schutzregeln zu umgehen.
- Render-Zielbranch `feat/akquise-production-readiness` prüfen; dessen
  Auto-Deploy nicht mit Website-Staging auf Metanet verwechseln.
- Nach Änderungen Build/Tests, Render-Deploy und `/api/health/ready` kontrollieren.
- Meldungen unterscheiden: committed, merged, deploy initiated, live, verified.
- Probleme selbst diagnostizieren; nur tatsächlich erforderliche Entscheidung vorlegen.
