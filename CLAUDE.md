# CLAUDE.md – Arbeitsregeln für Claude in diesem Repository

Dieses Repository enthält zwei getrennte Produkte: die **Studiojeker-Website** und **StudioONE** (`apps/akquise/`).
Die verbindlichen Regeln stehen in `AGENTS.md` und werden hier übernommen:

@AGENTS.md

Ergänzend gilt für Claude:

## Vor jeder Änderung

1. Ziel feststellen: Website oder StudioONE (V1 oder V2)? Nie vermischen.
2. Bei StudioONE zuerst den aktuellen Render-Deploy-Branch prüfen (Render-Workspace `StudioONE`, `tea-db960ljodcbs73d4cu7g`) und auf diesem Branch `AGENTS.md`, `apps/akquise/AGENTS.md`, `docs/STUDIOONE_OPERATING_AGREEMENT.md` und `docs/STUDIOONE_UX_GUIDELINES.md` lesen.
3. Verbindungsregister lesen, bevor nach Zugängen gefragt wird: `mjeker99-collab/Studiojeker_AI`, `docs/VERBINDUNGSREGISTER.md`.

## Was automatisch live geht (Stand 26.11.2026)

| Push auf | Löst aus |
|---|---|
| `main` | Website-Produktion (`deploy-production-site2026.yml`) **und** Staging (`deploy-staging.yml`) |
| `feat/akquise-production-readiness` | StudioONE-Produktion `studiojeker-akquise` (nach bestandenen Checks) **und** Testdienst `studioone-testpersonen` (bei jedem Commit) |

Darum: Claude arbeitet immer auf einem eigenen Branch (`claude/…`) und öffnet einen Pull Request.
Ein Merge in `main` oder `feat/akquise-production-readiness` ist ein Release und braucht Martins ausdrücklichen Auftrag («mergen und deployen»).

## Nie ohne ausdrückliche Freigabe

- E-Mails versenden (SMTP Metanet oder Mailchimp), Social-Posts oder Website-Inhalte veröffentlichen
- Produktive Daten löschen oder überschreiben (PostgreSQL, Sanity `tgx6e6jg` / `production`, Google-Masterliste)
- Secrets, Zugriffsrechte oder kostenpflichtige Pläne ändern
- Branch-Schutz oder Pflicht-Checks umgehen

## StudioONE V1 – Technik

- App unter `apps/akquise/`: Next.js, React, TypeScript, Prisma, PostgreSQL, Playwright, Nodemailer
- Prüfbefehle in `apps/akquise/`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:browser`, `npm run build`
- Gesundheitscheck Produktion: `https://studiojeker-akquise.onrender.com/api/health/ready`
- Tests ohne echten Versand: SMTP deaktiviert, Testadressen mit `example.com`, Testdaten als «TEST – …» markieren

## Statusmeldung nach jeder Arbeit

Immer getrennt angeben:

- **Entwurf**: Code geändert, Branch und Commit
- **Getestet**: welche Prüfungen in welcher Umgebung, mit Ergebnis
- **Veröffentlicht**: PR gemergt, Deploy-ID, Render-Status `live`
- **Produktiv bestätigt**: welcher Nutzerablauf auf welchem Gerät tatsächlich funktioniert

Dazu PR-Link, Commit und Link zum Ergebnis. Nicht Geprüftes als «unbekannt» ausweisen.

## Sprache

Mit Martin auf Schweizer Hochdeutsch (kein ß). Zeiten in Europe/Zurich.
