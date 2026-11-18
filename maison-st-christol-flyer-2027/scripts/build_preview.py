#!/usr/bin/env python3
"""Build Maison St. Christol Mitgliederflyer 2027 preview.

Preserves the original raster layout; updates membership copy, prices,
page-1 text/photos, contact and CTA/QR. Does not overwrite the original PDF.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A5
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "out"

NAVY = (8, 40, 68)
NAVY_FOOTER = (14, 43, 70)
TEXT = (35, 40, 45)
CREAM = (248, 247, 245)
BEIGE = (246, 242, 237)
WHITE = (255, 255, 255)
BANNER = (17, 47, 72)
CONTACT_BG = (245, 240, 232)

SERIF_B = "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def F(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def cover_crop(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale + 0.5), int(im.height * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    base = Image.open(ASSETS / "original_flyer_raster.png").convert("RGB")
    canvas = base.resize((3072, 2048), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(canvas)
    S = lambda v: int(v * 2)
    rx0 = S(768)

    # ---- Page 1: replace 3-photo collage with Castillon / Uzès / Avignon ----
    # Original raster coords (then scaled ×2)
    slots = {
        # top wide -> Castillon du Gard
        "castillon": (268, 545, 752, 702),
        # bottom left -> Uzès
        "uzes": (268, 706, 532, 888),
        # bottom right -> Avignon
        "avignon": (536, 706, 752, 888),
    }
    photos = {
        "castillon": Image.open(ASSETS / "photo_castillon.jpg"),
        "uzes": Image.open(ASSETS / "photo_uzes.jpg"),
        "avignon": Image.open(ASSETS / "photo_avignon.jpg"),
    }
    for key, (x0, y0, x1, y1) in slots.items():
        box = (S(x0), S(y0), S(x1), S(y1))
        tw, th = box[2] - box[0], box[3] - box[1]
        canvas.paste(cover_crop(photos[key], tw, th), (box[0], box[1]))

    # ---- Page 1: new body text in beige block ----
    # Keep heading "EIN ORT ZUM ANKOMMEN", replace body paragraphs.
    # Exact fill matches original beige so no grey card remains.
    # Cover full body column under the heading, including left margin ink.
    text_box = (S(20), S(575), S(265), S(905))
    draw.rectangle(text_box, fill=BEIGE)
    body = "Mitglied werden in unserem\nkleinen und exklusiven\nFerienverein."
    body_f = F(SANS, S(13))
    draw.multiline_text(
        (S(48), S(610)), body, fill=TEXT, font=body_f, spacing=S(6)
    )

    # ---- Right: membership block ----
    draw.rectangle((rx0 + S(28), S(30), rx0 + S(385), S(605)), fill=CREAM)
    draw.text((rx0 + S(48), S(40)), "MITGLIED WERDEN", fill=NAVY, font=F(SERIF_B, S(28)))
    intro = (
        "Werden Sie Teil einer kleinen Feriengemeinschaft\n"
        "mit maximal zehn Mitgliedschaften."
    )
    draw.multiline_text(
        (rx0 + S(48), S(78)), intro, fill=TEXT, font=F(SANS, S(11)), spacing=S(3)
    )

    items = [
        (
            0,
            "Jahresbeiträge: Einzelmitglied CHF 120.– ·\n"
            "Paare und Familien CHF 180.– · Studierende/\n"
            "Auszubildende bis 25 Jahre CHF 90.–",
        ),
        (1, "Ferienwochen Einzelmitglieder: CHF 490.–,\nzweite Woche CHF 350.–"),
        (2, "Ferienwochen Paare und Familien: CHF 640.–,\nzweite Woche CHF 450.–"),
        (1, "Ferienwochen Studierende/Auszubildende:\nCHF 390.–, zweite Woche CHF 300.–"),
        (3, "Service und Endreinigung: CHF 150.–\npro Aufenthalt"),
        (
            4,
            "Ferienhaus mit Garten · max. fünf Personen\n"
            "gleichzeitig · moderne Solaranlage",
        ),
        (
            5,
            "Faire, transparente Reservationsregelung ·\n"
            "gemeinschaftliche Nutzung und nachhaltiger Erhalt",
        ),
    ]
    icons = [
        Image.open(ASSETS / f"icon_clean_{i}.png").convert("RGBA") for i in range(7)
    ]
    icon_map = [0, 1, 2, 1, 3, 4, 5]
    y = S(125)
    icon_size = S(34)
    text_f = F(SANS, S(10))
    for idx, (_ic, text) in enumerate(items):
        icon = icons[icon_map[idx]].resize(
            (icon_size, icon_size), Image.Resampling.LANCZOS
        )
        ix = rx0 + S(48)
        canvas.paste(icon, (ix, y), icon)
        draw.multiline_text(
            (ix + icon_size + S(10), y + S(1)),
            text,
            fill=TEXT,
            font=text_f,
            spacing=S(2),
        )
        bbox = draw.multiline_textbbox((0, 0), text, font=text_f, spacing=S(2))
        y += max(icon_size, bbox[3] - bbox[1]) + S(9)

    y += S(2)
    draw.line(
        [(rx0 + S(48), y), (rx0 + S(360), y)], fill=(190, 175, 155), width=1
    )
    y += S(8)
    draw.multiline_text(
        (rx0 + S(48), y),
        "Die Nutzung erfolgt nach einem fairen und\ntransparenten Reservationssystem.",
        fill=TEXT,
        font=F(SANS, S(9)),
        spacing=S(2),
    )

    # ---- Right CTA + QR ----
    draw.rectangle(
        (rx0 + S(20), S(855), rx0 + S(250), S(1005)), fill=NAVY_FOOTER
    )
    draw.text(
        (rx0 + S(32), S(868)),
        "JETZT MITGLIEDSCHAFT",
        fill=WHITE,
        font=F(SANS_B, S(12)),
    )
    draw.text(
        (rx0 + S(32), S(888)), "ANFRAGEN.", fill=WHITE, font=F(SANS_B, S(12))
    )
    draw.multiline_text(
        (rx0 + S(32), S(915)),
        "QR-Code scannen für den\nBeitrittsantrag 2027.",
        fill=WHITE,
        font=F(SANS, S(9)),
        spacing=S(2),
    )
    qr = Image.open(ASSETS / "qr_beitritt.png").convert("RGB").resize(
        (S(68), S(68)), Image.Resampling.LANCZOS
    )
    qx, qy = rx0 + S(168), S(918)
    pad = S(3)
    draw.rectangle(
        (qx - pad, qy - pad, qx + S(68) + pad, qy + S(68) + pad), fill=WHITE
    )
    canvas.paste(qr, (qx, qy))

    # ---- Contact: Nora Jeker / njeker@studiojeker.ch ----
    # Right-page coords from OCR on original: name ~ (307,910), email ~ (307,973)
    name_box = (rx0 + S(300), S(905), rx0 + S(470), S(928))
    email_box = (rx0 + S(300), S(968), rx0 + S(520), S(992))
    draw.rectangle(name_box, fill=CONTACT_BG)
    draw.rectangle(email_box, fill=CONTACT_BG)
    contact_f = F(SANS, S(11))
    draw.text((rx0 + S(307), S(908)), "Nora Jeker", fill=TEXT, font=contact_f)
    draw.text(
        (rx0 + S(307), S(972)),
        "njeker@studiojeker.ch",
        fill=TEXT,
        font=contact_f,
    )

    # ---- Left subtitle ----
    draw.rectangle((S(90), S(494), S(680), S(522)), fill=BANNER)
    sub = "— EIN EXKLUSIVES FERIENHAUS IN CASTILLON-DU-GARD —"
    sub_f = F(SANS, S(9))
    bbox = draw.textbbox((0, 0), sub, font=sub_f)
    draw.text(
        (S(384) - (bbox[2] - bbox[0]) // 2, S(500)), sub, fill=WHITE, font=sub_f
    )

    # ---- Left: bis 5 Personen ----
    src = canvas.crop((S(230), S(955), S(270), S(978)))
    for x in range(S(158), S(248), src.width):
        for yy in range(S(955), S(978), src.height):
            canvas.paste(src, (x, yy))
    draw.text((S(165), S(961)), "bis 5 Personen", fill=NAVY, font=F(SANS, S(8)))

    canvas.save(OUT / "flyer_2027_spread_2x.png")
    left = canvas.crop((0, 0, S(768), S(1024)))
    right = canvas.crop((S(768), 0, S(1536), S(1024)))
    left.save(OUT / "preview-2027-left.png")
    right.save(OUT / "preview-2027-right.png")

    # Screen-sized artifacts
    artifacts = Path("/opt/cursor/artifacts")
    left.resize((768, 1024), Image.Resampling.LANCZOS).save(
        artifacts / "preview-2027-left.png", optimize=True
    )
    right.resize((768, 1024), Image.Resampling.LANCZOS).save(
        artifacts / "preview-2027-right.png", optimize=True
    )
    canvas.resize((1536, 1024), Image.Resampling.LANCZOS).save(
        artifacts / "preview-2027-spread.png", optimize=True
    )

    pdf_path = OUT / "Maison_St_Christol_Mitgliederflyer_2027_VORSCHAU.pdf"
    c = pdfcanvas.Canvas(str(pdf_path), pagesize=A5)
    c.drawImage(ImageReader(left), 0, 0, width=A5[0], height=A5[1])
    c.showPage()
    c.drawImage(ImageReader(right), 0, 0, width=A5[0], height=A5[1])
    c.save()
    # also copy to artifacts
    import shutil

    shutil.copy(pdf_path, artifacts / pdf_path.name)
    print(f"Wrote {pdf_path}")


if __name__ == "__main__":
    build()
