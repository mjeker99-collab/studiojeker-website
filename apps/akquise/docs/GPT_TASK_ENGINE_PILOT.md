# GPT-Auftrags-Engine – Pilotstand

Umsetzung von `GPT_AUTONOMOUS_TASK_ENGINE_P1.md` auf diesem Branch. Kein Merge, kein Deploy, kein Versand.

## Was läuft

- Auftrag `NEWSLETTER_REVISE_TEXT` auf einem gespeicherten Newsletter.
- Tabellen `GptTask`, `GptTaskStep`, `GptTaskApproval`.
- Claim per `FOR UPDATE SKIP LOCKED`, Lease 3 Minuten, höchstens 3 Versuche.
- Transiente Fehler vor einem gespeicherten Vorschlag werden mit Abstand erneut versucht.
- Ein Abbruch während des KI-Aufrufs ohne gespeicherten Vorschlag wird blockiert, nicht still wiederholt.
- Dieselbe Nutzerin, dieselbe Version und derselbe Wunsch erzeugen keinen zweiten Auftrag.
- Versionskonflikt blockiert und überschreibt die neuere Fassung nicht.
- Veröffentlichung und Versand bleiben auf `WAITING_APPROVAL` und werden nach Freigabe nicht ausgeführt.

## Abhängigkeit PR #322

PR #322 (`feat/studioone-newsletter-cursor-bridge-20261102`) enthält den Cursor-Adapter (`lib/cursor/contract.ts`, `lib/cursor/newsletter.ts`, `NewsletterCursor.tsx`). Er ist hier nicht kopiert. Layoutaufträge melden den Blocker und senden nichts. `CURSOR_API_KEY` allein gilt nicht als Verbindung.

## Blocker

- Textüberarbeitung braucht serverseitig `CONTENT_AI_ENABLED=true` und `OPENAI_API_KEY`. Fehlt das, ist der Status blockiert.
- Kein separater Render-Worker. Fortsetzung nach Neustart über den bestehenden Produktionsstart und den nächsten Tick oder das erneute Öffnen.
- GitHub, Render, Sanity, Drive und Exoscale haben nur einen gelesenen Konfigurationsstatus. Keine neuen Aktionsbuttons.

## Tests

- Unit: `tests/gpt-task-engine.test.ts`
- Integration: `tests/integration/gpt-task-engine.test.ts`
- Browser: `tests/browser/newsletter-task.spec.ts` bei 700, 390 und 320 px

Der konkrete Lauf steht im Pull-Request. Externe Anbieter werden in den Tests nicht aufgerufen.
