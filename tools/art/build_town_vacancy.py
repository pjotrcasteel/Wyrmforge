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
        "clone_offsets": [(92, 34), (72, 12)],
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
        "clone_offsets": [(-88, 32), (88, 20)],
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
        "clone_offsets": [(-75, 21), (-70, 10), (85, 12)],
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
    # Large figures are filled from matching nearby real paving and stonework.
    # Telea inpainting at 50+ px makes an obvious brown ghost; seamless texture
    # transfer preserves actual painted detail and adjusts local brightness.
    painted_bgr = cv2.cvtColor(original, cv2.COLOR_RGB2BGR)
    for polygon, (dx, dy) in zip(plan["figures"], plan["clone_offsets"], strict=True):
        xs, ys = zip(*polygon)
        x0, x1 = max(0, min(xs) - 9), min(w, max(xs) + 10)
        y0, y1 = max(0, min(ys) - 9), min(h, max(ys) + 10)
        crop = original[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
        if crop.shape[:2] != (y1 - y0, x1 - x0):
            raise SystemExit(f"Invalid neighboring art region at {(x0, y0, dx, dy)}")
        replacement = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
        local = np.zeros((y1 - y0, x1 - x0), dtype=np.uint8)
        vertices = np.asarray([(x - x0, y - y0) for x, y in polygon], np.int32)
        cv2.fillPoly(local, [vertices], 255)
        local = cv2.dilate(local, np.ones((3, 3), np.uint8), iterations=1)
        center = ((x0 + x1) // 2, (y0 + y1) // 2)
        painted_bgr = cv2.seamlessClone(replacement, painted_bgr, local, center, cv2.NORMAL_CLONE)
    painted = cv2.cvtColor(painted_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

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
        image.save(path, format="WEBP", quality=94, method=6)
        verified = Image.open(path)
        alpha = verified.getchannel("A")
        if verified.size != SIZE or verified.mode != "RGBA" or not alpha.getbbox():
            raise SystemExit(f"Invalid dormant plate: {path}")
        if alpha.getpixel((1086, 340)) != 0 or alpha.getpixel(plan["boundary"][0]) > 254:
            raise SystemExit(f"Dormant art alpha mask must leave the world gate untouched: {path}")
        print(f"Built {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
    # Inspect this 3:1 proof image at native scale, including all three building
    # patches and their unchanged surroundings. It is not rendered in gameplay.
    proof = Image.open(INPUT).convert("RGBA")
    for name in PLATES:
        with Image.open(ART / f"town-vacant-{name}.webp") as layer:
            proof.alpha_composite(layer)
    preview = ROOT / "docs/art/previews/refuge-closed-2026-10-19.webp"
    preview.parent.mkdir(parents=True, exist_ok=True)
    proof.convert("RGB").save(preview, "WEBP", quality=91, method=6)
    print(f"Built {preview.relative_to(ROOT)} ({preview.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
