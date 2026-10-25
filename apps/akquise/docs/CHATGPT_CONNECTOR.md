# ChatGPT Connector (StudioONE)

## 1. Was wurde implementiert?

HTTP-Schnittstelle unter `/api/integrations/gpt/*` für ChatGPT Custom Actions:

### Lesen (unverändert nutzbar)

| Methode | Pfad | Inhalt |
| --- | --- | --- |
| GET | `/api/integrations/gpt/projects` | Freigegebene Content-Serien (Projekte) |
| GET | `/api/integrations/gpt/projects/:id` | Detail inkl. Briefing, Konzept, Entwürfe |
| GET | `/api/integrations/gpt/campaigns` | Freigegebene Kampagnen |
| GET | `/api/integrations/gpt/campaigns/:id` | Detail inkl. redaktioneller Entwürfe |
| GET | `/api/integrations/gpt/content/search?q=` | Suche über freigegebene Inhalte |
| GET | `/api/integrations/gpt/openapi` | OpenAPI 3.1 für Custom Actions |

### Kontrolliertes Schreiben (opt-in)

| Methode | Pfad | Inhalt |
| --- | --- | --- |
| POST | `/api/integrations/gpt/drafts` | Neuen Entwurf anlegen (Newsletter, Social, Website-Review) |
| GET | `/api/integrations/gpt/drafts/:id` | Entwurf lesen |
| PATCH | `/api/integrations/gpt/drafts/:id` | Bestehenden Entwurf aktualisieren (Optimistic Locking) |

Schreiben speichert **nur Entwürfe** (Status `DRAFT`). Kein Publizieren, kein Newsletter-/Mailversand, kein Social Publishing, kein Löschen, kein Statuswechsel nach APPROVED/PUBLISHED, keine CRM-/Lead-Manipulation.

Website-Texte landen ausschliesslich als **Review-Entwurf** in StudioONE (`WebsiteProject`-Version). Es gibt **keinen** direkten Schreibzugriff auf Sanity oder die öffentliche Website.

## 2. Einstellungen → KI-Integrationen → ChatGPT

- Verbindungsstatus Read-/Write-Token (ohne Anzeige der Secrets)
- Scopes inkl. **`write_drafts` (standardmässig aus)**
- Letzter Lese- und Schreibzugriff
- Lesefreigaben (`GptShare`)
- Schreibfreigaben je Kampagne / Projekt / Website (`GptWriteGrant`)
- Sofortiger Widerruf / Wiederherstellen

## 3. Welche Inhalte sind lesbar / schreibbar?

**Lesen:** nur Datensätze mit `GptShare` und aktivem Scope.

**Schreiben:** nur wenn alle Bedingungen erfüllt sind:

1. `CHATGPT_CONNECTOR_WRITE_TOKEN` gesetzt und als Bearer verwendet  
   (Read-Token wird für Schreibaktionen **nie** akzeptiert)
2. Integration nicht widerrufen
3. Scope `write_drafts === true`
4. Explizite Schreibfreigabe für die Ziel-Kampagne, das Projekt oder die Website
5. Allowlist-Payload (kein beliebiges Object-Update)
6. Optimistic Locking über `expectedVersion` / optional `If-Match`
7. Optional `idempotencyKey` beim Create gegen doppelte Entwürfe

**Nie** ausgeliefert oder schreibbar:

- Kontaktlisten und CRM-Daten
- Akquise-Mail-Entwürfe (`Draft` / Empfänger)
- SMTP-/IMAP-Konfiguration, OAuth-/API-Tokens
- Connector-Tokens selbst

E-Mail-Adressen in redaktionellen Texten werden zu `[redacted-email]` ersetzt.

## 4. Wie ist der Zugriff geschützt?

