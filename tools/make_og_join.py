"""Draws assets/og-join.png, the 1200x630 link preview for dermaa.app/join.

Deterministic: same fonts in, same PNG out. Sage is drawn from the same
geometry as assets/sage.js (itself a port of the app's SagePainter), in the
"wave" pose: grinning eyes, blush, the gold sparkle at the shoulder.

    python tools/make_og_join.py --fonts D:/flutterconfig/dermaa/dermaa/assets/fonts

Needs Pillow. The fonts are the app's bundled static DM Sans and Lora (OFL).
"""
import argparse
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
SS = 2  # supersample, then scale down for smooth edges

CREAM = (245, 240, 235)
INK = (45, 59, 40)
TEXT = (58, 66, 52)
SOFT = (102, 112, 96)
SAGE = (122, 155, 104)
SAGE_STRONG = (95, 125, 80)
SAGE_TINT = (232, 239, 227)
GOLD = (196, 145, 74)
GOLD_TINT = (245, 235, 224)
ROSE = (184, 92, 92)
BORDER = (206, 200, 191)
WHITE = (255, 255, 255)


def quad(p0, p1, p2, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        pts.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    return pts


def sparkle(cx, cy, r):
    k = 0.16
    pts = []
    pts += quad((cx, cy - r), (cx + r * k, cy - r * k), (cx + r, cy))
    pts += quad((cx + r, cy), (cx + r * k, cy + r * k), (cx, cy + r))
    pts += quad((cx, cy + r), (cx - r * k, cy + r * k), (cx - r, cy))
    pts += quad((cx - r, cy), (cx - r * k, cy - r * k), (cx, cy - r))
    return pts


def leaf(cx, cy, length, angle):
    """A single leaf: two quadratic curves meeting at the tips."""
    ca, sa = math.cos(angle), math.sin(angle)

    def rot(x, y):
        return (cx + x * ca - y * sa, cy + x * sa + y * ca)

    s = length / 2
    pts = quad(rot(0, -s), rot(s * 0.75, 0), rot(0, s)) + quad(rot(0, s), rot(-s * 0.75, 0), rot(0, -s))
    return pts


def draw_sage(img, x0, y0, s):
    """Sage in a box of side s at (x0, y0), following SagePainter.paint."""
    b = s * 0.80
    ox, oy = x0 + (s - b) / 2, y0 + s * 0.12

    def p(x, y):
        return (ox + x * b, oy + y * b)

    # Halo
    halo = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hx, hy, hr = x0 + s / 2, oy + b * 0.40, b * 0.50
    hd.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=SAGE + (38,))
    halo = halo.filter(ImageFilter.GaussianBlur(s * 0.09))
    img.alpha_composite(halo)

    d = ImageDraw.Draw(img)
    # Tail, then the bubble over its root.
    tail = quad(p(0.30, 0.58), p(0.24, 0.80), p(0.11, 0.92)) + quad(p(0.11, 0.92), p(0.35, 0.83), p(0.55, 0.66))
    d.polygon(tail, fill=SAGE)
    d.rounded_rectangle((*p(0.06, 0.06), *p(0.94, 0.70)), radius=0.22 * b, fill=SAGE)

    # Blush
    blush = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(blush)
    for x in (0.215, 0.785):
        cx, cy = p(x, 0.475)
        bd.ellipse((cx - b * 0.065, cy - b * 0.0375, cx + b * 0.065, cy + b * 0.0375), fill=ROSE + (66,))
    img.alpha_composite(blush)

    d = ImageDraw.Draw(img)
    line = max(2, round(b * 0.042))
    rx, ry = b * 0.058, b * 0.080
    # Grinning eyes: the top half of an ellipse.
    for x in (0.355, 0.645):
        cx, cy = p(x, 0.345)
        w, h = rx * 2.5, ry * 1.7
        d.arc((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), 180, 360, fill=WHITE, width=line)
    # Smile
    w = b * 0.20
    mx, my = p(0.5, 0.515)
    my -= b * 0.035
    d.arc((mx - w / 2, my - w * 0.4, mx + w / 2, my + w * 0.4), 25.2, 154.8, fill=WHITE, width=line)

    # The AI sparkle at the shoulder.
    sx, sy = p(0.955, 0.075)
    d.polygon(sparkle(sx, sy, b * 0.13), fill=GOLD)


