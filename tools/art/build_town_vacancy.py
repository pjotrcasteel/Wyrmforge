#!/usr/bin/env python3
"""Build aligned, transparent dormant building plates for the Refuge town.

Input is the approved 2172x724 panoramic painting. Unlike a black overlay, this
pipeline removes figures and lit props from each sealed building and selectively
extinguishes luminous pixels, keeping neighboring masonry and roads untouched.

Install: python -m pip install pillow numpy opencv-python-headless
Run: python tools/art/build_town_vacancy.py
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art"
INPUT = ART / "refuge-town-vacant.webp"
SIZE = (2172, 724)

# A plate includes a building and its own immediate doorstep, not the town gate,
# cobbled public square or other properties. The edges are art alignment masks.
PLATES = {
    "nexus": {
        "boundary": [(2, 74), (98, 22), (292, 0), (530, 13), (706, 94),
                     (705, 319), (596, 364), (367, 355), (123, 359), (3, 331)],
        # People and lit stall figures erased using nearby painted detail.
        "figures": [
            [(400, 255), (429, 249), (442, 285), (436, 313), (393, 322), (389, 285)],
            [(143, 303), (165, 298), (178, 319), (174, 340), (139, 341)],
        ],
        "lamps": [
            (20, 250, 28, 50), (112, 216, 18, 43), (220, 230, 16, 37),
            (275, 218, 23, 45), (381, 209, 22, 52), (482, 215, 19, 48),
            (155, 208, 19, 45), (484, 196, 18, 45), (150, 305, 30, 40),
            (267, 280, 36, 44), (376, 280, 26, 40), (675, 291, 26, 33),
            (410, 286, 24, 28),
        ],
    },
    "codex": {
        "boundary": [(1475, 97), (1575, 46), (1700, 9), (1793, 0), (1938, 0),
                     (2111, 8), (2171, 63), (2171, 346), (2075, 369),
                     (1911, 369), (1812, 361), (1611, 354), (1473, 328)],
        "figures": [
            [(1636, 251), (1667, 251), (1681, 284), (1677, 317), (1639, 326), (1626, 284)],
            [(1828, 276), (1853, 272), (1861, 306), (1859, 342), (1825, 343), (1821, 307)],
        ],
        "lamps": [
            (1552, 270, 24, 38), (1654, 266, 22, 46),
            (1725, 207, 18, 39), (1808, 111, 52, 64),
            (1856, 260, 23, 40), (1880, 283, 19, 32),
            (1998, 235, 20, 44), (2060, 270, 21, 38),
        ],
    },
    "legends": {
        "boundary": [(1481, 479), (1565, 413), (1746, 353), (1924, 356),
                     (2083, 390), (2171, 463), (2171, 715), (2052, 722),
                     (1887, 715), (1730, 689), (1579, 666), (1473, 638)],
        "figures": [
            [(1746, 547), (1777, 540), (1796, 565), (1795, 604), (1750, 612)],
            [(1875, 575), (1906, 575), (1923, 608), (1924, 651), (1879, 655)],
            [(2004, 577), (2036, 576), (2045, 609), (2044, 646), (2005, 647)],
        ],
        "lamps": [
            (1562, 471, 20, 42), (1688, 508, 22, 45),
            (1765, 523, 20, 44), (1821, 546, 27, 44),
            (1890, 529, 22, 45), (1975, 551, 24, 45),
            (2055, 570, 23, 49), (2121, 582, 23, 45),
            (1891, 623, 28, 44), (2029, 627, 34, 45),
        ],
    },
}


def dormant_plate(original: np.ndarray, plan: dict) -> Image.Image:
    h, w, _ = original.shape
    figure_mask = np.zeros((h, w), dtype=np.uint8)
    for polygon in plan["figures"]:
        cv2.fillPoly(figure_mask, [np.array(polygon, dtype=np.int32)], 255)
    # Slight mask dilation includes shoes, robes and highlights before inpainting.
    figure_mask = cv2.dilate(figure_mask, np.ones((5, 5), np.uint8), iterations=1)
    painted = cv2.inpaint(cv2.cvtColor(original, cv2.COLOR_RGB2BGR), figure_mask, 5, cv2.INPAINT_TELEA)
    painted = cv2.cvtColor(painted, cv2.COLOR_BGR2RGB).astype(np.float32)

    # Extinguish only high-luminance warm or violet light within hand-authored
    # light-source ellipses. The stonework, tile roof and ambient daylight remain.
    yy, xx = np.ogrid[:h, :w]
    source_rgb = painted.copy()
    red, green, blue = source_rgb[:, :, 0], source_rgb[:, :, 1], source_rgb[:, :, 2]
    warm = np.clip((red - green * .92) / 80, 0, 1) * np.clip((green - blue * .9) / 70, 0, 1)
    violet = np.clip((red + blue - green * 2) / 130, 0, 1)
    luminous = np.clip((np.max(source_rgb, axis=2) - 60) / 135, 0, 1)
    light_mask = np.zeros((h, w), dtype=np.float32)
    for x, y, rx, ry in plan["lamps"]:
        r2 = ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2
        light_mask = np.maximum(light_mask, np.clip(1.0 - r2, 0, 1) ** 0.7)
    suppression = np.clip(light_mask * luminous * np.maximum(warm, violet * .85) * 1.25, 0, .87)
    # Preserve the painting's texture; only the emissive chroma and intensity go.
    gray = (source_rgb[:, :, 0] * .24 + source_rgb[:, :, 1] * .58 + source_rgb[:, :, 2] * .18)
    neutral = np.stack((gray * .69, gray * .72, gray * .78), axis=-1)
    painted = np.clip(painted * (1 - suppression[:, :, None]) + neutral * suppression[:, :, None], 0, 255)
    cutout = Image.new("L", SIZE, 0)
    drawer = ImageDraw.Draw(cutout)
    drawer.polygon(plan["boundary"], fill=255)
    # A soft anti-aliasing edge prevents an outline along the cobbled footpath.
    alpha = cv2.GaussianBlur(np.asarray(cutout), (5, 5), 0.8)
    return Image.fromarray(np.dstack((painted.astype(np.uint8), alpha)), "RGBA")


def main() -> None:
    base = Image.open(INPUT).convert("RGB")
    if base.size != SIZE:
        raise SystemExit(f"Unexpected panorama size {base.size}, expected {SIZE}")
    src = np.asarray(base)
    for name, plan in PLATES.items():
        image = dormant_plate(src, plan)
        path = ART / f"town-vacant-{name}.webp"
        image.save(path, format="WEBP", quality=94, method=6, exact=True)
        verified = Image.open(path)
        if verified.size != SIZE or verified.mode != "RGBA" or not verified.getchannel("A").getbbox():
            raise SystemExit(f"Invalid dormant plate: {path}")
        print(f"Built {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
