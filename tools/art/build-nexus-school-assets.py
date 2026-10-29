#!/usr/bin/env python3
"""Bake six independently renderable Nexus magic paintings from approved town art.

The original night-active.webp and the eight canonical building source PNGs are
immutable. Outputs contain only Nexus-owned magical pixels and authored symbols.
Building architecture, other buildings, collision and actor depth are untouched.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot"
SOURCE = WEB / "art/town/night-active.webp"
TARGET = WEB / "art/town/nexus-schools"

PALETTES = {
    "fire": ((52, 11, 18), (215, 52, 28), (255, 218, 124)),
    "frost": ((12, 34, 63), (54, 173, 224), (214, 252, 255)),
    "storm": ((49, 32, 30), (231, 168, 46), (255, 249, 161)),
    "death": ((17, 35, 27), (83, 166, 98), (212, 240, 158)),
    "binding": ((13, 40, 46), (36, 168, 151), (189, 255, 220)),
}
REGIONS = (
    (275, 70, 370, 166), (395, 227, 465, 342), (340, 284, 373, 324),
    (396, 315, 429, 347), (470, 247, 500, 292), (493, 314, 526, 350),
    (42, 322, 84, 353), (216, 352, 267, 404),
)
BANNERS = ((146, 207, 179, 285), (305, 184, 340, 303), (245, 293, 273, 355))


def hsv(src):
    rgb = src.astype(np.float32) / 255
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    hi = np.max(rgb, axis=2)
    lo = np.min(rgb, axis=2)
    diff = hi - lo
    hue = np.zeros(hi.shape, dtype=np.float32)
    red = (diff > 0) & (hi == r)
    green = (diff > 0) & (hi == g)
    blue = (diff > 0) & (hi == b)
    tmp = np.zeros_like(hue)
    np.divide(g - b, diff, out=tmp, where=red)
    hue = np.where(red, tmp % 6, hue)
    np.divide(b - r, diff, out=tmp, where=green)
    hue = np.where(green, tmp + 2, hue)
    np.divide(r - g, diff, out=tmp, where=blue)
    hue = np.where(blue, tmp + 4, hue)
    saturation = np.zeros_like(hue)
    np.divide(diff, hi, out=saturation, where=hi > 0)
    return (hue * 60 + 360) % 360, saturation, hi


def source_masks(src):
    hue, sat, val = hsv(src)
    colored = (hue >= 194) & (hue <= 337) & (sat > .19) & (val > .22)
    blue_glass = (
        (src[:, :, 2] > src[:, :, 0].astype(np.float32) * 1.21)
        & (src[:, :, 2] > src[:, :, 1].astype(np.float32) * 1.13)
        & (sat > .20) & (val > .15)
    )
    territory = np.zeros(hue.shape, dtype=bool)
    for x1, y1, x2, y2 in REGIONS:
        territory[y1:y2, x1:x2] = True
    magic = territory & (colored | blue_glass)
    cloth = np.zeros_like(magic)
    for x1, y1, x2, y2 in BANNERS:
        height = y2 - y1
        for y in range(y1, y2):
            taper = max(.14, 1 - max(0, y - y1 - height * .77) / (height * .23) * .84)
            x = np.arange(x1, x2)
            center = (x1 + x2) / 2
            inside = abs(x - center) < (x2 - x1) * .42 * taper
            cloth[y, x1:x2] |= (
                inside & (hue[y, x1:x2] > 203) & (hue[y, x1:x2] < 333)
                & (sat[y, x1:x2] > .17) & (val[y, x1:x2] > .09)
                & (val[y, x1:x2] < .69)
            )
    if magic.sum() < 3000 or cloth.sum() < 40:
        raise ValueError("Nexus source art and emitter coordinates no longer agree")
    return magic, cloth


def paint_base(src, magic, cloth, palette):
    dark, middle, bright = [np.array(c, np.float32) for c in palette]
    luminance = np.max(src, axis=2).astype(np.float32) / 255
    amount = np.clip((luminance - .13) / .78, 0, 1)
    grain = np.clip((luminance - .36) * .35, -.13, .15)
    colors = np.where(
        (amount < .52)[:, :, None],
        dark + (middle - dark) * (amount / .52)[:, :, None],
        middle + (bright - middle) * ((amount - .52) / .48)[:, :, None],
    )
    colors = np.clip(colors + grain[:, :, None] * 42, 0, 255).astype(np.uint8)
    pixels = np.zeros((*src.shape[:2], 4), np.uint8)
    # Do not retain random hidden RGB values: transparent PNGs stay small.
    pixels[:, :, :3] = np.where(magic[:, :, None], colors, 0)
    pixels[:, :, 3] = magic.astype(np.uint8) * 255
    if cloth.any():
        fabric = np.clip(src.astype(np.float32) * .23 + dark * .77, 0, 255).astype(np.uint8)
        pixels[:, :, :3] = np.where(cloth[:, :, None], fabric, pixels[:, :, :3])
        pixels[:, :, 3] = np.where(cloth, 255, pixels[:, :, 3])
    return Image.fromarray(pixels, "RGBA")


def paint_symbols(image, school, palette):
    _, middle, bright = palette
    scale = 3
    width, height = image.size
    symbols = Image.new("RGBA", (width * scale, height * scale))
    draw = ImageDraw.Draw(symbols)
    light, glow = (*bright, 200), (*middle, 160)

    def line(points, color=light, weight=1.1):
        draw.line([(round(x * scale), round(y * scale)) for x, y in points],
                  fill=color, width=max(1, round(weight * scale)), joint="curve")

    def ring(x, y, rx, ry, color=glow, weight=.8):
        draw.ellipse(((x-rx)*scale, (y-ry)*scale, (x+rx)*scale, (y+ry)*scale),
                     outline=color, width=max(1, round(weight * scale)))

    def emblem(x, y, factor):
        if school == "fire":
            line(((x, y-11*factor), (x+5*factor, y-3*factor),
                  (x+7*factor, y+5*factor), (x+factor, y+12*factor),
                  (x-7*factor, y+5*factor), (x-4*factor, y-3*factor),
                  (x, y-11*factor)), light, 1.5)
        elif school == "frost":
            for degrees in range(0, 360, 60):
                angle = math.radians(degrees)
                end = (x + 11*factor*math.cos(angle),
                       y + 11*factor*math.sin(angle))
                line(((x, y), end), light, 1.4)
                for branch in (-140, 140):
                    b = math.radians(degrees + branch)
                    line((end, (end[0]+4*factor*math.cos(b),
                                end[1]+4*factor*math.sin(b))), glow, .8)
        elif school == "storm":
            line(((x+3*factor, y-12*factor), (x-6*factor, y+factor),
                  (x+factor, y+factor), (x-4*factor, y+12*factor),
                  (x+8*factor, y-4*factor), (x+factor, y-4*factor)), light, 1.8)
        elif school == "death":
            ring(x, y-2*factor, 8*factor, 10*factor, light, 1.4)
            for direction in (-4, 4):
                draw.ellipse(((x+(direction-1.3)*factor)*scale,
                              (y-5*factor)*scale,
                              (x+(direction+1.3)*factor)*scale,
                              (y-2*factor)*scale), fill=(*middle, 210))
            line(((x-4*factor, y+9*factor), (x-4*factor, y+12*factor),
                  (x+5*factor, y+12*factor), (x+5*factor, y+9*factor)))
        else:
            ring(x-4*factor, y-factor, 7*factor, 8*factor, light, 1.4)
            ring(x+4*factor, y+2*factor, 7*factor, 8*factor, glow, 1.4)
            line(((x-2*factor, y-10*factor),
                  (x+2*factor, y+10*factor)), light)

    # Source-matched spell structures, not floating new geometry on masonry.
    for cx, cy in ((309, 125), (427, 293)):
        if school == "fire":
            for offset in (-11, 1, 12):
                line(((cx+offset,cy+13),(cx+offset-4,cy+5),
                      (cx+offset+3,cy-3),(cx+offset-2,cy-13)))
        elif school == "frost":
            for degrees in range(0, 360, 45):
                a = math.radians(degrees)
                line(((cx, cy), (cx+21*math.cos(a), cy+21*math.sin(a))))
        elif school == "storm":
            for offset in (-13, 0, 13):
                line(((cx+offset-5,cy-20),(cx+offset+2,cy-7),
                      (cx+offset-3,cy),(cx+offset+7,cy+12),
                      (cx+offset+1,cy+19)))
        elif school == "death":
            ring(cx, cy, 18, 19)
            line(((cx-12,cy+14),(cx-17,cy+4),(cx-5,cy-14)),glow)
        else:
            ring(cx-6, cy, 20, 9)
            ring(cx+6, cy, 9, 19)
            line(((cx-21,cy),(cx,cy-5),(cx+20,cy+2)),light)

    emblem(309, 125, .75)
    emblem(426, 293, 1.2)
    emblem(321, 242, .65)
    image.alpha_composite(symbols.resize((width, height), Image.Resampling.LANCZOS))


def generate(source_path=SOURCE, target=TARGET):
    source = np.asarray(Image.open(source_path).convert("RGB"))
    if source.shape != (941, 1672, 3):
        raise ValueError("The original panorama must remain 1672 x 941")
    magic, cloth = source_masks(source)
    target.mkdir(parents=True, exist_ok=True)
    arcane = np.zeros((*source.shape[:2], 4), np.uint8)
    # The Arcane asset is a pixel-identical copy of the actual, approved art.
    selected = magic | cloth
    arcane[:, :, :3] = np.where(selected[:, :, None], source, 0)
    arcane[:, :, 3] = selected.astype(np.uint8) * 255
    Image.fromarray(arcane, "RGBA").save(target / "arcane.png", optimize=True)
    for school, palette in PALETTES.items():
        art = paint_base(source, magic, cloth, palette)
        paint_symbols(art, school, palette)
        art.save(target / (school + ".png"), optimize=True)
    for name in ("arcane", *PALETTES.keys()):
        p = target / (name + ".png")
        print(f"Nexus {name}: {p.stat().st_size} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=TARGET)
    args = parser.parse_args()
    generate(args.source, args.output)
