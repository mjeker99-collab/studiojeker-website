#!/usr/bin/env python3
"""Build Maison St. Christol Mitgliederflyer 2027 (Korrekturrunde 2).

Preserves layout, photos, logo, colours and copy. Improves typography,
spacing, alignment and readability only. Preview + screen PDF only —
print PDF is created after Freigabe.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A5
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
IMP_FILL = (240, 232, 220)

SERIF_B = "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

QR_URL = "https://drive.google.com/file/d/1ftThD_Gp_4nI6ul683AN46paZ7J0FTVx/view"

# 1× raster ≈ 131.8 dpi on A5 → 2× canvas ≈ 263.6 dpi.
PT_PER_PX = 263.6 / 72.0


def F(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def PT(pt: float) -> int:
    """Font size in 2×-canvas pixels for approximate print points."""
    return max(1, int(round(pt * PT_PER_PX)))


def cover_crop(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert("RGB")
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale + 0.5), int(im.height * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def wrap_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
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
    return lines


def wrap_draw(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    spacing: int,
) -> int:
    x, y = xy
    for line in wrap_lines(draw, text, font, max_width):
        draw.text((x, y), line, fill=fill, font=font)
        y += draw.textbbox((0, 0), line, font=font)[3] + spacing
    return y


def build(*, write_print_pdf: bool = False) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    base = Image.open(ASSETS / "original_flyer_raster.png").convert("RGB")
    canvas = base.resize((3072, 2048), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(canvas)
    S = lambda v: int(v * 2)
    rx0 = S(768)

    # Preserve logo art only (arch starts ~x 530 on the right page).
    logo_box = (rx0 + S(520), S(848), rx0 + S(768), S(1024))
    logo_preserve = canvas.crop(logo_box).copy()

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

    # ---- Page 1 body under «EIN ORT ZUM ANKOMMEN» ----
    # Use left free area; stay clear of photo column (x≥268).
    text_box = (S(16), S(575), S(262), S(905))
    draw.rectangle(text_box, fill=BEIGE)

    body_f = F(SANS, PT(9.5))
    body_lead = max(1, PT(1.0))
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
    tx = S(20)
    max_body_w = S(240)
    y = S(578)
    y = wrap_draw(draw, p1, (tx, y), body_f, TEXT, max_body_w, body_lead)
    y += S(8)
    y = wrap_draw(draw, p2, (tx, y), body_f, TEXT, max_body_w, body_lead)

    # Pont under body only — never cover text.
    pont_gap = S(8)
    pont_bottom = S(888)
    pont_top = y + pont_gap
    min_pont = S(48)
    if pont_bottom - pont_top >= min_pont:
        pont_box = (S(22), pont_top, S(256), pont_bottom)
        pw, ph = pont_box[2] - pont_box[0], pont_box[3] - pont_box[1]
        pont = cover_crop(Image.open(ASSETS / "photo_pont_du_gard.jpg"), pw, ph)
        canvas.paste(pont, (pont_box[0], pont_box[1]))
    else:
        # Body used most of the column; keep a thin photo strip if possible.
        pont_top = max(y + S(4), pont_bottom - min_pont)
        if pont_top < pont_bottom - S(20):
            pont_box = (S(22), pont_top, S(256), pont_bottom)
            pw, ph = pont_box[2] - pont_box[0], pont_box[3] - pont_box[1]
            pont = cover_crop(Image.open(ASSETS / "photo_pont_du_gard.jpg"), pw, ph)
            canvas.paste(pont, (pont_box[0], pont_box[1]))

    # ---- Page 1 subtitle ----
    draw.rectangle((S(90), S(494), S(680), S(522)), fill=BANNER)
    sub = "— EIN EXKLUSIVES FERIENHAUS IN CASTILLON-DU-GARD —"
    sub_f = F(SANS, PT(9.2))
    bbox = draw.textbbox((0, 0), sub, font=sub_f)
    draw.text(
        (S(384) - (bbox[2] - bbox[0]) // 2, S(499)), sub, fill=WHITE, font=sub_f
    )

    # ---- DAS HAUS labels: ≥9 pt, two-line where needed, no overlap ----
    footer_white = (252, 252, 250)
    draw.rectangle((S(145), S(948), S(760), S(1020)), fill=footer_white)
    lab_f = F(SANS, PT(9.0))
    footer_labels = [
        (186, ["bis 5", "Personen"]),
        (295, ["ca. 100 m²", "Wohnfläche"]),
        (405, ["Naturstein-", "haus"]),
        (510, ["grosser", "Garten"]),
        (610, ["Solar-", "anlage"]),
        (705, ["15 Min.", "zu Fuss", "ins Dorf"]),
    ]
    line_gap = max(1, PT(0.6))
    for cx, lines in footer_labels:
        heights = [draw.textbbox((0, 0), ln, font=lab_f)[3] for ln in lines]
        block_h = sum(heights) + line_gap * (len(lines) - 1)
        ty = S(954) + max(0, (S(52) - block_h) // 2)
        for ln, lh in zip(lines, heights):
            lb = draw.textbbox((0, 0), ln, font=lab_f)
            draw.text((S(cx) - (lb[2] - lb[0]) // 2, ty), ln, fill=NAVY, font=lab_f)
            ty += lh + line_gap

    # ---- Membership block (≥9 pt, fill cream whitespace) ----
    member_bottom = S(612)
    draw.rectangle((rx0 + S(28), S(28), rx0 + S(388), member_bottom), fill=CREAM)
    title_f = F(SERIF_B, PT(18))
    draw.text((rx0 + S(46), S(30)), "MITGLIED WERDEN", fill=NAVY, font=title_f)

    intro_f = F(SANS, PT(9.0))
    intro_lead = max(1, PT(0.7))
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
    y = S(30) + draw.textbbox((0, 0), "MITGLIED WERDEN", font=title_f)[3] + S(6)
    y = wrap_draw(draw, intro1, (rx0 + S(46), y), intro_f, TEXT, S(328), intro_lead)
    y += S(6)
    y = wrap_draw(draw, intro2, (rx0 + S(46), y), intro_f, TEXT, S(328), intro_lead)
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
    icon_size = S(22)
    text_f = F(SANS, PT(9.0))
    item_lead = max(1, PT(0.55))
    item_gap = S(3)
    for idx, (_ic, text) in enumerate(items):
        ic = icon_map[idx]
        icon = icons[ic].resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        ix = rx0 + S(44)
        canvas.paste(icon, (ix, y), icon)
        lines = wrap_lines(draw, text, text_f, S(300))
        ty = y
        for line in lines:
            draw.text((ix + icon_size + S(8), ty), line, fill=TEXT, font=text_f)
            ty += draw.textbbox((0, 0), line, font=text_f)[3] + item_lead
        y = max(y + icon_size, ty) + item_gap

    y += S(2)
    draw.line(
        [(rx0 + S(46), y), (rx0 + S(365), y)], fill=(190, 175, 155), width=1
    )
    y += S(5)
    wrap_draw(
        draw,
        "Die Nutzung erfolgt nach einem fairen und transparenten Reservationssystem.",
        (rx0 + S(46), y),
        F(SANS, PT(9.0)),
        TEXT,
        S(328),
        item_lead,
    )

    # ---- Impressionen: ≥9 pt; photos stay put; cream band may cover photo tops ----
    disc = (
        "Der berühmte Pont du Gard, Uzès mit seinem Wochenmarkt, "
        "die Weinregionen der Côtes du Rhône sowie Avignon und Nîmes "
        "liegen in der Umgebung – mediterranes Lebensgefühl vor der Haustür."
    )
    imp_title_f = F(SERIF_B, PT(12))
    imp_sub_f = F(SANS_B, PT(9.5))
    imp_body_f = F(SANS, PT(9.5))
    imp_lead = max(1, PT(1.0))
    # Place readable band above footer; photos stay at original coords underneath.
    imp_top = member_bottom
    needed = S(6)
    needed += draw.textbbox((0, 0), "IMPRESSIONEN", font=imp_title_f)[3] + S(3)
    needed += (
        draw.textbbox((0, 0), "Südfrankreich entdecken", font=imp_sub_f)[3] + S(4)
    )
    for line in wrap_lines(draw, disc, imp_body_f, S(320)):
        needed += draw.textbbox((0, 0), line, font=imp_body_f)[3] + imp_lead
    needed += S(6)
    imp_bottom = min(imp_top + needed, S(848))
    draw.rectangle(
        (rx0 + S(36), imp_top, rx0 + S(380), imp_bottom), fill=IMP_FILL
    )
    iy = imp_top + S(5)
    draw.text((rx0 + S(46), iy), "IMPRESSIONEN", fill=NAVY, font=imp_title_f)
    iy += draw.textbbox((0, 0), "IMPRESSIONEN", font=imp_title_f)[3] + S(3)
    draw.text((rx0 + S(46), iy), "Südfrankreich entdecken", fill=NAVY, font=imp_sub_f)
    iy += draw.textbbox((0, 0), "Südfrankreich entdecken", font=imp_sub_f)[3] + S(4)
    wrap_draw(
        draw, disc, (rx0 + S(46), iy), imp_body_f, TEXT, S(320), imp_lead
    )

    # ---- Footer: CTA, contact, logo (clean, no overlap) ----
    draw.rectangle(
        (rx0 + S(20), S(855), rx0 + S(768), S(1024)), fill=CONTACT_BG
    )

    # CTA block — keep clear of contact icons (~x 262).
    cta_f = F(SANS_B, PT(9.2))
    cta_right = rx0 + S(242)
    draw.rectangle(
        (rx0 + S(20), S(855), cta_right, S(1005)), fill=NAVY_FOOTER
    )
    draw.text((rx0 + S(28), S(864)), "JETZT", fill=WHITE, font=cta_f)
    draw.text((rx0 + S(28), S(882)), "MITGLIEDSCHAFT", fill=WHITE, font=cta_f)
    draw.text((rx0 + S(28), S(900)), "ANFRAGEN!", fill=WHITE, font=cta_f)
    draw.multiline_text(
        (rx0 + S(28), S(922)),
        "Sichern Sie sich Ihren\nPlatz an der Sonne.",
        fill=WHITE,
        font=F(SANS, PT(9.0)),
        spacing=S(2),
    )
    qr_size = S(50)
    qr = Image.open(ASSETS / "qr_beitritt.png").convert("RGB").resize(
        (qr_size, qr_size), Image.Resampling.LANCZOS
    )
    qx = cta_right - qr_size - S(8)
    qy = S(942)
    pad = S(2)
    draw.rectangle(
        (qx - pad, qy - pad, qx + qr_size + pad, qy + qr_size + pad), fill=WHITE
    )
    canvas.paste(qr, (qx, qy))

    # Contact icons from original (person / phone / envelope).
    base_2x = base.resize((3072, 2048), Image.Resampling.LANCZOS)
    icon_x0, icon_x1 = S(270), S(298)
    for src_y, dst_y in [(900, 900), (935, 936), (968, 968)]:
        ic = base_2x.crop(
            (rx0 + icon_x0, S(src_y), rx0 + icon_x1, S(src_y) + S(26))
        )
        canvas.paste(ic, (rx0 + S(250), S(dst_y)))

    # Contact copy — ends before logo art (~x 520).
    contact_f = F(SANS, PT(10))
    tx = rx0 + S(286)
    draw.text((tx, S(904)), "Nora Jeker", fill=TEXT, font=contact_f)
    draw.text((tx, S(940)), "079 209 09 06", fill=TEXT, font=contact_f)
    draw.text((tx, S(976)), "njeker@studiojeker.ch", fill=TEXT, font=contact_f)

    # Logo: only dark navy ink (strict mask), original size, nudged up.
    logo_arr = np.array(logo_preserve)
    ink = (
        (logo_arr[:, :, 2].astype(int) > logo_arr[:, :, 0].astype(int) + 15)
        & (logo_arr[:, :, 0] < 120)
    ) | (
        (logo_arr.min(axis=2) < 90)
        & (logo_arr.max(axis=2) < 160)
    )
    alpha = ink.astype("uint8") * 255
    # Soften mask edges slightly
    logo_rgba = Image.fromarray(logo_arr).convert("RGBA")
    logo_rgba.putalpha(Image.fromarray(alpha, mode="L"))
    canvas.paste(logo_rgba, (logo_box[0], logo_box[1] - 18), logo_rgba)

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

    # Vorher/Nachher against Korrekturrunde-2 baseline
    before_l = ARTIFACTS / "before-korrektur2-left.png"
    before_r = ARTIFACTS / "before-korrektur2-right.png"
    if before_l.exists() and before_r.exists():
        bl = Image.open(before_l).convert("RGB").resize((600, 800))
        al = left_screen.resize((600, 800))
        br = Image.open(before_r).convert("RGB").resize((600, 800))
        ar = right_screen.resize((600, 800))
        for name, a, b in [
            ("compare-korrektur2-left-before-after.png", bl, al),
            ("compare-korrektur2-right-before-after.png", br, ar),
        ]:
            comp = Image.new("RGB", (1220, 800), (255, 255, 255))
            comp.paste(a, (0, 0))
            comp.paste(b, (620, 0))
            d = ImageDraw.Draw(comp)
            d.text((10, 10), "Vorher", fill=NAVY, font=F(SANS_B, 18))
            d.text((630, 10), "Nachher", fill=NAVY, font=F(SANS_B, 18))
            comp.save(ARTIFACTS / name, optimize=True)

    # Print-size readability check: scale page to physical A5 at 96 dpi (~794 px tall)
    print_h = int(round(210 / 25.4 * 96))
    print_w = int(round(148 / 25.4 * 96))
    left_print_view = left_screen.resize((print_w, print_h), Image.Resampling.LANCZOS)
    right_print_view = right_screen.resize((print_w, print_h), Image.Resampling.LANCZOS)
    left_print_view.save(ARTIFACTS / "printsize-check-left.png", optimize=True)
    right_print_view.save(ARTIFACTS / "printsize-check-right.png", optimize=True)
    # Detail crops at print size (body / tariffs / Impressionen / footer)
    left_print_view.crop((0, int(print_h * 0.52), int(print_w * 0.38), int(print_h * 0.88))).save(
        ARTIFACTS / "printsize-detail-page1-body.png", optimize=True
    )
    right_print_view.crop((0, int(print_h * 0.05), int(print_w * 0.55), int(print_h * 0.58))).save(
        ARTIFACTS / "printsize-detail-member.png", optimize=True
    )
    right_print_view.crop((0, int(print_h * 0.58), int(print_w * 0.55), int(print_h * 0.82))).save(
        ARTIFACTS / "printsize-detail-impressions.png", optimize=True
    )
    right_print_view.crop((0, int(print_h * 0.82), print_w, print_h)).save(
        ARTIFACTS / "printsize-detail-footer.png", optimize=True
    )

    # Screen PDF (trim size A5) — Vorschau only
    screen_pdf = OUT / "Maison_St_Christol_Mitgliederflyer_2027_VORSCHAU.pdf"
    c = pdfcanvas.Canvas(str(screen_pdf), pagesize=A5)
    c.drawImage(ImageReader(left), 0, 0, width=A5[0], height=A5[1])
    c.showPage()
    c.drawImage(ImageReader(right), 0, 0, width=A5[0], height=A5[1])
    c.save()
    shutil.copy(screen_pdf, ARTIFACTS / screen_pdf.name)

    if write_print_pdf:
        from reportlab.lib.units import mm

        bleed = 3 * mm
        page_w = A5[0] + 2 * bleed
        page_h = A5[1] + 2 * bleed
        print_w_px = int(((148 + 6) / 25.4) * 300)
        print_h_px = int(((210 + 6) / 25.4) * 300)
        left_print = left.resize((print_w_px, print_h_px), Image.Resampling.LANCZOS)
        right_print = right.resize((print_w_px, print_h_px), Image.Resampling.LANCZOS)
        print_pdf = OUT / "Maison_St_Christol_Mitgliederflyer_2027_DRUCK_3mm.pdf"
        c = pdfcanvas.Canvas(str(print_pdf), pagesize=(page_w, page_h))
        c.drawImage(ImageReader(left_print), 0, 0, width=page_w, height=page_h)
        c.showPage()
        c.drawImage(ImageReader(right_print), 0, 0, width=page_w, height=page_h)
        c.save()
        shutil.copy(print_pdf, ARTIFACTS / print_pdf.name)
        print(f"Wrote {print_pdf}")
    else:
        print("Print PDF skipped (awaiting Freigabe).")

    print(f"QR target: {QR_URL}")
    print(f"Wrote {screen_pdf}")
    print(
        f"Font px@2x: body={PT(9.5)} labels={PT(9.0)} "
        f"member={PT(9.0)} impress={PT(9.5)} (~9pt+)"
    )


if __name__ == "__main__":
    build(write_print_pdf=False)
