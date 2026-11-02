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


def make_robe_uv() -> Image.Image:
    """Generate one cylindrical material atlas; 0° and 360° meet at its seam."""
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    for py in range(HEIGHT):
        height = 2.38 - 2.18 * (py + .5) / HEIGHT
        for px in range(WIDTH):
            theta = 2 * math.pi * (px + .5) / WIDTH
            fold = math.sin(11 * theta + 1.1 * height)
            fold += .5 * math.sin(18 * theta - 1.7 * height)
            value = 112 + 17 * fold + 4 * math.sin(theta * 31 + .25 * height)
            dirt = max(0.0, min(1.0, (.98 - height) / .78))
            value -= 17 * dirt
            for azimuth in SEAM_AZIMUTHS:
                if angular_distance(theta, azimuth) < .07 and .64 < height < 2.38:
                    value -= 23
                    if int(height * 16) % 4 == 0:
                        value += 17
            for azimuth, top, length in SCAR_MARKS:
                vertical = (top - height) / length
                if 0 < vertical < 1:
                    width = .19 * (1 - vertical) + .045
                    distance = angular_distance(theta, azimuth)
                    if distance < width:
                        value -= 35
                    elif distance < width + .06:
                        value += 19
            grain = 3.0 * math.sin(px * 2.4 + py * 1.3)
            grain *= math.cos(px * 1.4 - py * 1.8)
            tone = max(43, min(174, int(value + grain)))
            image.putpixel((px, py), (tone + 3, tone + 1, tone - 2, 255))
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    make_robe_uv().save(args.output)


if __name__ == "__main__":
    main()
