#!/usr/bin/env python3
"""Deterministic head and beard paint map for the accepted grey Wizard pose.

This material-only study uses 96x128 RGBA: top 80 rows for beard/moustache,
bottom 48 for face, nose and neck. It does not add geometry or transparency.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 96, 128
ZONES = {"beard": (0, 80), "skin": (80, 128)}


def make_head_uv() -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    for y in range(HEIGHT):
        if y < 80:
            v = (y + .5) / 80
            for x in range(WIDTH):
                u = (x + .5) / WIDTH
                # Seven long, individually anchored locks with smaller grey threads.
                phase = 2 * math.pi * (7 * u + .24 * v)
                locks = math.cos(phase) + .28 * math.cos(2 * phase - 1.7 * v)
                root_shadow = 16 * max(0.0, (0.16 - v) / .16)
                lower_shadow = 10 * max(0.0, (v - .68) / .32)
                tone = 191 + 23 * locks - root_shadow - lower_shadow
                thread = 5 * math.sin(2 * math.pi * (16 * u - .35 * v))
                value = max(135, min(239, round(tone + thread)))
                image.putpixel((x, y), (
                    min(255, value + 3),
                    min(255, value + 1),
                    max(0, value - 4),
                    255,
                ))
        else:
            v = (y - 80 + .5) / 48
            for x in range(WIDTH):
                u = (x + .5) / WIDTH
                center = max(0.0, 1.0 - abs(u - .5) * 2)
                # Subtle cheek-to-nose shading attached to head-local coordinates.
                light = 12 * center - 7 * abs(v - .46)
                wrinkle = 2 * math.cos(2 * math.pi * (5 * u + 2 * v))
                r = max(140, min(218, round(182 + light + wrinkle)))
                g = max(95, min(165, round(139 + light * .78 + wrinkle)))
                b = max(76, min(146, round(111 + light * .64 + wrinkle)))
                image.putpixel((x, y), (r, g, b, 255))
    return image


def make_head_guide() -> Image.Image:
    guide = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(guide)
    draw.line((0, 80, WIDTH - 1, 80), fill=(247, 191, 97, 230))
    for n in range(8):
        x = round(n * WIDTH / 7)
        if x < WIDTH:
            draw.line((x, 0, x, 79), fill=(104, 223, 237, 100))
    draw.line((WIDTH // 2, 80, WIDTH // 2, 127), fill=(243, 158, 189, 155))
    return guide


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--guide-output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    make_head_uv().save(args.output)
    if args.guide_output:
        args.guide_output.parent.mkdir(parents=True, exist_ok=True)
        make_head_guide().save(args.guide_output)


if __name__ == "__main__":
    main()
