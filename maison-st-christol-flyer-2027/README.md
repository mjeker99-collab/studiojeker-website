# Maison St. Christol – Mitgliederflyer 2027

**Status:** Vorschau zur Freigabe (nicht final / nicht veröffentlicht)

## Ziel

Bestehendes Flyer-Layout (Dunkelblau, Weiss, Beige) beibehalten und ausschliesslich Inhalte für die Mitgliederwerbung 2027 aktualisieren.

## Quellen

- Originalflyer (unverändert gesichert): `assets/Maison_St_Christol_Flyer_ORIGINAL.pdf`
- Rastervorlage: `assets/original_flyer_raster.png`
- Logo-Varianten: `assets/logo_variants.png`
- QR-Ziel: Beitrittsantrag 2027  
  https://drive.google.com/file/d/1ftThD_Gp_4nI6ul683AN46paZ7J0FTVx/view

## Vorschau

- Vorderseite: `out/preview-2027-left.png`
- Rückseite: `out/preview-2027-right.png`
- Bildschirm-PDF (A5, 2 Seiten): `out/Maison_St_Christol_Mitgliederflyer_2027_VORSCHAU.pdf`

## Build

```bash
pip install pillow reportlab
python scripts/build_preview.py
```

## Noch ausstehend (nach Freigabe)

- Druck-PDF mit 3 mm Beschnitt
- Feinschliff Typografie/Abstände falls gewünscht
- Abgleich mit vollständiger Nutzungs-/Tarifordnung 2027 (Preise aktuell gegen Beitrittsantrag 2027 geprüft)

## Geänderte Inhalte 2027

- Jahresbeiträge: CHF 120 / 180 / 90
- Ferienwochen inkl. zweite Woche (je Kategorie)
- Service und Endreinigung: CHF 150.–
- Max. zehn Mitgliedschaften, max. fünf Personen
- CTA + QR zum Beitrittsantrag
- Seite 1 Text: «Mitglied werden in unserem kleinen und exklusiven Ferienverein.»
- Seite 1 Bildraster: Castillon-du-Gard, Uzès, Avignon
- Kontakt: Nora Jeker, njeker@studiojeker.ch
