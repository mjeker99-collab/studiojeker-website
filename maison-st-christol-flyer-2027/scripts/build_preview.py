#!/usr/bin/env python3
"""Build Maison St. Christol Mitgliederflyer 2027.

Preserves the approved layout; updates copy, fixes footer labels,
keeps photos/logo. Does not overwrite the original PDF.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "out"
ARTIFACTS = Path("/opt/cursor/artifacts")

NAVY = (8, 40, 68)
NAVY_FOOTER = (14, 43, 70)
TEXT = (35, 40, 45)
CREAM = (248, 247, 245)
BEIGE = (246, 242, 237)
WHITE = (255, 255, 255)
BANNER = (17, 47, 72)
CONTACT_BG = (245, 240, 232)
FOOTER_BG = (248, 248, 246)

SERIF = "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Regular.otf"
SERIF_B = "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

QR_URL = "https://drive.google.com/file/d/1ftThD_Gp_4nI6ul683AN46paZ7J0FTVx/view"


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


def wrap_draw(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    spacing: int,
) -> int:
    """Word-wrap text; return bottom y after drawing."""
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textbbox((0, 0), trial, font=font)[2] <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    x, y = xy
    for line in lines:
        draw.text((x, y), line, fill=fill, font=font)
        y += draw.textbbox((0, 0), line, font=font)[3] + spacing
    return y


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    base = Image.open(ASSETS / "original_flyer_raster.png").convert("RGB")
    canvas = base.resize((3072, 2048), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(canvas)
    S = lambda v: int(v * 2)
    rx0 = S(768)

    # ---- Page 1 photos (approved selection) ----
    slots = {
        "castillon": (268, 545, 752, 702),
        "uzes": (268, 706, 532, 888),
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

    # ---- Page 1: «Ein Ort zum Ankommen» body + Pont du Gard ----
    text_box = (S(20), S(575), S(265), S(905))
    draw.rectangle(text_box, fill=BEIGE)

    # Keep heading from original raster (above y~575). Body starts below.
    body_f = F(SANS, S(9))
    p1 = (
        "Ein kleines Paradies im Süden Frankreichs. "
        "Umgeben von Weinbergen, Olivenbäumen und historischen Dörfern "
        "erwartet Sie ein charmantes Natursteinhaus mit viel Privatsphäre."
    )
    p2 = (
        "Ob entspannte Ferientage, kulinarische Entdeckungen oder Ausflüge "
        "in die Provence – Maison St. Christol ist ein Ort zum Ankommen, "
        "Geniessen und Wiederkommen."
    )
    y = S(582)
    y = wrap_draw(draw, p1, (S(40), y), body_f, TEXT, S(215), S(2))
    y += S(6)
    y = wrap_draw(draw, p2, (S(40), y), body_f, TEXT, S(215), S(2))

    # Pont du Gard under body text, aligned with bottom of photo grid
    pont_top = min(max(y + S(8), S(760)), S(800))
    pont_box = (S(40), pont_top, S(255), S(888))
    pw, ph = pont_box[2] - pont_box[0], pont_box[3] - pont_box[1]
    if ph > S(40):
        pont = cover_crop(Image.open(ASSETS / "photo_pont_du_gard.jpg"), pw, ph)
        canvas.paste(pont, (pont_box[0], pont_box[1]))

    # ---- Page 1 subtitle (Castillon-du-Gard) ----
    draw.rectangle((S(90), S(494), S(680), S(522)), fill=BANNER)
    sub = "— EIN EXKLUSIVES FERIENHAUS IN CASTILLON-DU-GARD —"
    sub_f = F(SANS, S(9))
    bbox = draw.textbbox((0, 0), sub, font=sub_f)
    draw.text(
        (S(384) - (bbox[2] - bbox[0]) // 2, S(500)), sub, fill=WHITE, font=sub_f
    )

    # ---- Page 1 footer labels: redraw clean row (icons kept from original) ----
    footer_white = (252, 252, 250)
    # Clear label band under icons only (icons sit above ~y 950).
    draw.rectangle((S(145), S(952), S(760), S(1020)), fill=footer_white)
    lab_f = F(SANS, S(8))
    # Icon centers (original raster x) with label lines under each
    footer_labels = [
        (186, ["bis 5 Personen"]),
        (295, ["ca. 100 m²", "Wohnfläche"]),
        (405, ["Natursteinhaus"]),
        (510, ["grosser Garten"]),
        (610, ["Solaranlage"]),
        (700, ["15 Min.", "zu Fuss ins Dorf"]),
    ]
    for cx, lines in footer_labels:
        ty = S(958)
        for line in lines:
            lb = draw.textbbox((0, 0), line, font=lab_f)
            lw = lb[2] - lb[0]
            draw.text((S(cx) - lw // 2, ty), line, fill=NAVY, font=lab_f)
            ty += lb[3] - lb[1] + S(1)

    # ---- Right: membership block ----
    draw.rectangle((rx0 + S(28), S(28), rx0 + S(385), S(605)), fill=CREAM)
    draw.text(
        (rx0 + S(48), S(36)),
        "MITGLIED WERDEN",
        fill=NAVY,
        font=F(SERIF_B, S(26)),
    )

    intro_f = F(SANS, S(9))
    intro1 = (
        "Ein Ferienhaus in Südfrankreich, das sich fast wie das eigene anfühlt "
        "– ohne die Verpflichtungen eines eigenen Ferienhauses."
    )
    intro2 = (
        "Unser Verein ermöglicht einem kleinen Kreis von maximal zehn "
        "Mitgliedschaften die gemeinsame Nutzung dieses besonderen Hauses "
        "zu fairen Konditionen. Die Beiträge dienen der Deckung der laufenden "
        "Kosten und dem langfristigen Erhalt des Hauses."
    )
    y = S(70)
    y = wrap_draw(draw, intro1, (rx0 + S(48), y), intro_f, TEXT, S(320), S(1))
    y += S(5)
    y = wrap_draw(draw, intro2, (rx0 + S(48), y), intro_f, TEXT, S(320), S(1))
    y += S(8)

    items = [
        (
            0,
            "Jahresbeiträge 2027: Einzelmitglied CHF 120.– · "
            "Paare und Familien CHF 180.– · Studierende/"
            "Auszubildende bis 25 Jahre CHF 90.–",
        ),
        (
            1,
            "Ferienwochen Einzelmitglieder: CHF 490.–, "
            "zweite aufeinanderfolgende Woche CHF 350.–",
        ),
        (
            2,
            "Ferienwochen Paare/Familien: CHF 640.–, "
            "zweite aufeinanderfolgende Woche CHF 450.–",
        ),
        (
            1,
            "Ferienwochen Studierende/Auszubildende: CHF 390.–, "
            "zweite aufeinanderfolgende Woche CHF 300.–",
        ),
        (3, "Service und Endreinigung: CHF 150.– pro Aufenthalt."),
        (5, "Die Ferienwochen sind nicht im Jahresbeitrag enthalten."),
    ]
    icons = [
        Image.open(ASSETS / f"icon_clean_{i}.png").convert("RGBA") for i in range(7)
    ]
    icon_map = [0, 1, 2, 1, 3, 5]
    icon_size = S(28)
    text_f = F(SANS, S(8))
    for idx, (_ic, text) in enumerate(items):
        ic = icon_map[idx]
        icon = icons[ic].resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        ix = rx0 + S(48)
        canvas.paste(icon, (ix, y), icon)
        # wrap item text beside icon
        words = text.split()
        lines: list[str] = []
        cur = ""
        max_w = S(285)
        for w in words:
            trial = f"{cur} {w}".strip()
            if draw.textbbox((0, 0), trial, font=text_f)[2] <= max_w:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        ty = y + S(1)
        for line in lines:
            draw.text((ix + icon_size + S(8), ty), line, fill=TEXT, font=text_f)
            ty += draw.textbbox((0, 0), line, font=text_f)[3] + S(1)
        y = max(y + icon_size, ty) + S(5)

    y += S(2)
    draw.line(
        [(rx0 + S(48), y), (rx0 + S(360), y)], fill=(190, 175, 155), width=1
    )
    y += S(6)
    note_f = F(SANS, S(8))
    wrap_draw(
        draw,
        "Die Nutzung erfolgt nach einem fairen und transparenten Reservationssystem.",
        (rx0 + S(48), y),
        note_f,
        TEXT,
        S(320),
        S(1),
    )

    # ---- Impressionen: «Südfrankreich entdecken» above photos (photos untouched) ----
    # Original photos start ~ y 680; use only the free title strip above.
    imp_fill = (240, 232, 220)
    draw.rectangle((rx0 + S(40), S(612), rx0 + S(375), S(678)), fill=imp_fill)
    draw.text(
        (rx0 + S(48), S(614)),
        "IMPRESSIONEN",
        fill=NAVY,
        font=F(SERIF_B, S(13)),
    )
    draw.text(
        (rx0 + S(48), S(634)),
        "Südfrankreich entdecken",
        fill=NAVY,
        font=F(SANS_B, S(8)),
    )
    # Gently shortened to fit without moving/shrinking photos
    disc = (
        "Der berühmte Pont du Gard, Uzès mit seinem Wochenmarkt, "
        "die Weinregionen der Côtes du Rhône sowie Avignon und Nîmes "
        "liegen in der Umgebung – mediterranes Lebensgefühl vor der Haustür."
    )
    wrap_draw(
        draw,
        disc,
        (rx0 + S(48), S(648)),
        F(SANS, S(7)),
        TEXT,
        S(315),
        S(1),
    )

    # ---- CTA + QR ----
    draw.rectangle(
        (rx0 + S(20), S(855), rx0 + S(250), S(1005)), fill=NAVY_FOOTER
    )
    draw.text(
        (rx0 + S(30), S(868)),
        "JETZT MITGLIEDSCHAFT",
        fill=WHITE,
        font=F(SANS_B, S(11)),
    )
    draw.text(
        (rx0 + S(30), S(886)), "ANFRAGEN!", fill=WHITE, font=F(SANS_B, S(11))
    )
    draw.multiline_text(
        (rx0 + S(30), S(910)),
        "Sichern Sie sich Ihren\nPlatz an der Sonne.",
        fill=WHITE,
        font=F(SANS, S(8)),
        spacing=S(2),
    )
    qr = Image.open(ASSETS / "qr_beitritt.png").convert("RGB").resize(
        (S(64), S(64)), Image.Resampling.LANCZOS
    )
    qx, qy = rx0 + S(172), S(922)
    pad = S(3)
    draw.rectangle(
        (qx - pad, qy - pad, qx + S(64) + pad, qy + S(64) + pad), fill=WHITE
    )
    canvas.paste(qr, (qx, qy))

    # ---- Contact Nora ----
    name_box = (rx0 + S(300), S(905), rx0 + S(470), S(928))
    email_box = (rx0 + S(300), S(968), rx0 + S(530), S(992))
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

    # ---- Outputs ----
    canvas.save(OUT / "flyer_2027_spread_2x.png")
    left = canvas.crop((0, 0, S(768), S(1024)))
    right = canvas.crop((S(768), 0, S(1536), S(1024)))
    left.save(OUT / "preview-2027-left.png")
    right.save(OUT / "preview-2027-right.png")

    left_screen = left.resize((768, 1024), Image.Resampling.LANCZOS)
    right_screen = right.resize((768, 1024), Image.Resampling.LANCZOS)
    left_screen.save(ARTIFACTS / "preview-2027-left.png", optimize=True)
    right_screen.save(ARTIFACTS / "preview-2027-right.png", optimize=True)
    canvas.resize((1536, 1024), Image.Resampling.LANCZOS).save(
        ARTIFACTS / "preview-2027-spread.png", optimize=True
    )

    # Comparison strip (before | after) if before exists
    before_l = ARTIFACTS / "before-final-left.png"
    before_r = ARTIFACTS / "before-final-right.png"
    if before_l.exists() and before_r.exists():
        bl = Image.open(before_l).convert("RGB").resize((600, 800))
        al = left_screen.resize((600, 800))
        br = Image.open(before_r).convert("RGB").resize((600, 800))
        ar = right_screen.resize((600, 800))
        for name, a, b in [
            ("compare-left-before-after.png", bl, al),
            ("compare-right-before-after.png", br, ar),
        ]:
            comp = Image.new("RGB", (1220, 800), (255, 255, 255))
            comp.paste(a, (0, 0))
            comp.paste(b, (620, 0))
            d = ImageDraw.Draw(comp)
            d.text((10, 10), "Vorher", fill=NAVY, font=F(SANS_B, 18))
            d.text((630, 10), "Nachher", fill=NAVY, font=F(SANS_B, 18))
            comp.save(ARTIFACTS / name, optimize=True)

    # Screen PDF (trim size A5, no bleed)
    screen_pdf = OUT / "Maison_St_Christol_Mitgliederflyer_2027_VORSCHAU.pdf"
    c = pdfcanvas.Canvas(str(screen_pdf), pagesize=A5)
    c.drawImage(ImageReader(left), 0, 0, width=A5[0], height=A5[1])
    c.showPage()
    c.drawImage(ImageReader(right), 0, 0, width=A5[0], height=A5[1])
    c.save()
    shutil.copy(screen_pdf, ARTIFACTS / screen_pdf.name)

    # Print PDF: A5 + 3 mm bleed, 300 dpi
    bleed = 3 * mm
    page_w = A5[0] + 2 * bleed
    page_h = A5[1] + 2 * bleed
    # Upscale pages to ~300 dpi for print
    # A5+bleed mm → inches → *300
    print_w = int(((148 + 6) / 25.4) * 300)
    print_h = int(((210 + 6) / 25.4) * 300)
    left_print = left.resize((print_w, print_h), Image.Resampling.LANCZOS)
    right_print = right.resize((print_w, print_h), Image.Resampling.LANCZOS)
    print_pdf = OUT / "Maison_St_Christol_Mitgliederflyer_2027_DRUCK_3mm.pdf"
    c = pdfcanvas.Canvas(str(print_pdf), pagesize=(page_w, page_h))
    c.drawImage(ImageReader(left_print), 0, 0, width=page_w, height=page_h)
    c.showPage()
    c.drawImage(ImageReader(right_print), 0, 0, width=page_w, height=page_h)
    c.save()
    shutil.copy(print_pdf, ARTIFACTS / print_pdf.name)

    print(f"QR target: {QR_URL}")
    print(f"Wrote {screen_pdf}")
    print(f"Wrote {print_pdf}")
    print(f"Print raster: {print_w}x{print_h} px (~300 dpi with 3 mm bleed)")


if __name__ == "__main__":
    build()
