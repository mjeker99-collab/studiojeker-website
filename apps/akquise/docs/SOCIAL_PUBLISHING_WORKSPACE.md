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
   `MarketingContent` nach `kind` notieren.
3. Migration ausschliesslich additiv:
   `20261024210000_social_publishing_workspace`.
   - Neues Enum `ContentWorkspace`
   - Neue Spalte `MarketingContent.workspace` (Default `SOCIAL_POST`)
   - Bestehende GPT-Dialog-Stubs → `GPT_DIALOG` (Briefing-Platzhalter
     «Im Gespräch klären»)
   - Studio-gebundene Social-Zeilen → `CONTENT_DRAFT`
   - Hub-Posts ohne Studio-Serie bleiben `SOCIAL_POST`
4. **Kein** `migrate reset`, kein Löschen von Versionen, Freigaben, Audits oder
   GPT-Aufträgen. Dialoge bleiben in der Datenbank und in GPT-Projekten sichtbar.
5. Nach Migration: `/api/health/ready` muss `workspace` lesen; Social-Media-Liste
   zeigt nur `SOCIAL_POST`.
6. Rollback-App: vorheriges Release nur, wenn das Schema kompatibel bleibt
   (Spalte ignorieren). Spalte nicht droppen, solange neue Daten existieren.

## Trennung

| Workspace       | Bedeutung                         | Sichtbarkeit Social Media      |
| --------------- | --------------------------------- | ------------------------------ |
| `GPT_DIALOG`    | KI-Gesprächsstubs                 | Nur «Zur Übernahme»            |
| `CONTENT_DRAFT` | Content-Studio-Beiträge           | Nur «Zur Übernahme»            |
| `SOCIAL_POST`   | Publishing-Workspace              | Liste, Kalender, Freigabe/Pub. |

Übernahme: `POST /api/hub/promote-social/:id` mit `{ version }`. Keine
Versionserhöhung, keine Freigabe-Invalidierung, keine Datenlöschung.

## Funktionen

- Vorschau je Kanal, Bibliotheksmedien, Bearbeitung, Status- und
  Veröffentlichungsfilter
- Kontextbezogener GPT-Assistent (bestehender Einstieg); neue Chats → `GPT_DIALOG`
- Freigabe und manueller Veröffentlichungsnachweis nur für `SOCIAL_POST`
- Cyan-Aktionsbuttons (`--cyan` / Primärbuttons)
- Kampagnen und Newsletter unverändert nutzbar

## Deployment (Render)

1. PR in `feat/akquise-production-readiness` mergen.
2. Backup wie oben.
3. Manuelles Deploy des Webdienstes `studiojeker-akquise` (Auto-Deploy aus).
4. `preDeployCommand` führt `node render/command.mjs migrate` aus.
5. Healthcheck `/api/health/ready`; Login und Social-Media-Liste stichprobenartig
   prüfen (GPT-Dialoge nicht in der Publishing-Liste).
