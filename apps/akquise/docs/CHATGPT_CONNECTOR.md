# ChatGPT Read-only Connector (StudioONE)

## 1. Was wurde implementiert?

Eine **ausschliesslich lesende** HTTP-Schnittstelle unter `/api/integrations/gpt/*`, mit der ChatGPT später auf **explizit freigegebene** StudioONE-Inhalte zugreifen kann:

| Methode | Pfad | Inhalt |
| --- | --- | --- |
| GET | `/api/integrations/gpt/projects` | Freigegebene Content-Serien (Projekte) |
| GET | `/api/integrations/gpt/projects/:id` | Detail inkl. Briefing, Konzept, Entwürfe |
| GET | `/api/integrations/gpt/campaigns` | Freigegebene Kampagnen |
| GET | `/api/integrations/gpt/campaigns/:id` | Detail inkl. redaktioneller Entwürfe |
| GET | `/api/integrations/gpt/content/search?q=` | Suche über freigegebene Inhalte |
| GET | `/api/integrations/gpt/openapi` | OpenAPI 3.1 für Custom Actions |

Zusätzlich in **Einstellungen → KI-Integrationen → ChatGPT**:

- Verbindungsstatus (Token vorhanden / widerrufen)
- Aktivierte Inhaltsbereiche (Scopes)
- Zeitpunkt des letzten erfolgreichen Zugriffs
- Freigaben setzen/entfernen
- Zugriff widerrufen oder wiederherstellen

**Keine** Schreib-, Lösch- oder Versandfunktionen. Bestehende StudioONE-Workflows bleiben unverändert.

## 2. Welche Inhalte sind lesbar?

Nur Datensätze mit einem Eintrag in `GptShare` **und** aktivem Scope:

- Kampagnen: Titel, Ziel, Audience, Zeitraum, Status der Marketing-Inhalte, gespeicherte Entwürfe (Subject, Body, Newsletter-Felder, Social-Varianten)
- Projekte (`StudioSeries`): Titel, Briefing, verknüpftes Konzept, zugehörige Inhalte
- Konzepte: freigegebene Strategy-Konzepte (Kapiteltexte)
- Bibliothek: nur wenn separat freigegeben
- Suche: Treffer nur in freigegebenen Objekten

**Nie** ausgeliefert:

- Kontaktlisten und personenbezogene CRM-Daten
- Akquise-Mail-Entwürfe (`Draft` / Empfänger)
- SMTP-/IMAP-Konfiguration
- OAuth-/API-Tokens, Passwort-Hashes
- Connector-Token selbst (auch nicht in der UI)

E-Mail-Adressen in redaktionellen Texten werden zu `[redacted-email]` ersetzt.

## 3. Wie ist der Zugriff geschützt?

1. **Separates Bearer-Token** `CHATGPT_CONNECTOR_TOKEN` (Render-Secret, nicht `NEXT_PUBLIC_*`)
2. Timing-safe Vergleich analog zu den internen Sync-Endpunkten
3. Integration muss **nicht widerrufen** sein (`GptIntegration.revokedAt`)
4. Scope-Prüfung pro Endpunkt (`projects` / `campaigns` / `concepts` / `content`)
5. **Explizite Freigaben** (`GptShare`) – ohne Freigabe leere Listen bzw. 404
6. Rate-Limit: 60 Anfragen / Minute (prozesslokal)
7. Audit `GPT_CONNECTOR_READ` ohne vertrauliche Payloads (nur Pfad/Scope)
8. Kein öffentlicher DB-Zugriff; nur die Next.js-App spricht mit PostgreSQL

## 4. Wie wird der Connector mit ChatGPT verbunden?

Die API allein verbindet ChatGPT **nicht** automatisch. Empfohlener Weg (Stand OpenAI Custom Actions / GPT Actions):

1. In Render `CHATGPT_CONNECTOR_TOKEN` setzen (langes Zufallsgeheimnis) und Deploy auslösen
2. In StudioONE unter Einstellungen gewünschte Kampagnen/Projekte freigeben (z. B. «Sichtbarkeit im Abo»)
3. OpenAPI laden:  
   `https://studiojeker-akquise.onrender.com/api/integrations/gpt/openapi`
4. In ChatGPT: Custom GPT / Actions → Import OpenAPI → Authentication: **Bearer** mit demselben Token
5. Privacy Policy / App-Review von OpenAI beachten, falls für die Organisation nötig
6. Mit einer Testfrage prüfen («Liste freigegebene Kampagnen» / «Suche Sichtbarkeit im Abo»)

Alternative: OpenAI **Connectors**-Framework, falls für den Workspace freigeschaltet – dieselbe OpenAPI und dasselbe Bearer-Schema verwenden.

## 5. Schritte vor dem produktiven Einsatz

- [ ] `CHATGPT_CONNECTOR_TOKEN` in Render setzen und notieren (Passwortmanager)
- [ ] Migration `20261024120000_gpt_connector` auf der Produktions-DB ausführen (Teil des normalen `migrate deploy`)
- [ ] In Einstellungen Freigaben für die relevanten Kampagnen setzen
- [ ] Custom GPT / Action mit OpenAPI + Bearer konfigurieren
- [ ] Smoke-Test: Suche «Sichtbarkeit im Abo», Kampagnendetail lesen
- [ ] Prüfen, dass Kontakte und SMTP-Status **nicht** erscheinen
- [ ] Bei Offboarding oder Vorfall: «Zugriff widerrufen» + Token in Render rotieren
- [ ] Kein automatisches Merge/Deploy ohne Freigabe

## Umgebungsvariablen

```bash
CHATGPT_CONNECTOR_TOKEN=   # server-only, sync:false in render.yaml
```

`MARTIN_EMAIL` wird für Audit-Einträge des Connectors genutzt (wie beim Contact-Sync).
