#!/usr/bin/env python3
"""Build aligned, transparent dormant building plates for the Refuge town.

Input is the approved 2172x724 panoramic painting. The same dormant-light
conversion is reused for every locked building; per-building boundaries protect
neighboring architecture and the permanently active World Gate. Unlike a black overlay, this
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
        # Include window panes, purple sigils and the trading stall, not just street lamps.
        "emission_zones": [(100, 196, 45, 65), (190, 208, 46, 55), (273, 216, 55, 62),
                           (334, 192, 45, 55), (403, 203, 47, 60), (485, 190, 43, 62),
                           (542, 216, 55, 73), (122, 289, 80, 45), (363, 286, 72, 47),
                           (510, 294, 92, 46), (630, 280, 44, 41),
                           # Blue and cyan bottles, shop displays and dormant rune sconces.
                           (150, 306, 65, 45), (260, 295, 70, 55),
                           (378, 285, 65, 54), (505, 300, 80, 52),
                           (585, 294, 65, 48)],
        "clone_offsets": [(92, 34), (72, 12)],
        # Smoke is painted into the panorama; turning off particle effects
        # cannot remove it. These regions are bounded to dormant chimneys.
        "smoke": [
            [(168, 0), (239, 0), (238, 26), (226, 47),
             (211, 56), (181, 54), (168, 33)],
        ],
        "smoke_clone_offset": (92, 0),
        "cold_sources": [
            # Closed arched windows and the two still-bright wall lanterns.
            (158, 225, 18, 32), (275, 227, 18, 33),
            (381, 215, 20, 39), (479, 227, 21, 38),
            (555, 224, 27, 41),
            # Dusty, unpowered alchemy props on trading tables.
            (209, 280, 44, 29), (423, 265, 39, 31),
            (554, 279, 46, 36),
        ],
        "boundary": [(2, 74), (98, 22), (151, 0), (292, 0), (530, 13), (706, 94),
                     (705, 319), (596, 364), (367, 355), (123, 359), (3, 331)],
        # People and lit stall figures erased using nearby painted detail.
        "figures": [
            [(400, 255), (429, 249), (442, 285), (436, 313), (393, 322), (389, 285)],
            [(143, 303), (165, 298), (178, 319), (174, 340), (139, 341)],
        ],
        # Erase luminous market stock, not just its colour: active potion
        # silhouettes made this building appear occupied while locked.
        "inactive_props": [
            [(202, 260), (226, 244), (252, 246), (272, 265), (267, 287), (204, 296)],
            [(411, 230), (427, 217), (452, 220), (469, 242), (466, 263), (411, 272)],
            [(528, 263), (552, 249), (574, 259), (584, 288), (568, 304), (527, 301)],
        ],
        "lamps": [
            (20, 250, 28, 50), (112, 216, 18, 43), (220, 230, 16, 37),
            (275, 218, 23, 45), (381, 209, 22, 52), (482, 215, 19, 48),
            (155, 208, 19, 45), (484, 196, 18, 45), (150, 305, 30, 40),
            (267, 280, 36, 44), (376, 280, 26, 40), (675, 291, 26, 33),
            (410, 286, 24, 28), (327, 183, 30, 34), (327, 251, 44, 58),
            (540, 212, 30, 57), (585, 278, 37, 44), (220, 213, 29, 63),
        ],
    },
    "forge": {
        # The supplied base panorama already depicts an unstaffed smithy,
        # but its chimney still emits painted smoke. This transparent native
        # plate removes that smoke without changing occupied Forge art.
        "emission_zones": [],
        "lamps": [],
        "clone_offsets": [],
        "figures": [],
        "smoke": [
            [(58, 304), (125, 302), (134, 339), (138, 376),
             (126, 420), (89, 423), (64, 383), (53, 337)],
        ],
        "cold_sources": [],
        "smoke_clone_offset": (106, 0),
        "boundary": [(0, 299), (55, 316), (94, 305), (135, 323),
                     (213, 352), (416, 354), (686, 414),
                     (705, 588), (680, 723), (0, 723)],
    },
    "codex": {
        # Enforced OFF: upper sconces, red/white windows and doorway brazier.
        "cold_sources": [
            (1705, 125, 23, 32), (1922, 145, 22, 33),
            (1676, 230, 24, 39), (1744, 240, 23, 39),
            (1832, 245, 24, 44), (1886, 248, 20, 42),
            (1921, 287, 36, 32),
        ],
        "emission_zones": [(1551, 275, 35, 70), (1653, 258, 65, 62),
                           (1729, 191, 35, 56), (1816, 118, 71, 67),
                           (1820, 278, 77, 70), (1900, 240, 50, 65),
                           (2003, 247, 55, 75), (2105, 261, 45, 71)],
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
            (1840, 250, 70, 89), (1741, 230, 28, 56), (1651, 233, 33, 44),
        ],
    },
    "legends": {
        "smoke_clone_offset": (-120, 0),
        "smoke": [
            # A sealed Hall of Fame must not burn fuel in its chimney.
            [(2024, 334), (2087, 330), (2101, 357), (2100, 387),
             (2080, 422), (2047, 426), (2032, 397), (2023, 358)],
        ],
        "cold_sources": [
            (1702, 532, 24, 39), (1820, 560, 24, 45),
            (1892, 584, 23, 39), (1983, 603, 25, 47),
            (2090, 602, 24, 43),
        ],
        "emission_zones": [(1557, 482, 25, 44), (1665, 520, 80, 80),
                           (1748, 537, 64, 74), (1834, 540, 68, 95),
                           (1920, 555, 77, 104), (2020, 569, 83, 102),
                           (2115, 580, 81, 98)],
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
            (1793, 534, 68, 70), (1870, 542, 53, 70),
            (1977, 559, 57, 73), (2080, 555, 73, 85),
        ],
    },
}


def dormant_plate(original: np.ndarray, plan: dict) -> Image.Image:
    h, w, _ = original.shape
    # Large figures are filled from matching nearby real paving and stonework.
    # Telea inpainting at 50+ px makes an obvious brown ghost; seamless texture
    # transfer preserves actual painted detail and adjusts local brightness.
    painted_bgr = cv2.cvtColor(original, cv2.COLOR_RGB2BGR)

    # Remove baked-in smoke using nearby authentic roof and foliage texture.
    # Broad inpainting created gray smears, so feathered source replacement is
    # confined to the chimney plume. The occupied painting remains untouched.
    if plan.get("smoke"):
        dx, dy = plan["smoke_clone_offset"]
        smoke_mask = np.zeros((h, w), dtype=np.uint8)
        for polygon in plan["smoke"]:
            cv2.fillPoly(smoke_mask, [np.asarray(polygon, np.int32)], 255)
        alpha = cv2.GaussianBlur(smoke_mask.astype(np.float32) / 255, (0, 0), 4.0)
        affected_y, affected_x = np.where(alpha > 0.001)
        if len(affected_x):
            x0, x1 = max(0, affected_x.min() - 2), min(w, affected_x.max() + 3)
            y0, y1 = max(0, affected_y.min() - 2), min(h, affected_y.max() + 3)
            clone = painted_bgr[y0 + dy:y1 + dy, x0 + dx:x1 + dx].copy()
            if clone.shape[:2] != (y1 - y0, x1 - x0):
                raise SystemExit("Dormant smoke texture source is outside panorama")
            a = alpha[y0:y1, x0:x1, None]
            painted_bgr[y0:y1, x0:x1] = (
                painted_bgr[y0:y1, x0:x1] * (1 - a) + clone * a
            ).astype(np.uint8)

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

    # The same prop-removal stage may be supplied by future building plans.
    painted = cv2.cvtColor(painted_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    # Preserve painted table/wares brushwork. Inpainting entire 50px clusters
    # produces obvious brown holes, so reduce their saturation and brightness
    # instead: these are dusty, unpowered stock, not missing geometry.
    if plan.get("inactive_props"):
        props_mask = np.zeros((h, w), dtype=np.uint8)
        for polygon in plan["inactive_props"]:
            cv2.fillPoly(props_mask, [np.asarray(polygon, np.int32)], 255)
        soft = cv2.GaussianBlur(props_mask.astype(np.float32) / 255, (0, 0), 7) * .92
        gray = painted[:, :, 0] * .24 + painted[:, :, 1] * .58 + painted[:, :, 2] * .18
        unpowered = np.stack((gray * .41, gray * .42, gray * .45), axis=-1)
        painted = painted * (1 - soft[:, :, None]) + unpowered * soft[:, :, None]

    # One universal state conversion for all buildings: extinguish bright
    # warm/cold/magical emissions in hand-authored local source zones.
    # Do not darken all pixels in a building or create a transparent black haze.
    yy, xx = np.ogrid[:h, :w]
    source_rgb = painted.copy()
    red, green, blue = source_rgb[:, :, 0], source_rgb[:, :, 1], source_rgb[:, :, 2]
    warm = np.clip((red - green * .92) / 80, 0, 1) * np.clip((green - blue * .9) / 70, 0, 1)
    violet = np.clip((red + blue - green * 2) / 130, 0, 1)
    # Previous art only identified warm/violet emissive pixels. Arcane Nexus
    # retained living cyan/blue highlights even while the building was locked.
    blue = np.clip((blue - red * .78) / 75, 0, 1)
    cyan = np.clip((blue * .65 + green * .65 - red * 1.1) / 110, 0, 1)
    luminous = np.clip((np.max(source_rgb, axis=2) - 44) / 125, 0, 1)
    light_mask = np.zeros((h, w), dtype=np.float32)
    for x, y, rx, ry in plan["lamps"] + plan["emission_zones"]:
        r2 = ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2
        light_mask = np.maximum(light_mask, np.clip(1.0 - r2, 0, 1) ** 0.7)
    # Shared across the Nexus, Codex and Hall: unlike a global grayscale wash,
    # emissive suppression is evaluated only at actual painted light sources.
    # Dark, unpowered windows and worktables have no radiant highlight even
    # when the source is white rather than warm/violet/blue. Keep original
    # painted masonry, geometry, signs and neighboring buildings intact.
    chroma = np.maximum.reduce([warm, violet * .9, blue, cyan])
    suppression = np.clip(light_mask * luminous * (.42 + chroma * 2.35), 0, .97)
    gray = source_rgb[:, :, 0] * .24 + source_rgb[:, :, 1] * .58 + source_rgb[:, :, 2] * .18
    neutral = np.stack((gray * .30, gray * .33, gray * .39), axis=-1)
    painted = np.clip(painted * (1 - suppression[:, :, None]) + neutral * suppression[:, :, None], 0, 255)

    # Colour-key filtering alone leaves lantern glass, flames and red windows
    # looking inhabited. A shared, locally masked OFF treatment must remove
    # the *light source*, not darken the entire building or courtyard.
    for x, y, rx, ry in plan.get("cold_sources", []):
        # Never blacken painted stone. Only bright pixels at the source core
        # may dim; retain dark window frames and iron lamp housings.
        r2 = ((xx - x) / (rx * .60)) ** 2 + ((yy - y) / (ry * .62)) ** 2
        core = np.clip((1 - r2) * 2.0, 0, 1) ** 1.1
        emissive = np.clip((np.max(painted, axis=2) - 41) / 95, 0, 1)
        source_mask = (core * emissive * .94).astype(np.float32)
        gray = painted[:, :, 0] * .24 + painted[:, :, 1] * .58 + painted[:, :, 2] * .18
        off = np.stack((gray * .22, gray * .24, gray * .28), axis=-1)
        painted = painted * (1 - source_mask[:, :, None]) + off * source_mask[:, :, None]

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

    # Review-only coordinate map; needed to place small emission masks precisely.
    # Never load this annotated diagnostic image into the actual game.
    grid = proof.convert("RGB")
    d = ImageDraw.Draw(grid)
    for gx in range(0, SIZE[0], 100):
        d.line((gx, 0, gx, SIZE[1]), fill=(32, 205, 138), width=1)
        d.text((gx + 2, 2), str(gx), fill=(255, 255, 255), stroke_width=1,
               stroke_fill=(0, 0, 0))
    for gy in range(100, SIZE[1], 100):
        d.line((0, gy, SIZE[0], gy), fill=(32, 205, 138), width=1)
        d.text((2, gy + 2), str(gy), fill=(255, 255, 255), stroke_width=1,
               stroke_fill=(0, 0, 0))
    for name, plan in PLATES.items():
        for x, y, _, _ in plan.get("cold_sources", []):
            d.ellipse((x - 5, y - 5, x + 5, y + 5), outline=(255, 58, 49), width=2)
            d.text((x + 7, y - 12), f"{x},{y}", fill=(255, 225, 166),
                   stroke_width=1, stroke_fill=(0, 0, 0))
    coordinate_proof = ROOT / "docs/art/previews/refuge-vacancy-coordinate-map.webp"
    grid.save(coordinate_proof, "WEBP", quality=91, method=5)
    print(f"Built {coordinate_proof.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