def spaced(d, xy, text, font, fill, spacing):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing
    return x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", default="D:/flutterconfig/dermaa/dermaa/assets/fonts")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "og-join.png"))
    args = ap.parse_args()

    def font(name, size):
        return ImageFont.truetype(os.path.join(args.fonts, name), size * SS)

    lora = font("Lora-SemiBold.ttf", 82)
    eyebrow = font("DMSans-SemiBold.ttf", 22)
    pill_bold = font("DMSans-Bold.ttf", 29)
    pill_med = font("DMSans-Medium.ttf", 27)
    url_font = font("DMSans-Bold.ttf", 28)
    btn = font("DMSans-Bold.ttf", 34)
    btn_no = font("DMSans-SemiBold.ttf", 28)

    img = Image.new("RGBA", (W * SS, H * SS), CREAM + (255,))

    # Soft glows: sage top right, gold bottom left.
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((760 * SS, -260 * SS, 1460 * SS, 440 * SS), fill=SAGE + (52,))
    gd.ellipse((-260 * SS, 380 * SS, 360 * SS, 900 * SS), fill=GOLD + (30,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(110 * SS)))

    # A few falling leaves and sparkles, like the page's celebration.
    deco = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for cx, cy, ln, ang, col, a in [
        (1110, 80, 46, 0.6, SAGE, 120), (700, 70, 30, -0.5, GOLD, 120),
        (1150, 520, 36, 1.9, SAGE_STRONG, 100), (640, 560, 26, 2.6, ROSE, 90),
        (1040, 590, 22, -1.2, GOLD, 110),
    ]:
        dd.polygon(leaf(cx * SS, cy * SS, ln * SS, ang), fill=col + (a,))
    for cx, cy, r, col in [(760, 130, 12, GOLD), (1180, 300, 10, SAGE), (700, 470, 9, SAGE_STRONG)]:
        dd.polygon(sparkle(cx * SS, cy * SS, r * SS), fill=col + (150,))
    img.alpha_composite(deco)

    d = ImageDraw.Draw(img)
    left = 80 * SS

    spaced(d, (left, 78 * SS), "LAUNCH OFFER", eyebrow, SAGE_STRONG, 3.5 * SS)
    d.text((left, 116 * SS), "Will you join", font=lora, fill=INK)
    d.text((left, 212 * SS), "Dermaa?", font=lora, fill=SAGE_STRONG)

    def pill(y, text, fnt, fill, ink, icon_col):
        tw = d.textlength(text, font=fnt)
        h = 62 * SS
        d.rounded_rectangle((left, y, left + tw + 96 * SS, y + h), radius=20 * SS, fill=fill)
        d.polygon(sparkle(left + 34 * SS, y + h / 2, 13 * SS), fill=icon_col)
        d.text((left + 62 * SS, y + h / 2), text, font=fnt, fill=ink, anchor="lm")

    pill(338 * SS, "1 month of Premium free at launch", pill_bold, SAGE_TINT, INK, SAGE_STRONG)
    pill(414 * SS, "First 10 sign-ups get featured", pill_med, GOLD_TINT, TEXT, GOLD)

    icon_path = os.path.join(os.path.dirname(__file__), "..", "assets", "app_icon.png")
    icon = Image.open(icon_path).convert("RGBA").resize((52 * SS, 52 * SS), Image.LANCZOS)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *icon.size), radius=14 * SS, fill=255)
    img.paste(icon, (left, 530 * SS), mask)
    d.text((left + 68 * SS, 556 * SS), "dermaa.app/join", font=url_font, fill=INK, anchor="lm")

    # Sage, with the two buttons beneath.
    draw_sage(img, 780 * SS, 70 * SS, 330 * SS)
    d = ImageDraw.Draw(img)
    yx, yy, yw, yh = 764 * SS, 430 * SS, 190 * SS, 78 * SS
    d.rounded_rectangle((yx, yy, yx + yw, yy + yh), radius=yh / 2, fill=SAGE_STRONG)
    d.text((yx + yw / 2, yy + yh / 2), "Yes", font=btn, fill=WHITE, anchor="mm")

    # No, already running off.
    nw, nh = 124 * SS, 60 * SS
    no = Image.new("RGBA", (nw + 40 * SS, nh + 40 * SS), (0, 0, 0, 0))
    nd = ImageDraw.Draw(no)
    nd.rounded_rectangle((20 * SS, 20 * SS, 20 * SS + nw, 20 * SS + nh), radius=nh / 2,
                         fill=(251, 248, 244, 255), outline=BORDER, width=3 * SS)
    nd.text((20 * SS + nw / 2, 20 * SS + nh / 2), "No", font=btn_no, fill=SOFT, anchor="mm")
    no = no.rotate(14, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(no, (1012 * SS, 452 * SS))
    # Motion marks behind it.
    for i, (dx, dy) in enumerate([(0, 0), (6, 22), (2, 44)]):
        x = (996 + dx) * SS
        y = (478 + dy) * SS
        d.line((x - (34 - i * 8) * SS, y, x - 8 * SS, y), fill=BORDER, width=4 * SS)

    out = img.resize((W, H), Image.LANCZOS).convert("RGB")
    out.save(os.path.abspath(args.out), optimize=True)
    print("wrote", os.path.abspath(args.out), out.size)


if __name__ == "__main__":
    main()
