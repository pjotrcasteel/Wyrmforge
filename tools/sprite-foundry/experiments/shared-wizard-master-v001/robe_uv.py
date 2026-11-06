#!/usr/bin/env python3
"""Deterministic, paintable local-space UV starting point for the grey Wizard robe.

This is an unapproved material study; it does not create or change body geometry.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

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
            grain = 2.0 * math.sin(7 * theta + height * 5.2)
            grain *= math.cos(13 * theta - height * 3.8)
            value = max(43, min(174, int(tone + grain)))
            value = int(round(value / 3)) * 3
            image.putpixel((px, py), (value + 3, value + 1, value - 2, 255))
    return image



def make_robe_guide() -> Image.Image:
    """Transparent 1:1 atlas overlay from the frozen physical damage ledger.

    Red cells are actual absent outer-gown faces, cyan marks are sewn seams,
    amber marks are surface scars. The overlay is a painting GUIDE, never albedo.
    """
    guide = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(guide)
    x_from_degrees = lambda degrees: int((degrees % 360) * WIDTH / 360) % WIDTH
    y_from_height = lambda height: max(0, min(HEIGHT - 1, round(
        (2.38 - height) * HEIGHT / 2.18 - .5)))

    # Subtle guides for the same garment-height rings as the physical mesh.
    for height in GARMENT_RINGS + (1.52, 1.72, 2.38):
        y = y_from_height(height)
        draw.line((0, y, WIDTH - 1, y), fill=(180, 191, 204, 60))

    # Seam dashes indicate world-local stitch paths, not camera-space pixels.
    for degrees in SEAM_AZIMUTHS:
        x = x_from_degrees(degrees)
        for y in range(0, y_from_height(.64) + 1, 5):
            draw.line((x, y, x, min(y + 2, y_from_height(.64))),
                      fill=(61, 220, 221, 205), width=1)

    # Scar anchors follow the same azimuth, start height and vertical length.
    for degrees, top, length in SCAR_MARKS:
        x = x_from_degrees(degrees)
        draw.line((x, y_from_height(top), x, y_from_height(top - length)),
                  fill=(245, 181, 84, 235), width=2)

    # Missing physical cloth takes priority over drawn surface marks.
    # 24-sector mesh; each physical missing face maps to exactly four U pixels.
    for ring, sector in OPEN_PANEL_CELLS:
        low, high = GARMENT_RINGS[ring:ring + 2]
        x0 = sector * WIDTH // 24
        x1 = (sector + 1) * WIDTH // 24 - 1
        draw.rectangle((x0, y_from_height(high), x1, y_from_height(low)),
                       fill=(230, 62, 69, 175), outline=(255, 111, 118, 225))

    # Orientation markers along the atlas top: front +Z at 90°, rear at 270°.
    draw.point((x_from_degrees(90), 0), fill=(250, 250, 250, 255))
    draw.point((x_from_degrees(270), 0), fill=(175, 174, 255, 255))
    return guide


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--guide-output", type=Path, help="Save a transparent 1:1 physical landmark overlay")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    make_robe_uv().save(args.output)
    if args.guide_output:
        args.guide_output.parent.mkdir(parents=True, exist_ok=True)
        make_robe_guide().save(args.guide_output)


if __name__ == "__main__":
    main()
