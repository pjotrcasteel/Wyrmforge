"""Review the FOUR cape-free runtime Hollowed actors, never the obsolete caped atlas.

This creates native-pixel motion GIFs from the *exact game atlases*. It does not
retouch, mirror, warp, resample or invent character poses. Ashling is reference only.
Usage: python tools/sprite-lab/review-hollow-cape-free-motion.py --output PATH
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/enemies"
HOLLOW = ART / "hollow-rigged"
ASHLING = ART / "ashling-rigged"
NAMES = [
    ("standard", "STANDARD", HOLLOW / "arms"),
    ("broken-arm-right", "BROKEN RIGHT ARM", HOLLOW / "arms"),
    ("one-arm-left", "MISSING LEFT ARM", HOLLOW / "arms"),
    ("broken-leg-left", "INJURED LEFT LEG", HOLLOW / "injuries"),
]
DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
BG = (22, 20, 25, 255)
SURFACE = (30, 28, 31, 255)
LABEL = (206, 191, 175, 255)
DIM = (128, 122, 125, 255)


def frames(atlas: Image.Image, frame_count: int, cell: int, direction: str):
    assert atlas.size == (frame_count * cell, 8 * cell), (
        "Wrong runtime atlas dimensions", atlas.size, frame_count, cell
    )
    row = DIRECTIONS.index(direction)
    return [
        atlas.crop((i * cell, row * cell, (i + 1) * cell, (row + 1) * cell))
        for i in range(frame_count)
    ]


def draw_panel(board: Image.Image, bounds, name: str, frame: Image.Image, anchor, world_size):
    x, y, w, h = bounds
    ink = ImageDraw.Draw(board)
    ink.rounded_rectangle((x + 3, y + 2, x + w - 4, y + h - 5), radius=8, fill=SURFACE)
    ink.text((x + 12, y + 10), name, font=ImageFont.load_default(), fill=LABEL)
    foot_x, foot_y = x + w // 2, y + 137
    ink.line((x + 25, foot_y, x + w - 25, foot_y), fill=(65, 60, 60, 255), width=1)
    # Match the runtime drawImage(cell, worldSize, anchor) without interpolation.
    draw_size = int(round(world_size))
    pose = frame if draw_size == frame.width else frame.resize(
        (draw_size, draw_size), resample=Image.Resampling.NEAREST
    )
    board.alpha_composite(
        pose, (int(round(foot_x - anchor[0] / frame.width * draw_size)),
               int(round(foot_y - anchor[1] / frame.height * draw_size)))
    )


def make_review(out: Path, direction: str, clip: str, hollow_meta, injury_meta, ashling_meta):
    hollow_count = 16
    hollow_fps = 25 if clip == "walk" else 12
    ash_meta = ashling_meta["clips"][clip]
    ash_fps = 24
    ash_atlas = Image.open(ASHLING / ash_meta["image"]).convert("RGBA")
    ash_frames = frames(ash_atlas, ash_meta["frames"], ash_meta["cell"], direction)
    actors = []
    for key, name, folder in NAMES:
        item = injury_meta["clips"][clip] if key == "broken-leg-left" else hollow_meta["clips"][key][clip]
        sheet = Image.open(folder / item["image"]).convert("RGBA")
        assert item["frames"] == hollow_count and item["cell"] == 96
        actors.append((name, frames(sheet, hollow_count, 96, direction),
                       item["anchor"], item["worldSize"]))

    # 390px mobile-native review. No actor pixels are enlarged for the GIF.
    screens = []
    for i in range(hollow_count):
        board = Image.new("RGBA", (390, 609), BG)
        ink = ImageDraw.Draw(board)
        ink.text((12, 10), f"CAPE-FREE HOLLOWED / {clip.upper()} / {direction}", fill=LABEL)
        ink.text((12, 28), "Exact shipped atlas frames  |  390px portrait", fill=DIM)
        for j, (name, poses, anchor, world_size) in enumerate(actors):
            draw_panel(board, ((j % 2) * 195, 51 + (j // 2) * 180, 195, 180),
                       name, poses[i], anchor, world_size)
        ash_index = int(i / hollow_fps * ash_fps) % ash_meta["frames"]
        draw_panel(board, (0, 411, 195, 180), "ASHLING (REFERENCE)", ash_frames[ash_index],
                   ash_meta["anchor"], ash_meta["worldSize"])
        ink.text((207, 459), "SOURCE MOTION ONLY", fill=LABEL)
        ink.text((207, 482), f"Hollow: {hollow_fps} fps", fill=DIM)
        ink.text((207, 503), f"Ashling: {ash_fps} fps", fill=DIM)
        ink.text((207, 526), "No cape. No frame edits.", fill=DIM)
        screens.append(board.convert("RGB"))
    file = out / f"{clip}-{direction}.gif"
    screens[0].save(file, save_all=True, append_images=screens[1:],
                    duration=int(round(1000 / hollow_fps)), loop=0, optimize=False)
    return str(file.name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    hollow_meta = json.loads((HOLLOW / "arms/manifest.json").read_text())
    injury_meta = json.loads((HOLLOW / "injuries/manifest.json").read_text())
    ashling_meta = json.loads((ASHLING / "manifest.json").read_text())
    assert hollow_meta["variants"] == [name for name, _, _ in NAMES[:3]]
    assert hollow_meta["directions"] == injury_meta["directions"] == ashling_meta["directions"] == DIRECTIONS
    files = [
        make_review(out, direction, clip, hollow_meta, injury_meta, ashling_meta)
        for direction in ("S", "E")
        for clip in ("walk", "attack")
    ]
    damaged_attack = (HOLLOW / "injuries/broken-leg-left-attack.png").read_bytes()
    standard_attack = (HOLLOW / "arms/standard-attack.png").read_bytes()
    same_attack = damaged_attack == standard_attack
    report = {
        "runtimeSource": "wwwroot/art/enemies/hollow-rigged/{arms,injuries}/",
        "capedAtlasUsed": False,
        "sourceFramesRetouched": False,
        "ashlingModified": False,
        "files": files,
        "brokenLegAttackIdenticalToHealthyStandard": same_attack,
        "brokenLegAttackSha256": hashlib.sha256(damaged_attack).hexdigest(),
        "standardAttackSha256": hashlib.sha256(standard_attack).hexdigest(),
        "review": "Motion / gait / acting require human approval; these GIFs are baseline evidence, not an authored overhaul.",
    }
    (out / "diagnostics.json").write_text(json.dumps(report, indent=2) + "\n")
    (out / "README.md").write_text(
        "# Hollowed cape-free runtime motion review\n\n"
        + "\n".join(f"![{name}]({name})" for name in files)
        + "\n\n## Source integrity\n"
        + "Four cape-free Hollowed variants and unchanged Ashling, from the exact runtime PNGs.\n"
        + f"Broken-leg attack is byte-identical to healthy standard: **{same_attack}**.\n"
        + "This is a **known motion-continuity defect requiring new authored 3D attack art**, "
          "not a reason to paint or distort the existing PNGs.\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
