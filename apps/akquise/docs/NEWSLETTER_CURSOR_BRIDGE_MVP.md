# StudioONE – Newsletter direkt an Cursor delegieren (MVP)

## Ziel
StudioONE soll aus dem **Newsletter-Bereich** einen Änderungsauftrag an einen Cursor Cloud Agent übergeben, dessen tatsächlichen Bearbeitungsstatus anzeigen und den fertigen PR/die Vorschau verlinken. Niemand muss technische Prompts kopieren, GitHub-Kommentare schreiben oder Cursor separat starten. Klares KMU-Interface: *Wunsch → Bearbeitung → Vorschau → ausdrückliche Freigabe*.

**Live-Kontext**: gemeinsames Repo `mjeker99-collab/studiojeker-website`, StudioONE Render-Branch `feat/akquise-production-readiness` (vor Änderung tatsächlich konfigurierte Zuordnung prüfen), App unter `apps/akquise`; Newsletter UI in `app/hub/Hub.tsx`, `app/newsletter/NewsletterEditor.tsx`. Der V4-Redaktionsauftrag ist getrennt in PR #313 auf Branch `cursor/newsletter-v4-three-fixes-bd16`; **nicht an PR #313 oder V3 arbeiten**.

## Verbindliche Anleitung
Lies `AGENTS.md`, `apps/akquise/AGENTS.md`, `docs/STUDIOONE_OPERATING_AGREEMENT.md`, `docs/STUDIOONE_UX_GUIDELINES.md` und bestehende Newsletter-CMS/Assistentenlogik. Bestehende Funktionen nicht duplizieren. Umsetzung als kleinster sinnvoller, sicher testbarer PR.

## API-Integration
Offizielle Cursor Cloud Agents API v1 (Public Beta):
- `POST https://api.cursor.com/v1/agents` mit `{prompt:{text},repos:[{url:"https://github.com/mjeker99-collab/studiojeker-website",prUrl:...}],workOnCurrentBranch:true,autoCreatePR:false}` für einen **explizit zugelassenen und aktuell ausgewählten Newsletter-PR**. Bei neuer Ausgabe nur den freigegebenen Newsletter-Branch/PR verwenden, keine beliebigen Benutzer-URLs.
- `GET /v1/agents/{id}` und `GET /v1/agents/{id}/runs/{runId}` für Status; alternativ dokumentiertes List-Runs-Feld. Kein Status `läuft`, bevor eine echte Antwort mit agent/run-ID vorliegt.
- `POST /v1/agents/{id}/runs` für eine Folgerevision auf demselben Agenten, sofern kein anderer Lauf aktiv ist. Konflikt 409 nutzerfreundlich anzeigen.
- Die API akzeptiert Bearer/Basic; `CURSOR_API_KEY` **nur serverseitig als Render Secret**, niemals im Client, Logs, PR oder in GitHub Actions. Fehlende Konfiguration: `Cursor noch nicht verbunden`, kein scheinbarer Erfolg.
- `CURSOR_API_KEY` nie im Browser abfragen und nie über einen öffentlichen Endpoint herausgeben. Ein einmaliger Administrator-Schritt in Render ist vertretbar. Kein Secret in `render.yaml`, nur `sync:false`/Dokumentation, kein Blueprint-Apply.
- Wenn die API-v1-Oberfläche abweicht, verifizierte Dokumentation lesen und entsprechend anpassen; **keine erfundenen Endpunkte**.

## Newsletter-UX
- Ganz oben im vorhandenen Newsletter-Bereich, möglichst **aus dem bereits bestehenden GPT-/Aufgabenfeld**, eine eindeutige Aktion: **«Mit Cursor umsetzen»**. Kein zweites paralleles Chat-Feld und keine Entwickler-Fachbegriffe.
- Bearbeitungsziel = ausgewählter Newsletter-Entwurf; Versionsreferenz und Original-Template serverseitig merken. V3 geschützt, V4 nur als separate Datei; bestehende Bilder, Logos und Layoutstandard nur auf expliziten Auftrag ändern.
- Status klar: `Noch nicht gesendet`, `An Cursor übergeben`, `In Bearbeitung`, `Vorschau bereit`, `Fehler`; mit Link **«Vorschau öffnen»**, **«Änderungen prüfen»** zum Cursor-/GitHub-PR.
- Gespeicherten Task/Agent/Run/PR sicher in Postgres persistieren, nach Reload wieder anzeigen. Idempotenz/Schutz vor Doppelklick (pro Newsletter nur ein aktiver Task), knappes Polling nur für aktives UI.
- Nach Fertigstellung immer Freigabe durch die verantwortliche Person. **Niemals automatisch mergen, deployen, in Mailchimp veröffentlichen oder versenden**.
- Trenne technische Cursor-Ausführung streng vom eigentlichen Newsletterversand; Status `Vorschau bereit` ist nicht `Newsletter freigegeben`.
- Begrenze Eingabe (z.B. 4000 Zeichen), Ausgabe und PR-/Repo-Ziele auf feste erlaubte Werte; Serverauth via `requireUser`, Rollen-/Projektberechtigung, Origin/CSRF-Check analog den bestehenden API-Routen. Keine sensiblen Inhalte in Fehlerlogs; Rate Limit und Audit-Event.
- Falls Cursor zwar einen Agenten startet, aber noch keinen PR aktualisiert, korrekt `In Bearbeitung` zeigen.

## Ziel-Implementierung
1. Serverseitige Cursor-API-Clientbibliothek und abgesicherte API-Routen im Next.js-App-Pfad für neue Aufträge, Status und Revisionen.
2. Minimalistische UI-Integration in vorhandenes Newsletter-Modul, keine Neuorganisation der Navigation oder neue Einstellungen auf Basislevel.
3. Sichere Persistenz (Prisma Migration falls nötig), automatisierte API-Mock-Tests (kein realer API-Aufruf im Test) und UI-Abnahme bei 700/390/320 bzw. vorhandenen Breakpoints.
4. README mit **einmaliger** Cursor-Key-Konfiguration, Rollen, Ablauf und Fehlerbehandlung. Keine Deployment-Behauptung ohne Render-Verifikation.

## Akzeptanzkriterien (P1)
- Eine kaufmännische Person startet aus dem Newsletter-Bereich in <2 Minuten eine Änderung.
- Genau ein sichtbarer Hauptbutton; kein Copy/Paste nach GitHub.
- Ein bestätigter Cursor-Start liefert reale agent/run-ID; Fehler haben klare Meldungen.
- Bei App-Reload bleibt Status und PR-Link erhalten.
- Auftrag verändert keine unbeteiligten Bild-/Layoutbereiche, soweit durch Anweisung und Diff prüfbar.
- Kein Merge/Deploy/Versand ohne separate ausdrückliche Freigabe.

**Scope-Begrenzung**: Dieses PR betrifft ausschliesslich die technische Cursor-Verbindung im StudioONE-Newsletterbereich. Den Newsletter V4 in PR #313 nicht bearbeiten. Nach Änderungen Draft-PR aktualisieren, dokumentierte Tests ausführen und **ohne Merge/Deploy stoppen**.