1. Separates Read-Bearer `CHATGPT_CONNECTOR_TOKEN`
2. Separates Write-Bearer `CHATGPT_CONNECTOR_WRITE_TOKEN` (ohne dieses Token bleiben Writes 503)
3. Timing-safe Vergleich
4. `GptIntegration.revokedAt` und Scope-Prüfung
5. Explizite Read-Shares und Write-Grants
6. Rate-Limit: 60/min Lesen, 20/min Schreiben (prozesslokal)
7. Max. Request-Body 256 KB
8. Audit `GPT_CONNECTOR_READ` / `GPT_CONNECTOR_WRITE` / `GPT_DRAFT_*` ohne Secrets
9. Versionierung über bestehende `MarketingVersion` / `WebsiteVersion`

## 5. ChatGPT verbinden und Plugin aktualisieren

1. In Render setzen:
   - `CHATGPT_CONNECTOR_TOKEN` (Lesen)
   - `CHATGPT_CONNECTOR_WRITE_TOKEN` (Schreiben – anderes Geheimnis)
2. Deploy / Migration `20261024160000_gpt_write_drafts`
3. In StudioONE:
   - gewünschte Kampagnen/Projekte **lesen** freigeben
   - für Schreiben: `write_drafts` einschalten + Schreibfreigabe setzen  
     (z. B. Kampagne «Sichtbarkeit im Abo»)
4. OpenAPI neu laden:  
   `https://studiojeker-akquise.onrender.com/api/integrations/gpt/openapi`
5. Im privaten ChatGPT Custom GPT / Actions:
   - OpenAPI **erneut importieren** (enthält jetzt POST/PATCH Drafts)
   - Authentication: zwei Bearer-Schemata bzw. das Write-Token für Draft-Tools;  
     Tokens **niemals** ins Plugin-Paket einbetten
6. Verbindungstest:
   - Lesen: «Liste freigegebene Kampagnen» / Suche «Sichtbarkeit im Abo»
   - Schreiben: Newsletter-03-Entwurf anlegen, danach per GET lesen
   - Prüfen: kein Versand, Status bleibt DRAFT

### Beispiel Create (Newsletter 3)

```http
POST /api/integrations/gpt/drafts
Authorization: Bearer <CHATGPT_CONNECTOR_WRITE_TOKEN>
Content-Type: application/json

{
  "kind": "NEWSLETTER",
  "title": "Newsletter · Sichtbarkeit im Abo",
  "campaignId": "<kampagnen-id>",
  "subject": "Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.",
  "preheader": "Pakete, Claims und Promotion bis 30. November 2026",
  "body": "…",
  "audience": "Bestehende und potenzielle Abo-Interessenten",
  "newsletter": { "templateId": "newsletter-03", "fields": { … } },
  "idempotencyKey": "visibility-abo-nl3-2026-11"
}
```

Anschliessend:

```http
GET /api/integrations/gpt/drafts/<id>
Authorization: Bearer <CHATGPT_CONNECTOR_WRITE_TOKEN>
```

Update mit Optimistic Locking:

```http
PATCH /api/integrations/gpt/drafts/<id>
Authorization: Bearer <CHATGPT_CONNECTOR_WRITE_TOKEN>
If-Match: 1
Content-Type: application/json

{ "expectedVersion": 1, "subject": "…" }
```

Bei Versionskonflikt: **409**.

## 6. Schritte vor dem produktiven Einsatz

- [ ] Beide Tokens in Render setzen (Passwortmanager)
- [ ] Migration deployen
- [ ] Lesefreigaben und Schreibfreigaben bewusst setzen
- [ ] `write_drafts` nur einschalten, wenn Schreiben gewünscht
- [ ] OpenAPI in ChatGPT neu importieren
- [ ] Smoke-Test Create → Read; kein Versand
- [ ] Bei Vorfall: «Zugriff widerrufen» + Tokens rotieren
- [ ] Kein automatisches Merge/Deploy ohne Freigabe von Martin/Nora

## Umgebungsvariablen

```bash
CHATGPT_CONNECTOR_TOKEN=        # read-only, sync:false in render.yaml
CHATGPT_CONNECTOR_WRITE_TOKEN=  # draft writes only; leave empty to keep writes off
```

`MARTIN_EMAIL` wird als Audit-/Actor-Konto für Connector-Schreibvorgänge genutzt.
