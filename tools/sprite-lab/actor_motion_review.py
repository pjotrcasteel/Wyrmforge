#!/usr/bin/env python3
"""Reusable offline review of genuine Blender-rendered actor frames.

Produces visual evidence only: NEVER fabricates poses, overrides C# gameplay,
or certifies anatomical/physics quality through pixel statistics.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw


def review_frames(source: Path, output: Path, frames: int = 16, fps: int = 12) -> dict:
    if not 2 <= frames <= 256 or not 1 <= fps <= 60:
        raise ValueError("Invalid clip frame count or frame rate")
    originals = []
    for index in range(frames):
        path = source / f"frame-{index:02d}.png"
        if not path.exists():
            raise FileNotFoundError(f"Missing authored review frame: {path}")
        with Image.open(path) as image:
            originals.append(image.convert("RGBA"))
    size = originals[0].size
    if size[0] < 32 or size[1] < 32 or any(image.size != size for image in originals):
        raise ValueError("Frames must have matching practical dimensions")
    differences = []
    for i in range(frames):
        a = originals[i].convert("RGB")
        b = originals[(i + 1) % frames].convert("RGB")
        delta = ImageChops.difference(a, b).convert("L")
        changed = delta.point(lambda value: 255 if value > 12 else 0)
        count = changed.histogram()[255]
        differences.append(round(count * 100 / (size[0] * size[1]), 3))
    output.mkdir(parents=True, exist_ok=True)
    columns = min(4, frames)
    rows = (frames + columns - 1) // columns
    margin = 12
    label = 20
    cellw = size[0] + 2 * margin
    cellh = size[1] + label + 2 * margin
    sheet = Image.new("RGB", (columns * cellw, rows * cellh), (24, 25, 29))
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(originals):
        x = (i % columns) * cellw + margin
        y = (i // columns) * cellh + margin
        sheet.paste(frame.convert("RGB"), (x, y))
        draw.text((x + 4, y + size[1] + 3),
                  f"{i:02d}  changed {differences[i]:.2f}%",
                  fill=(214, 212, 205))
    sheet.save(output / "motion-contact-sheet.png")
    originals[0].save(output / "motion-loop.gif", save_all=True,
                      append_images=originals[1:], duration=round(1000 / fps),
                      loop=0, disposal=2, optimize=False)
    report = {
        "frameCount": frames, "fps": fps, "frameSize": list(size),
        "changedPixelsPercent": differences,
        "minChangedPixelsPercent": min(differences),
        "maxChangedPixelsPercent": max(differences),
        "identicalAdjacentFrames": [i for i, value in enumerate(differences) if value == 0],
        "silhouetteAndFootPlantArtistApproved": False,
        "clothArtistApproved": False,
        "note": "Visual difference metrics DO NOT certify natural motion or gameplay quality."
    }
    (output / "motion-review.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=16)
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args()
    print(json.dumps(review_frames(args.source, args.output, args.frames, args.fps), indent=2))
