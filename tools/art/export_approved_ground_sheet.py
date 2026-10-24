#!/usr/bin/env python3
"""Display-only contact sheet made from the six EXISTING approved material source tiles.
No repainting, blending, color transforms, lighting or synthesized art.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

MATERIALS = [
    ("01", "Grass / Moss", "Main forest substrate", "WET FOREST"),
    ("02", "Wet Mud", "Waterlogged earth", "WET FOREST"),
    ("03", "Old Paving", "Reserved for roads / ruins", "OTHER CONTEXT"),
    ("04", "Trampled Earth", "Footpath / trail core", "WET FOREST"),
    ("05", "Scorched Ground", "Fire corruption / damage", "FIRE CONTEXT"),
    ("06", "Marsh / Wet Bank", "Saturated forest margins", "WET FOREST"),
]

def font(size: int, bold: bool = False):
    base = "/usr/share/fonts/truetype/dejavu/DejaVuSans"
    name = base + ("-Bold.ttf" if bold else ".ttf")
    return ImageFont.truetype(name, size) if Path(name).exists() else ImageFont.load_default()

def render(source: Path, output: Path):
    atlas = Image.open(source).convert("RGB")
    if atlas.size != (672, 112):
        raise ValueError(f"Expected six 112px ground paintings, got {atlas.size}")
    w, h = 1548, 1160
    img = Image.new("RGB", (w, h), (15, 19, 25))
    draw = ImageDraw.Draw(img)
    cream, muted, amber = (232, 225, 212), (157, 167, 170), (198, 144, 105)
    draw.text((80, 47), "WYRMFORGE", font=font(52, True), fill=cream)
    draw.text((82, 119), "WET FOREST  /  APPROVED GROUND MATERIALS", font=font(20, True), fill=amber)
    draw.text((82, 155), "Actual in-repository source tiles  •  unmodified pixel art  •  no generated replacements", font=font(18), fill=muted)
    draw.line((80, 195, w - 80, 195), fill=(68, 78, 85), width=2)
    left, top, block_w, block_h, gap_x, gap_y, preview = 80, 235, 432, 390, 45, 38, 336
    for i, (num, title, detail, context) in enumerate(MATERIALS):
        row, col = divmod(i, 3)
        x, y = left + col * (block_w + gap_x), top + row * (block_h + gap_y)
        draw.rounded_rectangle((x, y, x + block_w, y + block_h), radius=10,
                               fill=(25, 31, 39), outline=(65, 76, 85), width=2)
        original = atlas.crop((i * 112, 0, (i + 1) * 112, 112))
        img.paste(original.resize((preview, preview), Image.Resampling.NEAREST),
                  (x + (block_w - preview) // 2, y + 16))
        draw.rectangle((x + 48, y + 16, x + 48 + preview - 1, y + 16 + preview - 1),
                       outline=(106, 120, 124), width=2)
        draw.text((x + 18, y + 358), f"{num}   {title}", font=font(20, True), fill=cream)
        draw.text((x + 2, y + block_h + 4), f"{context}  /  {detail}",
                  font=font(14), fill=amber if context == "WET FOREST" else muted)
    draw.line((80, 1087, w - 80, 1087), fill=(68, 78, 85), width=2)
    draw.text((80, 1105),
              "SOURCE: wet-forest-materials-painted.webp  |  112 × 112 original pixels per painting  |  nearest-neighbour ×3",
              font=font(15), fill=muted)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, optimize=True)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    a = p.parse_args()
    render(a.source, a.output)
