#!/usr/bin/env python3
"""Stage licensed, artist-drawn Anokolisa Pixel Crawler Wizard pixels for review.

The user-supplied Entities.zip stays outside the public repository.
This is an isolated source-art study; no runtime sprite assets are changed.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

from PIL import Image


CELL = (64, 80)
FEET_ANCHOR = (32, 74)
RUN_MEMBER = "Entities/Npc's/Wizzard/Run/Run-Sheet.png"
IDLE_MEMBER = "Entities/Npc's/Wizzard/Idle/Idle-Sheet.png"
EXPECTED = {
    RUN_MEMBER: ("c4bd31327e7f38ea25916789d8282fd33fd5fc0eec3eb7c0d0f0937a8c2234f7", (384, 64)),
    IDLE_MEMBER: ("36364a201200b4ef29d982d736b97db668eaca5eb41eadf40e1867cf5e09175d", (128, 32)),
}


GREY_GARMENT_PALETTE = {
    (147, 45, 139): (115, 112, 120),
    (95, 46, 92): (75, 74, 82),
    (38, 26, 38): (35, 36, 41),
    (67, 35, 65): (52, 52, 60),
}


def recolor_garment(source: Image.Image) -> Image.Image:
    """Optional Gandalf-grey cloth palette variant without redrawing pixels."""
    result = source.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha:
                red, green, blue = GREY_GARMENT_PALETTE.get(
                    (red, green, blue), (red, green, blue)
                )
                pixels[x, y] = (red, green, blue, alpha)
    return result


def read_source(pack: zipfile.ZipFile, member: str) -> Image.Image:
    data = pack.read(member)
    checksum, size = EXPECTED[member]
    if hashlib.sha256(data).hexdigest() != checksum:
        raise ValueError(f"Unexpected source pixels: {member}; verify the supplied pack")
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    if image.size != size:
        raise ValueError(f"Unexpected source dimensions for {member}: {image.size}")
    return image


def render_run_frames(source: Image.Image) -> list[Image.Image]:
    """Fixed crop and 2x nearest-neighbor scale; do not redraw the artist's pixels."""
    frames = []
    for index in range(6):
        frame = Image.new("RGBA", CELL)
        source_pixels = source.crop((64 * index + 16, 27, 64 * index + 48, 64))
        frame.paste(source_pixels.resize((64, 74), Image.Resampling.NEAREST), (0, 0))
        frames.append(frame)
    return frames


def render_idle_frames(source: Image.Image) -> list[Image.Image]:
    frames = []
    for index in range(4):
        frame = Image.new("RGBA", CELL)
        source_pixels = source.crop((32 * index, 0, 32 * (index + 1), 32))
        frame.paste(source_pixels.resize((64, 64), Image.Resampling.NEAREST), (0, 10))
        frames.append(frame)
    return frames


def save_atlas(frames: list[Image.Image], destination: Path) -> None:
    atlas = Image.new("RGBA", (CELL[0] * len(frames), CELL[1]))
    for index, frame in enumerate(frames):
        if frame.size != CELL:
            raise ValueError("Frame must be native 64x80")
        atlas.paste(frame, (CELL[0] * index, 0))
    atlas.save(destination)


def save_review(frames: list[Image.Image], destination: Path) -> None:
    review = []
    for frame in frames:
        background = Image.new("RGBA", (256, 320), (23, 24, 30, 255))
        background.alpha_composite(frame.resize((256, 320), Image.Resampling.NEAREST))
        review.append(background.convert("RGB"))
    review[0].save(
        destination,
        format="GIF",
        save_all=True,
        append_images=review[1:],
        duration=125,
        loop=0,
        optimize=False,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, required=True, help="User-owned Entities.zip")
    parser.add_argument("--out", type=Path, required=True, help="New, empty review directory")
    args = parser.parse_args()
    if args.out.exists():
        parser.error("Output already exists; refusing to overwrite art")

    with zipfile.ZipFile(args.pack) as pack:
        run_source = read_source(pack, RUN_MEMBER)
        idle_source = read_source(pack, IDLE_MEMBER)
        run = render_run_frames(run_source)
        idle = render_idle_frames(idle_source)
        grey_run = render_run_frames(recolor_garment(run_source))
        grey_idle = render_idle_frames(recolor_garment(idle_source))

    args.out.mkdir(parents=True)
    save_atlas(run, args.out / "run-side-6f-64x80.png")
    save_atlas(idle, args.out / "idle-side-4f-64x80.png")
    save_review(run, args.out / "run-side-review.gif")
    save_atlas(grey_run, args.out / "run-side-grey-6f-64x80.png")
    save_atlas(grey_idle, args.out / "idle-side-grey-4f-64x80.png")
    save_review(grey_run, args.out / "run-side-grey-review.gif")

    manifest = {
        "author": "Anokolisa",
        "source": "Pixel Crawler Entities (user-provided licensed pack)",
        "sourceFilesRedistributed": False,
        "nativeCell": list(CELL),
        "feetAnchor": list(FEET_ANCHOR),
        "actualArtistPixels": True,
        "transforms": ["fixed crop", "nearest-neighbor 2x", "feet alignment"],
        "optionalGreyVariant": "exact four-color cloth palette swap; source output retained",
        "clips": {"idle": 4, "run": 6},
        "direction": "side-facing candidate only; compass not approved",
        "status": "isolated unapproved study; no walking staff or eight-way art",
    }
    (args.out / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
