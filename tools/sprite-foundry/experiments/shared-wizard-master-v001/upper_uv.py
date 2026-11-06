#!/usr/bin/env python3
"""One deterministic, artist-editable atlas for the Wizard's *other* grey cloth.

All paint coordinates attach to the same accepted 3D master. This unapproved
study has three fixed subregions: mantle/cape, both sleeves, and the floppy hat.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 96, 128
ZONES = {"mantle": (0, 48), "sleeves": (48, 96), "hat": (96, 128)}


def upper_cloth_uv() -> Image.Image:
    """Paint reproducible greys, draped local folds and fixed sewn wear."""
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    for py in range(HEIGHT):
        if py < 48:
            part, start, span = "mantle", 0, 48
        elif py < 96:
            part, start, span = "sleeves", 48, 48
        else:
            part, start, span = "hat", 96, 32
        v = (py - start + .5) / span
        for px in range(WIDTH):
            theta = 2 * math.pi * (px + .5) / WIDTH
            if part == "mantle":
                # Draped cloak folds echo the same angular plane on front/back.
                fold = math.cos(8 * theta + 1.8 * v)
                fold += .34 * math.cos(16 * theta - 3.0 * v)
                base = 122 + 16 * fold - 10 * v
                # Permanent stitches on the wrap's two folded shoulder panels.
                seam = min(abs(math.atan2(math.sin(theta - t),
                                          math.cos(theta - t)))
                           for t in (math.radians(55), math.radians(128)))
                if seam < .065:
                    base -= 21
                elif seam < .13 and int(v * 38) % 4 == 0:
                    base += 12
            elif part == "sleeves":
                fold = math.cos(6 * theta - 1.2 * v)
                fold += .24 * math.cos(13 * theta + 2 * v)
                base = 117 + 12 * fold - 18 * max(0, (v - .68) / .32)
                # Both cuff edges are tattered at the same *local* height.
                if v > .89:
                    base -= 11 if int(theta * 28) % 3 else 5
            else:
                fold = math.cos(9 * theta + .5 * v)
                fold += .21 * math.cos(15 * theta - 2 * v)
                base = 126 + 11 * fold - 14 * v
                # Weathered brim; the bent tip is still the same fixed geometry.
                if v > .78:
                    base -= 15
                if .31 < theta < .57 and .15 < v < .45:
                    base -= 14
            grain = 2.2 * math.sin(7 * theta + 8 * v) * math.cos(11 * theta - 5 * v)
            value = max(54, min(171, int(base + grain)))
            image.putpixel((px, py), (value + 3, value + 1, value - 2, 255))
    return image


def upper_cloth_guide() -> Image.Image:
    """Transparent layout for aligned painting; never sample it as cloth color."""
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for cut in (48, 96):
        draw.line((0, cut, WIDTH - 1, cut), fill=(255, 208, 116, 240))
    for py, color in ((12, (75, 228, 221, 210)),
                      (60, (163, 192, 255, 190)),
                      (108, (244, 157, 210, 190))):
        for x in (0, 24, 48, 72, 95):
            draw.line((x, py - 4, x, py + 4), fill=color)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--guide-output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    upper_cloth_uv().save(args.output)
    if args.guide_output:
        args.guide_output.parent.mkdir(parents=True, exist_ok=True)
        upper_cloth_guide().save(args.guide_output)


if __name__ == "__main__":
    main()
