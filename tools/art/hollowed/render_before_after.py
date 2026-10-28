"""Render genuine source-Blender before/after Hollowed visual QC, not fake art."""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from PIL import Image, ImageDraw, ImageFont

DIRECTIONS = {"S": 4, "E": 2, "N": 0, "W": 6}
CLIPS = {"walk": "AN1_walk_supported_v1", "attack": "AN1_attack_supported_v1"}
FRAMES = (0, 4, 8, 12)
CELL = 96
SCALE = 3


def capture(source: Path, target: Path):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    rig = bpy.data.objects.get("Hollow editable animation rig")
    view = bpy.data.objects.get("AN unanimated view")
    actor = bpy.data.objects.get("Hollow skinned character")
    if rig is None or view is None or actor is None:
        raise ValueError(f"Not a genuine AN Hollowed Blender source: {source}")
    camera = scene.camera
    if camera is None:
        raise ValueError("Source camera is missing")

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.view_settings.view_transform = "Standard"
    front = math.atan2(-3.2, 2.2) + math.pi / 2
    images = {}
    for clip, action_name in CLIPS.items():
        action = bpy.data.actions.get(action_name)
        if action is None:
            raise ValueError(f"Source authored clip absent: {action_name}")
        rig.animation_data_create()
        rig.animation_data.action = action
        for direction, row in DIRECTIONS.items():
            if direction not in ("S", "E"):
                continue
            view.rotation_euler.z = front + math.pi - row * math.pi / 4
            for frame in FRAMES:
                scene.frame_set(frame + 1)
                bpy.context.view_layer.update()
                outfile = target / f"{clip}-{direction}-{frame:02d}.png"
                scene.render.filepath = str(outfile)
                bpy.ops.render.render(write_still=True)
                image = Image.open(outfile).convert("RGBA")
                if image.getbbox() is None:
                    raise ValueError(f"Empty character frame: {outfile}")
                images[(clip, direction, frame)] = image.copy()
    return images


def alpha_islands(image):
    alpha = image.getchannel("A")
    pixels = alpha.load()
    opaque = {(x, y) for y in range(image.height) for x in range(image.width)
              if pixels[x, y] > 32}
    islands = []
    while opaque:
        start = opaque.pop()
        component = {start}
        stack = [start]
        while stack:
            x, y = stack.pop()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in opaque:
                    opaque.remove(neighbor)
                    component.add(neighbor)
                    stack.append(neighbor)
        islands.append(component)
    return {
        "opaqueIslands": len(islands),
        "tinyIslandsAtMostThreePixels": sum(len(part) <= 3 for part in islands),
        "largestIslandPixels": max(map(len, islands), default=0),
    }


def build_sheet(pre, post, out):
    rows = [(clip, direction, version)
            for clip in CLIPS for direction in ("S", "E")
            for version in ("before", "after")]
    label_width, row_height, heading_height = 245, CELL * SCALE + 18, 42
    sheet = Image.new("RGB",
                      (label_width + 4 * CELL * SCALE,
                       heading_height + len(rows) * row_height),
                      (36, 38, 40))
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 10), "Real AN Hollowed / before vs art candidate", fill="white")
    qc = []
    for row, (clip, direction, version) in enumerate(rows):
        y = heading_height + row * row_height
        draw.text((10, y + 15), f"{clip} / {direction} / {version}",
                  fill=(232, 221, 202))
        for col, frame in enumerate(FRAMES):
            img = (pre if version == "before" else post)[(clip, direction, frame)]
            bbox = img.getbbox()
            if bbox is None:
                raise ValueError("Blank render in review")
            enlarged = img.resize((CELL * SCALE, CELL * SCALE),
                                 Image.Resampling.NEAREST)
            bg = Image.new("RGBA", enlarged.size, (57, 59, 62, 255))
            bg.alpha_composite(enlarged)
            sheet.paste(bg.convert("RGB"),
                        (label_width + col * CELL * SCALE, y))
            diagnostics = alpha_islands(img)
            diagnostics.update({"clip": clip, "direction": direction,
                                "version": version, "frame": frame,
                                "alphaBBox": list(bbox)})
            qc.append(diagnostics)
    sheet.save(out / "real-hollowed-before-after.png")
    (out / "image-qc.json").write_text(json.dumps(qc, indent=2) + "\n",
                                       encoding="utf-8")
    print("HOLLOW_RENDER_COMPLETE", out / "real-hollowed-before-after.png",
          flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", type=Path, required=True)
    parser.add_argument("--after", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:]
                             if "--" in sys.argv else [])
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    before_dir, after_dir = out / "before", out / "after"
    before_dir.mkdir(exist_ok=True)
    after_dir.mkdir(exist_ok=True)
    original = capture(args.before.resolve(), before_dir)
    polished = capture(args.after.resolve(), after_dir)
    build_sheet(original, polished, out)


if __name__ == "__main__":
    main()
