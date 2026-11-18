# Maison St. Christol – Mitgliederflyer 2027

**Status:** Vorschau zur Freigabe (kein Merge / keine Veröffentlichung)

## Lieferobjekte

- Bildschirm-PDF: `out/Maison_St_Christol_Mitgliederflyer_2027_VORSCHAU.pdf`
- Druck-PDF (A5 + 3 mm Beschnitt, ~300 dpi): `out/Maison_St_Christol_Mitgliederflyer_2027_DRUCK_3mm.pdf`
- Seitenvorschau: `out/preview-2027-left.png`, `out/preview-2027-right.png`
- Bearbeitbare Quelle: `scripts/build_preview.py` + `assets/`
- Original unverändert: `assets/Maison_St_Christol_Flyer_ORIGINAL.pdf`

## Build

```bash
pip install pillow reportlab
python scripts/build_preview.py
```

## Inhalt 2027 (finale Textrunde)

- Vorderseite: erweiterter Text «Ein Ort zum Ankommen», Footer-Labels korrigiert
- Rückseite: neue Mitgliedschafts-Einleitung, Preise 2027, Hinweis Ferienwochen nicht im Jahresbeitrag
- Impressionen: «Südfrankreich entdecken»
- CTA: «Jetzt Mitgliedschaft anfragen!» + «Sichern Sie sich Ihren Platz an der Sonne.»
- Kontakt: Nora Jeker, njeker@studiojeker.ch
- QR → Beitrittsantrag 2027
