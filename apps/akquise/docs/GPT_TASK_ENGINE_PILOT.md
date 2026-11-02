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

Geprüft am 2. November 2026 gegen `feat/studioone-newsletter-cursor-bridge-20261102`. PR #322 ist offen und `mergeable: CONFLICTING` gegenüber `feat/akquise-production-readiness` und gegenüber diesem Branch. Der Adapter wird hier nicht kopiert. Es gibt keinen Live-Aufruf an Cursor.

Gemeinsam geänderte Dateien: `README.md`, `app/api/[...path]/route.ts`, `app/globals.css`, `lib/hub/api.ts`, `package.json`, `prisma/schema.prisma`. PR #322 bringt zusätzlich `lib/cursor/*`, `NewsletterCursor.tsx`, `NewsletterCursorTask`, `NewsletterEdition` und drei Migrationen. `hubState` erhält dort das Argument `actor`. Beide Seiten können zusammengeführt werden, indem die GET-Route `hub/tasks` erhalten bleibt und `hubState(user.id)` verwendet wird.

Migrationsreihenfolge auf einer leeren Datenbank: `20261102110000_newsletter_cursor_task`, `20261102123000_newsletter_v4_edition`, `20261102130000_newsletter_cursor_preview`, danach `20261102140000_gpt_task_engine`. Diese Reihenfolge nicht umdrehen, nachdem `20261102140000` schon angewendet wurde.

`handoffNewsletter(actor, contentId, instruction)` verlangt eine `NewsletterEdition` und verweigert die geschützten Vorlagen `newsletter-03` und `newsletter-03-promo-nov2026`. `createV4Edition` legt eine Kopie als «Newsletter V4» an. Das ist keine Änderung an V3/V4-Dateien, wird von diesem Pilot aber nicht aufgerufen. `refreshNewsletterCursor(actor, contentId)` liest den gespeicherten Agenten. `toPublicTask` setzt `complete` immer auf `false`.

Ein Wunschfeld routet wie `taskRoute` in PR #322: technische Wünsche werden `NEWSLETTER_LAYOUT`, alle anderen Textaufträge. Die Engine speichert `HANDED_OFF` und `IN_PROGRESS` als wartend mit `externalJobId` und übernimmt `PREVIEW_READY` nur als Link. Status `SUCCEEDED` setzt sie dafür nicht.

### Patch nach konfliktfreiem Merge von PR #322

In `lib/tasks/engine.ts` die Standardfunktion `layout` ersetzen. Keine zweite Eingabe und keine Kopie von `lib/cursor/*`.

```ts
import { PolicyError } from "../policy";
import { handoffNewsletter, refreshNewsletterCursor } from "../cursor/newsletter";
import { readCursorKey } from "../cursor/contract";
import { mapCursorHandoff } from "./cursor-bridge";

layout: async (input) => {
  if (!readCursorKey()) return { blocked: "Cursor ist noch nicht verbunden." };
  try {
    const response = input.externalJobId
      ? await refreshNewsletterCursor(input.userId, input.contentId)
      : await handoffNewsletter(input.userId, input.contentId, input.instruction);
    if (!response.task) return { blocked: "Cursor hat keinen Auftrag angenommen." };
    return mapCursorHandoff(response.task);
  } catch (error) {
    if (error instanceof PolicyError) return { blocked: error.message };
    return { blocked: "Die Cursor-Verbindung hat nicht geantwortet. Nichts wurde als erledigt markiert." };
  }
},
```

Ohne diesen Patch bleibt der Auftrag blockiert und es geht kein Request an Cursor.

## Blocker

- Textüberarbeitung braucht serverseitig `CONTENT_AI_ENABLED=true` und `OPENAI_API_KEY`. Fehlt das, ist der Status blockiert.
- Kein separater Render-Worker. Fortsetzung nach Neustart über den bestehenden Produktionsstart und den nächsten Tick oder das erneute Öffnen.
- GitHub, Render, Sanity, Drive und Exoscale haben nur einen gelesenen Konfigurationsstatus. Keine neuen Aktionsbuttons.

## Tests

- Unit: `tests/gpt-task-engine.test.ts`
- Integration: `tests/integration/gpt-task-engine.test.ts`
- Browser: `tests/browser/newsletter-task.spec.ts` bei 700, 390 und 320 px

Der konkrete Lauf steht im Pull-Request. Externe Anbieter werden in den Tests nicht aufgerufen.
