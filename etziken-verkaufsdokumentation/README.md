# Etziken-Verkaufsdokumentation

Eigenständiges Layoutprojekt für die Immobilien-Verkaufsdokumentation
**Bolackerweg 10 · Etziken**. HTML/CSS · lokale Browser-Vorschau · PDF-Export mit Playwright.

**Status:** Layoutentwurf (2 A4-Seiten). Keine PDF/X- oder Druckereifreigabe.

---

## Schnellstart

```bash
cd etziken-verkaufsdokumentation
npm install
npx playwright install chromium   # einmalig
```

### Browser-Vorschau

```bash
npm run preview
```

Danach öffnen:

- Broschüre: http://127.0.0.1:4173/brochure.html
- Kontaktübersicht: http://127.0.0.1:4173/contact-sheet.html

### PDF + PNG-Vorschauen

```bash
npm run export
```

Erzeugt:

- `output/etziken-layoutentwurf.pdf` — genau 2 A4-Seiten (Layoutentwurf)
- `output/preview-page-1.png` — Titelseite
- `output/preview-page-2.png` — Innenseite Wohnen
- `output/export-report.json` — Prüfprotokoll

---

## Struktur

| Pfad | Inhalt |
|------|--------|
| `content/brochure.json` | Texte, Objektdaten, Bildzuordnung (getrennt vom Layout) |
| `content/image-manifest.json` | Bildliste: Dateiname, Pixelmasse, SHA-256 |
| `assets/approved/` | Originalfotos unverändert |
| `styles/brochure.css` | A4-Layout |
| `brochure.html` | Titelseite + Innenseite |
| `contact-sheet.html` | Kontaktübersicht aller Originaldateien (nicht Teil der Broschüre) |
| `scripts/export.mjs` | Playwright PDF/PNG-Export |
| `fonts/` | Lokal eingebundene Liberation Serif + Inter |

---

## Bildregeln

- Nur gelieferte Originaldateien in `assets/approved/`
- Keine Retusche, Filter, Zuschnitte oder KI-Bearbeitung
- Darstellung vollständig und proportional (`object-fit: contain`)
- SHA-256-Prüfsummen werden beim Export gegen das Manifest geprüft

### Bildzuordnung (dieser Entwurf)

| Rolle | Datei |
|-------|--------|
| Titelseite (Garten) | `01a10d34-fb96-7eaf-9908-ab5d40922ee5.jpg` |
| Innenseite (Wohn-/Essbereich) | `01a10d34-fcfa-7716-9197-f9478e2cc1cf.jpg` |

Hinweis: Die im Auftrag genannten Dateinamen
`72772F95-2BCC-4B7B-AD76-EE155BEF8AB0.jpeg` und
`929C58FE-9A37-45E0-96FA-CEC560E4A740.jpeg` waren in der Lieferung
nicht enthalten. Die Zuordnung erfolgte über den Bildinhalt.
Es wurden **14** Originaldateien geliefert (Auftragstext nannte zehn).

---

## Gestaltung

- Format: A4 Hochformat (210 × 297 mm)
- Farben: `#25483E` · `#242A27` · `#FAF9F6` · `#EAE4D9`
- Schriften: Liberation Serif (Titel), Inter (Fliesstext) — lokal
