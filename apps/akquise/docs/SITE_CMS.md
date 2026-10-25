# Bestehende Website (studiojeker.ch) in StudioONE

## Ziel

Unter **Website** gibt es zwei getrennte Bereiche:

1. **Bestehende Website verwalten** — studiojeker.ch über das vorhandene Sanity-Projekt
2. **Neue Website / Landingpage erstellen** — unverändertes Website-Studio

Sanity bleibt die einzige CMS-Datenquelle. StudioONE speichert keine parallele Kopie der Firmenwebsite.

## Sanity-Anbindung

| Einstellung | Wert |
| --- | --- |
| Project ID | `tgx6e6jg` |
| Dataset | `production` |
| Studio | https://studiojeker.sanity.studio/ |
| Staging | https://staging2026.studiojeker.ch |
| Live | https://www.studiojeker.ch |

Schemas und Document-IDs kommen aus `/studio` (Homepage-Singleton-ID, About, Contact, Work, Content Abo, KI).

### Tokens (nur serverseitig)

- `SANITY_API_READ_TOKEN` — optional, Lesen inkl. Entwürfe
- `SANITY_API_WRITE_TOKEN` — Editor-Token für Entwürfe, Medien, Publish
- `SITE_CMS_ALLOW_PUBLISH=true` — explizite Freigabe, sonst bleibt Veröffentlichen gesperrt

Keine Tokens als `NEXT_PUBLIC_*`. Kein Schreibzugriff im Browser.

## Funktionen

- Seitenübersicht aus Sanity laden
- Texte / Headlines (DE/EN wo im Schema lokalisiert) bearbeiten
- Hero-Bilder ersetzen (JPEG/PNG/WebP)
- SEO-Titel und Meta-Descriptions bearbeiten
- **Entwurf speichern** → nur `drafts.*` in Sanity
- **Vorschau** → Staging-URL (zeigt veröffentlichten Stand nach Staging-Build)
- **Zur Freigabe** → Audit-Eintrag, kein Publish
- **Veröffentlichen** → nur mit Häkchen + `SITE_CMS_ALLOW_PUBLISH` + vorheriger Freigabe

Keine automatische Veröffentlichung. Produktion der Marketing-Website wird durch dieses Modul nicht deployed.

## KI

Der KI-Button schlägt Texte/SEO vor. Übernehmen schreibt lokal in den Editor; Speichern bleibt ein separater Schritt.

## Grenzen V1

- Allowlist der wichtigsten Hero-/SEO-/Medienfelder je Singleton
- Services-Dokumente und Work-Kacheln weiter im Sanity Studio
- Staging zeigt Entwürfe erst nach Publish + Staging-Rebuild
- Publish ist standardmässig ausgeschaltet

## Tests

`tests/site-cms.test.ts` (Allowlist, Publish-Gate, Sanity-Client). Browser: `tests/browser/cms.spec.ts` (Navigation + Übersicht).
