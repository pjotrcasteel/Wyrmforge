#!/usr/bin/env python3
"""Create a reviewable T0/T2 contact sheet from REAL Playwright screenshots.

Never invents art or substitutes an illustration. Missing images fail rather than
silently using older runs; accepted visual results require owner review.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SLOTS = [
    ("ORIGINAL NIGHT TOWN", "town-t0-original-centre-{width}.png"),
    ("GPU NIGHT / ORIGINAL STONE", "town-t2-source-night-{width}.png"),
    ("GPU NIGHT / NEUTRAL STONE", "town-t2-neutral-night-{width}.png"),
    ("GPU DAY / NEUTRAL STONE", "town-t2-neutral-day-{width}.png"),
    ("GPU ACTUAL SHADOW VISIBILITY", "town-t2-shadows-live-crowd-{width}.png"),
    ("GPU ZERO-LIGHT WORLD", "town-t2-zero-light-{width}.png"),
]

def make_sheet(directory: Path, width: int) -> Path:
    paths = [(title, directory / pattern.format(width=width)) for title, pattern in SLOTS]
    absent = [str(path) for _, path in paths if not path.is_file()]
    if absent:
        raise FileNotFoundError("Real-game screenshots missing:\n" + "\n".join(absent))
    sources = [(title, Image.open(path).convert("RGB")) for title, path in paths]
    sizes = {image.size for _, image in sources}
    if len(sizes) != 1:
        raise ValueError(f"Mismatched viewport sizes (possible invalid comparison): {sizes}")
    original_width, original_height = sources[0][1].size
    if original_width != width or original_height < 300:
        raise ValueError("Unexpected screenshot dimensions: cannot align original and GPU captures")

    outer = 18
    header = 90
    strip = 34
    columns = 3
    rows = 2
    cell_width = original_width + outer
    cell_height = original_height + strip + outer
    sheet = Image.new("RGB", (columns * cell_width + outer, rows * cell_height + header + outer), "#0b101b")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 17)
        heading_font = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
        heading_font = font
    draw.text((outer, 12), "WYRMFORGE T0/T2  |  ORIGINAL vs ACTUAL IN-GAME GPU",
              font=heading_font, fill="#f4ead7")
    draw.text((outer, 49),
              f"{width}px viewport  •  same canonical Town  •  T2 experimental / NOT visually approved",
              font=font, fill="#bac2d0")
    for index, (title, image) in enumerate(sources):
        column = index % columns
        row = index // columns
        left = outer + column * cell_width
        top = header + row * cell_height
        draw.text((left, top), title, font=font, fill="#f6d49a")
        sheet.paste(image, (left, top + strip))
    destination = directory / f"town-t0-t2-side-by-side-{width}.png"
    sheet.save(destination, optimize=True)
    return destination

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--width", type=int, action="append", required=True)
    arguments = parser.parse_args()
    for width in arguments.width:
        print(make_sheet(arguments.directory, width))

if __name__ == "__main__":
    main()
