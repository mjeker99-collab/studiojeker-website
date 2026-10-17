# Studiojeker ONE: Content-Studio Desktop V1

Erweitert den bestehenden Marketing Hub um Briefings, Serien mit 1–6 Beiträgen, eigene Bilder, getrennte Kanaltexte, serverseitige OpenAI-Adapter, dauerhaft gespeicherte Generierungsaufträge, reproduzierbare Layouts und PNG/JPG/TXT/ZIP-Export. Bestehende Social-Entwürfe und versionsgebundene Freigaben werden weiterverwendet. Änderungen an Text, Motiv oder Layout entwerten Freigaben.

## Basis und Integration

PR #142 wurde bereits in `feat/akquise-render-frankfurt` (#141) integriert. Dieser PR basiert auf dessen tatsächlichem Head `03688c06448326ed40a38620ae948ebb10050545`. Reihenfolge: **#133 → #140 → #141 (enthält #142) → dieser PR**. Zielbranch `feat/akquise-render-frankfurt`; bei Integration der Vorgänger Basis bewusst aktualisieren. Keine automatischen Merges.

## Umfang

- PostgreSQL: additive Zuordnung alter Daten zu Studiojeker, Organisation/Markenprofil, Serien, private Assets und idempotente KI-Aufträge.
- KI: Responses/Images REST, konfigurierbare Modelle, expliziter Start/Kostenhinweis, tägliche Anzahl-/Budgetreservierungsgrenzen, kein automatischer Retry bei unklarem Ergebnis. Ohne API-Schlüssel: Nicht verbunden.
- Medien: privater S3-Speicher, geschützte Assetroutes, geprüfte Dateiarten/Grössen/Prüfsummen; lokale Ablage nur in Entwicklung. Referenzübermittlung nur nach Auswahl und Rechte-/Transferbestätigung.
- Unverändertes Original-Logo als separate Ebene, neue versionierte V1-Layouts. Freigegebene Schriftdatei fehlt; keine Ersatzschrift im Produktionslayout. Textfreie Layouts sind nutzbar.
- Planung nutzt vorhandene Social-/Kampagnen-/Kalenderfunktionen, Newsletter bleibt Mailchimp-Export. Kein Social-Publishing, Mailchimp-Transfer oder SMTP-Aufruf.

## Prüfung und Review

Produktionsbuild, TypeScript, gezieltes ESLint, 5 Studio-Units, 4 Hub-Units, 4 Render-Guards, 10 gezielte PostgreSQL-Fälle und 1 Desktop-Browserablauf inkl. Reload/Freigabe/Download/Entwertung erfolgreich. Sieben synthetische Screenshots. Keine erneut vollständig gestartete lokale Testsuite. Die beiden nachträglich ergänzten Export-/Font-Fälle und der einzelne Desktopablauf sind nach den letzten Korrekturen ebenfalls erfolgreich. Der Schriftcache bleibt pro Datei-Hash über die Laufzeit stabil, damit Pango keine gelöschten temporären Fonts referenziert. CI-Ergebnis vor Reviewabschluss prüfen.

Dokumentation: `apps/akquise/docs/CONTENT_STUDIO.md`, Prüfergebnisse `CONTENT_STUDIO_TEST_RESULTS.md`, Wiederaufnahme-/Sicherungsnachweis `CONTENT_STUDIO_CHECKPOINT.md`.

Offen vor Livebetrieb: OpenAI-Projekt/API-Key und Budgetentscheidung, privater S3-Bucket/Secrets, freigegebene Schriftdatei, Backup-Restore-Abnahme und tatsächliche Render-Speicherprüfung. Basisbudget Render bleibt USD 13.30/Monat vor Steuern/Mehrverbrauch; S3-/KI-Kosten separat mit Quellen/Annahmen dokumentiert. Keine Ressourcen gebucht.

Alle Änderungen ausschliesslich unter `apps/akquise/`. Website und Root-Deployment-Workflows unverändert. Nichts deployt, versandt oder veröffentlicht.
