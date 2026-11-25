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
| GET | `/api/integrations/gpt/mailchimp` | Live Mailchimp: Audiences, Statuszählwerte, Kampagnen. Scope `mailchimp`, standardmässig aus. Keine Kontakte, kein Versand |

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

## 7. Mailchimp live lesen

Der bestehende StudioONE-Connector ist eine Custom-Actions-Schnittstelle. Der Werkzeugkatalog ist das OpenAPI-Dokument unter `/api/integrations/gpt/openapi`. Eine neue Operation erscheint in ChatGPT erst nach erneutem Import. Im Repository gibt es kein App-Manifest und keinen MCP-`tools/list`-Katalog, den ein app-gestützter ChatGPT-Connector von selbst erweitern könnte.

Deshalb gibt es zwei Lesepfade, beide nur mit dem vorhandenen Read-Bearer `CHATGPT_CONNECTOR_TOKEN` und dem zusätzlichen Serverbereich `mailchimp`. Der Bereich ist standardmässig aus. Der Schreib-Token gilt hier nicht. `MAILCHIMP_API_KEY` bleibt auf dem Server und wird nur für GET verwendet.

| Pfad | Verwendung |
| --- | --- |
| `GET /api/integrations/gpt/mailchimp` | Custom Actions nach erneutem OpenAPI-Import |
| `POST /api/integrations/gpt/mcp` | MCP Streamable HTTP, Werkzeug `read_mailchimp` |

Die Antwort enthält `retrievedAt`, `source: mailchimp`, `error`, `paging`, Audiences und Kampagnen. Adressen, Schlüssel und `Basic` werden nicht zurückgegeben. `sent` und `persisted` bleiben falsch. Seitengrösse höchstens 20. Ein Token in der URL wird mit 401 abgelehnt und nicht gelesen.

`initialize` und `tools/list` verlangen dieselbe Anmeldung. Ohne Bearer kommt keine Werkzeugliste. GET öffnet keinen Ereignisstrom.

### Was ChatGPT heute tatsächlich kann

Geprüft an den OpenAI-Seiten «Add custom MCP server» und «Authentication», Stand 23. November 2026:

- Custom Actions übernehmen den bestehenden Bearer. Dafür OpenAPI neu importieren und in StudioONE **Mailchimp lesen** einschalten. Den Token nicht ins Plugin und nicht in die URL legen.
- Die Web-Oberfläche für eigene MCP-Plugins bietet OAuth, keine Anmeldung oder gemischt an. Gemischt heisst: `initialize` und `tools/list` ohne Anmeldung. Das lehnt dieser Endpunkt ab.
- Dieselbe Authentifizierungsseite sagt, ChatGPT könne keinen eigenen API-Key senden. Ein OAuth-Server ist in dieser Änderung nicht enthalten. Diesen Endpunkt deshalb nicht öffentlich schalten, nur damit «Scan Tools» ohne Anmeldung funktioniert.
- Ein MCP-Client, der bei jedem Aufruf `Authorization: Bearer` mit dem Read-Token sendet, kann den Endpunkt nutzen. Nach einem später freigegebenen Deploy wäre die Adresse `https://studiojeker-akquise.onrender.com/api/integrations/gpt/mcp`. Sie ist mit diesem Branch nicht live.
- Neue MCP-Werkzeuge übernimmt ChatGPT laut derselben Anleitung erst nach **Refresh** in den App-Einstellungen und einem neuen Gespräch.

### Einrichtung, erst nach separater Freigabe für Merge und Deploy

1. In Render nur bestätigen, dass `MAILCHIMP_API_KEY` und `CHATGPT_CONNECTOR_TOKEN` als Namen existieren. Werte nicht öffnen, kopieren oder protokollieren.
2. In StudioONE unter **KI-Integrationen → ChatGPT** den Schalter **Mailchimp lesen** aktivieren. Ohne diesen Schalter antwortet die Abfrage mit 403.
3. Für Custom Actions das OpenAPI-Dokument neu importieren. Authentication bleibt der bisherige Read-Bearer.
4. Für einen MCP-Client die Adresse ohne Query-Parameter eintragen und den Read-Token nur als Authorization-Header hinterlegen.
5. Eine Leseprobe ausführen. Die Antwort nennt Zählwerte und Kampagnenmetadaten, keine Adressen, und `sent` bleibt falsch.
6. Logs dürfen den Key, `Basic` und E-Mail-Adressen nicht enthalten.
