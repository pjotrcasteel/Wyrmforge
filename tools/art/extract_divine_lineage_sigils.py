#!/usr/bin/env python3
"""Extract WyrmForge's owner-approved pixel school emblems without redrawing them.

Usage:
    python tools/art/extract_divine_lineage_sigils.py path/to/approved-six-school-sheet.png

Requires Pillow. The exact approved source is the 1536x1024 six-card sheet
created on 20 October 2026 (fire, frost, yellow storm / purple arcane,
green necromancy, bear summoner). Do not use generic replacement glyphs.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

TILE_BOXES = (
    (82, 60, 479, 459),     # Fire
    (570, 60, 965, 459),   # Frost
    (1057, 60, 1453, 459), # Storm
    (82, 530, 479, 933),   # Arcane
    (570, 530, 965, 933),  # Necromancy
    (1057, 530, 1453, 933),# Summoner
)
SIZE = 64


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Owner-approved 1536x1024 six-icon source image")
    parser.add_argument("--output", type=Path, default=Path(
        "src/Wyrmforge.Presentation.Web/wwwroot/art/divine-lineage-sigils.webp"))
    args = parser.parse_args()

    with Image.open(args.source) as original:
        if original.size != (1536, 1024):
            raise SystemExit(f"Expected the canonical 1536x1024 sheet, got {original.size}")
        source = original.convert("RGB")

    atlas = Image.new("RGB", (3 * SIZE, 2 * SIZE), (10, 10, 14))
    for index, (left, top, _, _) in enumerate(TILE_BOXES):
        # Crop the center painting; labels and framing are rendered by accessible HTML/CSS.
        painting = source.crop((left + 55, top + 48, left + 340, top + 333))
        tile = painting.resize((SIZE, SIZE), Image.Resampling.NEAREST)
        atlas.paste(tile, ((index % 3) * SIZE, (index // 3) * SIZE))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, "WEBP", quality=60, method=6)
    print(f"Extracted six pixel sigils to {args.output} ({atlas.width}x{atlas.height})")


if __name__ == "__main__":
    main()
