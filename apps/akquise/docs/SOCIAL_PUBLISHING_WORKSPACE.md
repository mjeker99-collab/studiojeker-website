# Social Media Publishing Workspace

Trennung von GPT-Dialogen, Content-Studio-Entwürfen und Social Posts im Marketing
Hub. Integrationsziel: Branch `feat/akquise-production-readiness` (Render-Service
`studiojeker-akquise`, Root `apps/akquise`). Keine Änderungen an der öffentlichen
Studiojeker-Website.

## Backup- und Migrationsplan (vor Produktion)

1. Render-Dashboard: logisches Backup bzw. PITR-Punkt der Datenbank
   `studiojeker-akquise-db` prüfen; zusätzlich externes `pg_dump` (Custom-Format)
   wie in [render/README.md](../render/README.md) und [PRODUCTION.md](PRODUCTION.md).
2. Inventar: `npm run data:inventory` gegen eine Staging-Kopie; Anzahl
   `MarketingContent` nach `kind` und `workspace` notieren.
3. Migrationen ausschliesslich additiv (Reihenfolge):
   - `20261024210000_social_publishing_workspace`
     - Enum `ContentWorkspace`, Spalte `MarketingContent.workspace`
     - GPT-Dialog-Stubs → `GPT_DIALOG`; Studio-Social → `CONTENT_DRAFT`
   - `20261025080000_dialog_archive`
     - Spalte `MarketingContent.archivedAt` (Soft-Archiv)
   - `20261025140000_social_workspace_repair`
     - Idempotente Nachklassifikation verbleibender KI-Stubs
     - Kampagnen-Sync aus StudioSeries-Briefing auf Dialog-/Entwurfs-Stubs
4. **Kein** `migrate reset`, kein Löschen von Versionen, Freigaben, Audits,
   GPT-Aufträgen, Kampagnen, Medien oder `SOCIAL_POST`-Zeilen.
5. Nach Migration: `/api/health/ready` muss `workspace` und `archivedAt` lesen;
   Social-Media-Liste zeigt nur `SOCIAL_POST`.
6. Rollback-App: vorheriges Release nur bei schema-kompatiblem Stand
   (neue Spalten ignorieren). Spalten nicht droppen, solange neue Daten existieren.

## Trennung

| Workspace       | Bedeutung                         | Sichtbarkeit Social Media      |
| --------------- | --------------------------------- | ------------------------------ |
| `GPT_DIALOG`    | KI-Gesprächsstubs                 | Nur «Zur Übernahme»            |
| `CONTENT_DRAFT` | Content-Studio-Beiträge           | Nur «Zur Übernahme»            |
| `SOCIAL_POST`   | Publishing-Workspace              | Liste, Kalender, Freigabe/Pub. |

Übernahme: `POST /api/hub/promote-social/:id` mit
`{ version, campaignId? }`. Keine Versionserhöhung, keine
Freigabe-Invalidierung, keine Datenlöschung. Fehlende `campaignId` wird aus
dem Content bzw. dem StudioSeries-Briefing übernommen.

Dialogverwaltung: `POST /api/hub/dialogs/manage` mit
`{ action: "archive"|"restore"|"delete", items: [{ id, version }] }`.
Nur `GPT_DIALOG` / `CONTENT_DRAFT`. Archivierung setzt `archivedAt`.
Löschen entfernt ausschliesslich den gewählten Content und seine
Versions-/Freigabe-Kinder. Kampagnen, Studio-Projekte, Medien und
`SOCIAL_POST`-Zeilen bleiben erhalten. Gemeinsame UI:
`app/dialogs/DialogManager.tsx` (Social Media «Zur Übernahme» und
StudioChat / Kampagnen-GPT).

## Funktionen

- Vorschau je Kanal, Bibliotheksmedien, Bearbeitung, Status- und
  Veröffentlichungsfilter
- Kontextbezogener GPT-Assistent (AssistantEntry in Kampagnen & Social Media);
  neue Chats → `GPT_DIALOG`
- Freigabe: Content-Entwürfe erlaubt; GPT-Dialoge erst nach Übernahme;
  manueller Veröffentlichungsnachweis nur für `SOCIAL_POST`
- Cyan-Aktionsbuttons (`--cyan` / Primärbuttons); zurückhaltende `.danger`-Löschen-Buttons
- Dialog-Mehrfachauswahl, Archiv-Filter, Sicherheitsabfrage vor Löschen,
  Kampagnenwahl bei Übernahme
- Kampagnen und Newsletter unverändert nutzbar

## Deployment (Render)

Service: `studiojeker-akquise` (`apps/akquise/render.yaml`).
**Sole deploy branch:** `feat/akquise-production-readiness` (Root `apps/akquise`).
`autoDeployTrigger: "off"` — Merge allein deployed nichts; nur manuelles Deploy
nach Freigabe. Der frühere Branch `feat/akquise-render-frankfurt` ist entfernt
und darf in Settings → Build & Deploy nicht mehr als Quelle stehen.

1. PR in `feat/akquise-production-readiness` mergen.
2. Backup wie oben (PITR / `pg_dump`) und Erfolg prüfen.
3. Render Settings prüfen: Branch = `feat/akquise-production-readiness`.
4. Manuelles Deploy des Webdienstes `studiojeker-akquise` («Deploy latest commit»).
5. `preDeployCommand` führt `node render/command.mjs migrate` aus
   (`prisma migrate deploy`, kein Seed/Reset).
6. Healthcheck:
   - `/api/health/ready` → `status: "ready"` und Spalten inkl. `archivedAt`
   - `/api/health/live` → `deploy.branch` / `deploy.commit` (Render-Env)
7. Optional in der Service-Shell (nur lesen):
   `npm run verify:dialogs` — zählt SOCIAL nach workspace/Archiv, prüft Spalten.
8. UI: Hard-Reload, Social Media → «Zur Übernahme»: Löschen / Archiv /
   Mehrfachauswahl. Alte GPT-Stubs bleiben in der Warteschlange bis Archiv/Löschen;
   sie dürfen nicht in der Publishing-Liste stehen.
