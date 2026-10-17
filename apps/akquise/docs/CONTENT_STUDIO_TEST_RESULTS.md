# Content-Studio: gezielte Abnahme, 17.10.2026

Keine kostenpflichtigen KI-Aufrufe, keine externen E-Mails, keine Veröffentlichungen. Alle Inhalte synthetisch. Bestehende lokale Datenbank nicht verändert; Integration und Browser verwendeten separate temporäre PostgreSQL-Schemas ohne Docker.

## Erfolgreich ausgeführt

- 5 neue Unit-/Konfigurationsprüfungen: 1–6 Beiträge/eindeutige Kanäle/Formate, Schweizer ss, fehlender Key/keine Secrets im öffentlichen Status, unverändertes Original-Logo, Produktionssperre für lokalen Bildspeicher.
- 4 bestehende Hub-Unitprüfungen (Zeitumstellung, URLs, sicherer Newsletter-Export, Eingabevalidierung).
- 4 Render-Guard-Prüfungen, einschliesslich unveränderter SMTP-Sperren.
- 9 ausgewählte PostgreSQL-Fälle über gezielte Läufe: vier bestehende Hub-Fälle (Berechtigungen, versionsgebundene Freigabe, Newsletter-Export ohne Transfer, Akquise/Kalender) sowie fünf Studio-Fälle (Serien/Persistenz, Assetrechte/Tampering/Importgrenzen, PNG/JPG/ZIP und Freigabeentwertung, fehlende Schriftdatei, KI-Auftragsdeduplikation/Limits/Fehler/Reload).
- Eine Desktop-Browser-Abnahme (14.7 Sekunden): persönlicher Login, Originalbild-Upload, Briefing, Editieren/Speichern, Reload, getrennte KI-Verbindung, Layoutvorschau, Freigabe, PNG-Download, Freigabeentwertung. Zusätzlich Breiten 1024 und 390 ohne Horizontalüberlauf. Sieben Screenshots in docs/screenshots/studio-*.png.
- Produktionsbuild nach den letzten Code-/Prisma-Korrekturen erfolgreich. Gezieltes ESLint und TypeScript erfolgreich.
- Zusätzliche lokale native Fontprüfung mit ausdrücklich synthetischer DejaVu-Testschrift in allen drei Zielhöhen erfolgreich. Diese Schrift ist kein freigegebenes Markenasset und wird nicht ausgeliefert. Ein schreibbarer XDG_CACHE_HOME verhindert lokale Fontconfig-Cachewarnungen.

## Eingrenzung und korrigierte Fehler

npm-Blockade beseitigt: schreibbarer /tmp-Cache und begrenzte Netzwerkabrufe. Für gefilterte node:test-Läufe mussten späte Top-Level-Imports vor Hook-/Testregistrierung verschoben werden; sonst konnte Schema-Cleanup vor der späteren Testregistrierung starten. Prisma-Organisationsrelation und JSONB-Schlüsselreihenfolge beim deduplizierten Auftrag wurden korrigiert. Nur fehlgeschlagene/betroffene Fälle wiederholt, keine erneute vollständige lokale Testsuite.

Nach der erfolgreichen Browser-Abnahme wurde die Logo-Lesbarkeit durch eine separate weisse Hintergrundfläche verbessert (Originaldatei unverändert) und der reine Motivexport explizit als PNG/JPG ergänzt. Die Screenshots zeigen den bereits geprüften Ablauf vor diesen kleinen Korrekturen. Die zusätzlich angelegten gezielten Datenbankprüfungen für den reinen Motivexport und ein komplettes Layout mit expliziter Testschrift konnten lokal nach Unterbrechung der erneuten Netzwerk-Freigabe nicht mehr ausgeführt werden. Native Schrift-/Layoutgrössen wurden separat ohne Netzwerk geprüft. Diese Fälle sind Teil des bestehenden GitHub-CI-Checks; bis zu dessen Ergebnis nicht als dort bestanden behandeln.

## Offen

- Reale OpenAI-/S3-Verbindung und Provider-Timing mangels Secrets nicht live getestet; Testadapter sind ausschliesslich in automatisierten Tests injiziert. Kein Produktionsschalter für simulierte KI-Ausgaben.
- Originale freigegebene TTF/OTF fehlt. Die App sperrt sichtbare Textebenen und deren Freigabe bis zur Zuordnung. Textfreie Layouts, Motive, Kanaltexte und Planung sind nutzbar.
- Physischer Safari/iPad-Check offen; Browserprüfung Chromium.
- Keine neue vollständige Regressionssuite lokal. Vorhandene CI führt die Projektprüfungen beim PR automatisch aus; Ergebnis im PR kontrollieren.
- Kein Last-/RSS-Nachweis auf dem tatsächlichen 512-MB-Render-Tarif, kein Deployment. 1 Worker/serielle Exporte und Grenzen sind umgesetzt; Spitzenspeicher vor Go-live mit realistischen Medien messen.
- Asset-/Datenbank-Backup-Restore mit echten Bestandsdaten sowie externe Mandantentrennung bleiben getrennte Go-live-/Folgeschritte. Kundenzugänge deaktiviert.
