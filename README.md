# Newsletter Versionsvergleich

Eigenständige HTML-Vorschauen für den visuellen Vergleich — **ohne** Änderung der Original-Templates.

| Version | Ordner | Git-Quelle |
| --- | --- | --- |
| V1 Vor PR #124 | `v1-before-pr124/` | `9e87f54` (`studiojeker-newsletter-template.html` + Placeholders) |
| V2 PR #124 | `v2-pr124/` | `9584d5e` (`studiojeker-newsletter-template.html` + Placeholders) |
| V3 Aktuell | `v3-current/` | `8481f24` (`studiojeker-newsletter-final.html`, HTTPS-Bilder) |

Übersicht: [`index.html`](./index.html)

## Lokal

```bash
python3 -m http.server 8767 --directory mailchimp/compare
# → http://127.0.0.1:8767/
```

## GitHub Pages

Die Compare-Site wird zusätzlich auf Branch `gh-pages` veröffentlicht (nur dieser Ordner, Root der Pages-Site).

Erwartete URL nach Aktivierung:

`https://mjeker99-collab.github.io/studiojeker-website/`

Falls Pages noch nicht aktiv ist (Repo-Settings → Pages → Branch `gh-pages` / `/`):

1. Settings → Pages → Source: Deploy from branch
2. Branch: `gh-pages`, folder: `/ (root)`
3. Speichern

Die produktive Website (`studiojeker.ch` / Next.js) wird dadurch nicht verändert.
