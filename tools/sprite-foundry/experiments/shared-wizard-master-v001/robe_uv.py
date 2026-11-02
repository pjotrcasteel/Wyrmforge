#!/usr/bin/env python3
"""Deterministic, paintable local-space UV starting point for the grey Wizard robe.

This is an unapproved material study; it does not create or change body geometry.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image

WIDTH, HEIGHT = 96, 128
SEAM_AZIMUTHS = (58, 125, 259)
SCAR_MARKS = ((35, 1.33, .36), (138, .97, .32), (260, 1.37, .35))


def angular_distance(theta: float, degrees: float) -> float:
    target = math.radians(degrees)
    return abs(math.atan2(math.sin(theta - target), math.cos(theta - target)))


OPEN_PANEL_CELLS = (
    (0, 4), (0, 5), (0, 9), (0, 10), (0, 17),
    (1, 4), (1, 9), (1, 17), (2, 3), (3, 2), (3, 3),
)
GARMENT_RINGS = (.20, .55, .90, 1.08, 1.32)


def make_robe_uv() -> Image.Image:
    """Paint one repeatable Gothic robe material, including fixed physical tear edges."""
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    for py in range(HEIGHT):
        height = 2.38 - 2.18 * (py + .5) / HEIGHT
        for px in range(WIDTH):
            theta = 2 * math.pi * (px + .5) / WIDTH
            fold = math.sin(11 * theta + .90 * height)
            fold += .40 * math.sin(18 * theta - 1.5 * height)
            tone = 110 + 30 * fold + 4 * math.sin(theta * 29 + height * .55)

            # The hem is soil-stained without turning the whole garment brown.
            dirt = max(0.0, min(1.0, (1.02 - height) / .82))
            tone -= 23 * dirt

            # Dark stitched panel seams and a narrow, irregular pale thread edge.
            for azimuth in SEAM_AZIMUTHS:
                wobble = 1.4 * math.sin(height * 2.7 + azimuth)
                distance = angular_distance(theta, azimuth + wobble)
                if .64 < height < 2.38:
                    if distance < .056:
                        tone -= 30
                    elif distance < .11:
                        tone += 12 if int(height * 19) % 4 == 0 else 4

            # A frayed margin surrounds each fixed, physical missing panel.
            for ring, sector in OPEN_PANEL_CELLS:
                lower, upper = GARMENT_RINGS[ring:ring + 2]
                if lower - .08 <= height <= upper + .08:
                    centre = (sector + .5) * 15
                    distance = angular_distance(theta, centre)
                    width = math.radians(7.5)
                    if width < distance < width + .095:
                        tone += 17 if int(height * 23) % 3 == 0 else 7
                    elif distance < width + .14:
                        tone -= 8

            # Surface damage is painted on the same garment positions as mesh scars.
            for azimuth, top, length in SCAR_MARKS:
                vertical = (top - height) / length
                if 0 < vertical < 1:
                    taper = .19 * (1 - vertical) + .045
                    distance = angular_distance(theta, azimuth)
                    if distance < taper:
                        tone -= 33
                    elif distance < taper + .07:
                        tone += 23 if int(height * 28) % 3 != 0 else 8

            # Sparse stable grain; avoid per-frame randomness or high-frequency static.
            grain = 2.0 * math.sin(px * 2.4 + py * 1.3)
            grain *= math.cos(px * 1.4 - py * 1.8)
            value = max(43, min(174, int(tone + grain)))
            value = int(round(value / 3)) * 3
            image.putpixel((px, py), (value + 3, value + 1, value - 2, 255))
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    make_robe_uv().save(args.output)


if __name__ == "__main__":
    main()
