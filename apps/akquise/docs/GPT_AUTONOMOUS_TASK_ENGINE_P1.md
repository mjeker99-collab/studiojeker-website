# StudioONE – P1 GPT-Auftrags-Engine / Newsletter-Vertical-Slice

## Verbindliches Produktziel
GitHub Issue #325. Die Bedienerin wählt im StudioONE-Bereich eine normale Aufgabe per Button, formuliert maximal einen kurzen Wunsch und erhält ein fertig bearbeitetes, gespeichertes und überprüfbares Ergebnis. GPT ist zentraler Planer und Ausführer; Cursor/GitHub/Render/Sanity/Drive/Exoscale sind austauschbare, typisierte Werkzeuge. Keine manuelle Copy-Paste-Übergabe, keine versteckten Adminschritte durch KMU-User. **Kein ungefragtes Ändern der Marken-/Newslettervorlagen.**

## Stand und Zusammenarbeit
- Produktiver Render-Branch, verifiziert 02.11.2026: `feat/akquise-production-readiness`, Service `studiojeker-akquise`.
- Separates laufendes PR #322: Newsletter-Cursor-Adapter/Status (nicht innerhalb dieses PR duplizieren oder dessen Branch verändern). PR #322 wurde wegen komplett leerer Allowlist zur Nacharbeit zurückgegeben; Pilot soll später die freigegebene Version des Adapters nutzen.
- Bestehende OpenAI, Sanity, Drive, GPT-Connector, Mailchimp und Hub-Funktionen verwenden; vorhandene Newsletter-Editor-UI nicht neu schreiben.
- Pflicht: `AGENTS.md`, `apps/akquise/AGENTS.md`, `docs/STUDIOONE_OPERATING_AGREEMENT.md`, `docs/STUDIOONE_UX_GUIDELINES.md`.

## P1: tatsächlicher End-to-End-Auftrag für Newsletter **ohne Veröffentlichung**

1. **Auftrag per Button starten**: im bestehenden Newsletterbereich auf den bereits gespeicherten Newsletter-Entwurf anwenden. Zunächst mindestens zwei verständliche Aufgaben: (a) «Newslettertext überarbeiten» (per GPT) und (b) «Layoutänderung umsetzen» (Cursor-Adapter; falls noch nicht gemergt, zunächst typisierte Adapter-Schnittstelle/mock, keine falschen Live-Claims). Pro Ansicht genau **eine primäre Aktion** und nur **ein** Aufgabenfeld, bestehende GPT-Interaktion wiederverwenden.
2. **Persistente Auftrags-Engine** mit z.B. Task und Step Modell in Prisma/PostgreSQL (safe separate migration). Benutzer-, Kunden-/Projektbindung, `contentId`, aktuelle `contentVersion`, `type`, `instruction`, `status`, `step`, `attempt`, `externalJobId`, `result`, `error`, `createdAt/updatedAt`. Status QUEUED, RUNNING, WAITING_APPROVAL, BLOCKED, FAILED, SUCCEEDED (mindestens diese).
3. **Automatische Weiterarbeit**: verlässlicher resumable Worker/Claim-Lease über PostgreSQL (und Wiederaufnahme nach Render-Neustart), Job-Retries nur bei transienten Fehlern mit Backoff/Max-Versuchen; Idempotenz und deduplizierte Provider-Aktionen. Nicht einen asynchronen Job nur im Request/Browser speichern; keine fiktiven Erfolgsmeldungen. Falls eine stabile Worker-Ausführung unter der vorhandenen Node-Web-Service-Konfiguration nicht sicher möglich ist, dokumentiere die erforderliche zusätzliche Runner-Konfiguration als Blocker statt Hintergrundfunktion vorzutäuschen.
4. **GPT als Controller, Werkzeuge als Spezialisten**: OpenAI `openAIProvider` / bestehende KI-Anbindung für redaktionelle Entwürfe, keine freie beliebige LLM-Ausführung von Shell, URL oder DB-Kommandos. LLM darf nur streng typisierte, genehmigte Aktionen vorschlagen; serverseitig werden Template, Version, Berechtigungen und Ziele verifiziert. Falls OpenAI-API fehlt, verständlich BLOCKED statt "läuft".
5. **Funktionsfähiger vollständiger Beispielablauf**: vorhandenen Newsletter auswählen → "Text redaktionell kürzen" → GPT erzeugt Änderung nur in freigegebenem Textslot/aktueller Kopie → Revision gespeichert → tatsächliche HTML-Vorschau aus bestehenden Funktionen → SUCCEEDED (ohne Mailchimp/SMTP). Nicht vorhandene Felder und Bild-/Branding-Tags dürfen nicht verändert werden. Bei Versionskonflikt BLOCKED statt überschreiben. Für Layoutaufträge kann engine den Cursor-Adapter anstossen und auf dessen reales Ergebnis warten, aber **niemals** aus `Cursor finished` automatisch `SUCCEEDED` ohne überprüfbaren Link/Version.
6. **Sichere Freigaben**: Auftrag, der Publikation/Versand, Merge, Kosten, Berechtigungsänderung, destruktive Aktion oder Geheimnisse betrifft, muss WAITING_APPROVAL mit konkretem Preview, exakter Ausgabeversion, Aktionstyp und authentifizierter, revisionsgebundener Zustimmung sein. Keine Send-/Publish-Funktion zum Pilot hinzufügen; Akquise-Mails niemals mit Newsletter-Versand vermengen.
7. **Status nachvollziehbar** im Newsletter-Bereich, nach Reload. Externe Verknüpfungen nur nach validiertem Provider-Response. Status klar verständlich, letzte nachgewiesene Aktion, Fehler/Blocker und nächster Schritt; UI bleibt für KMU einfach. Option für "Details" ausklappen. Keine separaten GPT/Cursor-Formulare.
8. **Adapter-Design für 7 Systeme**: capability registry/adapter interfaces + deklarativer Connection-Status, server-only credential lookup. P1 implementiert nur real vorhandene GPT- und sichere Newsletter-Funktionen; Cursor-Adapter aus #322 einhängen sobald verfügbar. Für GitHub/Render/Sanity/Drive/Exoscale vorerst typisierte Schnittstellen und echten Status aus vorhandenen Modulen, kein Fake-Connected. Noch keine neuen Admin-/Publish-Buttons für sieben Systeme.
9. **Tests**: unit happy path + transient failure/lease expiry/resume/version conflict/idempotent retry/auth/approval boundary, integration mit lokaler synthetischer DB, browser 700/390/320, TypeScript/eslint/build. Alle externen Tests mocken; keine echten Sendungen, Provider-Credentials oder produktiven API-Calls.

