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

## Sofort nutzbar (ohne Pages)

HTML-Preview über GitHub (iPad-Safari):

| Seite | Link |
| --- | --- |
| Übersicht | https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/index.html |
| V1 Vor PR #124 | https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v1-before-pr124/index.html |
| V2 PR #124 | https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v2-pr124/index.html |
| V3 Aktuell | https://htmlpreview.github.io/?https://github.com/mjeker99-collab/studiojeker-website/blob/gh-pages/v3-current/index.html |

Branch `gh-pages` ist bereits gepusht (nur Compare-Site, kein Next.js).

## GitHub Pages (empfohlen für iPad)

Erwartete URL nach einmaliger Aktivierung:

`https://mjeker99-collab.github.io/studiojeker-website/`

Aktivierung (Repo-Admin, einmalig):

1. GitHub → Repository → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`**, folder: **`/ (root)`**
4. Save

Danach:

- Übersicht: `https://mjeker99-collab.github.io/studiojeker-website/`
- V1: `…/v1-before-pr124/`
- V2: `…/v2-pr124/`
- V3: `…/v3-current/`

Die produktive Website (`studiojeker.ch` / Next.js) wird dadurch **nicht** verändert.