## Betriebs- und Sicherheitsgrenzen
- Server-only secrets, Rate limits, audit, rollenbezogene Scope-Prüfung, keine Berechtigungsumgehung. Auth analog `requireUser` + Origin-Prüfung in bestehender Route.
- Bestehende StudioONE Deploy-Konfiguration unverändert; PR-Basis wird `feat/akquise-production-readiness`, kein automatischer Merge/Deploy aus Cursor-Auftrag.
- Nur Dateien unter `apps/akquise` verändern. Kein Editieren der ursprünglichen V3-Dateien oder PR #313; auch die Website und Promo-Assets nicht anfassen.
- Keine neuen kostenpflichtigen Dienste ohne gesonderte Erlaubnis, kein neuer Render-Workspace.
- Liegt noch kein produktiver `OPENAI_API_KEY` oder `CURSOR_API_KEY` vor, Code mit aussagekräftigem BLOCKED-Status liefern und Setup dokumentieren; niemals fiktiv "live" melden.

## Deliverable
Eigenständige PR-Implementierung auf diesem Branch; README + getestete Pilotstrecke; Screenshots, Sicherheits-/Testsbericht, gegebenenfalls Verweis auf PR #322 als Abhängigkeit. **Kein Merge, Deploy oder extern wirksame Aktion durch Cursor selbst.** GPT prüft und integriert regulär nach Tests.

## Umsetzung auf diesem Branch
Code, Migration und Tests sind im Verzeichnis `apps/akquise` ergänzt. Betriebsnotiz: `apps/akquise/docs/GPT_TASK_ENGINE_PILOT.md`. Der Cursor-Adapter aus PR #322 wird nicht dupliziert. Technische Wünsche warten auf `handoffNewsletter`, sobald PR #322 konfliktfrei gemergt ist. Bis dahin wird kein Cursor-Auftrag gesendet. Ohne KI-Schlüssel bleibt die Textüberarbeitung blockiert. Kein Merge und kein Deploy aus diesem Stand.
