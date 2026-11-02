#!/usr/bin/env python3
"""Render genuine Sotudios Rotwalker SOURCE in true WyrmForge 96px cells.

This is a mobile pixel-fidelity DIAGNOSTIC, NOT a new Hollowed model, accepted
pose, animation export, in-game capture or permission to merge. The character
is rendered in Blender AT 96x96; no downsizing from a glossy 320px render.
The eight directions share one deliberately restrained diagnostic palette.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image


DIRECTIONS = ("front", "front-right", "right", "back-right",
              "back", "back-left", "left", "front-left")
CELL = 96
TARGET_HEIGHT = 60
TARGET_HEIGHT_RANGE = (56, 64)
REVIEW_PALETTE_COLORS = 48
REVIEW_PIVOT = (48, 72)
SCOPE = (Path.cwd() / "artifacts/hollowed-reference-v2").resolve()


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def genuine_mesh_bounds(mesh_objects):
    deps = bpy.context.evaluated_depsgraph_get()
    low = [float("inf")] * 3
    high = [float("-inf")] * 3
    for obj in mesh_objects:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                world = evaluated.matrix_world @ vertex.co
                for axis in range(3):
                    low[axis] = min(low[axis], world[axis])
                    high[axis] = max(high[axis], world[axis])
        finally:
            evaluated.to_mesh_clear()
    if not all(math.isfinite(v) for v in low + high):
        raise ValueError("No real evaluated model vertices for native review")
    return Vector(low), Vector(high)


def neutral_clay():
    material = bpy.data.materials.new("UNAPPROVED Rotwalker native mobile clay")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (.56, .49, .41, 1)
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Roughness"].default_value = .96
    shader.inputs["Emission Strength"].default_value = 0
    return material


def prepare_real_blender_camera(meshes):
    scene = bpy.context.scene
    low, high = genuine_mesh_bounds(meshes)
    span = high - low
    if not 2.7 < span.z < 2.95:
        raise ValueError(f"Source height unexpectedly changed; no silent auto-scaling: {span.z}")
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"

    cam_data = bpy.data.cameras.new("WyrmForge SOURCE review 96px orthographic")
    camera = bpy.data.objects.new("WyrmForge SOURCE review 96px orthographic", cam_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    cam_data.type = "ORTHO"
    # 96px cell with character occupying 60 source pixels in height.
    # A high-res input shrunk afterward is NOT a true native-scale proof.
    cam_data.ortho_scale = span.z * CELL / TARGET_HEIGHT
    center = (low + high) * .5
    # Legacy source-review pivot [48,72] => 24px below image center.
    # Eye height/foreshortening remains a later runtime-camera parity check.
    focus = Vector((center.x, center.y, low.z + span.z * .40))

    for name, loc, energy in (
        ("Hollowed pixel review key", (-3.5, -4, 5.5), 430),
        ("Hollowed pixel review rim", (4, 3.0, 4.5), 240),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        lamp = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(lamp)
        lamp.location = focus + Vector(loc)
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = 4
        look_at(lamp, focus)

    return camera, focus, {
        "actual_model_height_m": round(float(span.z), 6),
        "projection": "orthographic",
        "cell_px": [CELL, CELL],
        "requested_occupancy_px": TARGET_HEIGHT,
        "review_pivot_px": list(REVIEW_PIVOT),
        "camera_ortho_scale_m": round(float(cam_data.ortho_scale), 6),
        "review_only_not_final_runtime_camera": True,
    }


def alpha_binary(image):
    if image.size != (CELL, CELL):
        raise ValueError(f"Non-native output cannot be shown as mobile QC: {image.size}")
    mask = image.getchannel("A").point(lambda alpha: 255 if alpha >= 128 else 0)
    if mask.getbbox() is None:
        raise ValueError("Completely transparent character frame")
    image.putalpha(mask)
    return image


def read_actual_frames(output, camera, focus):
    original = []
    scene = bpy.context.scene
    for index, direction in enumerate(DIRECTIONS):
        angle = math.tau * index / len(DIRECTIONS)
        # Same approximate sightline as the independent anatomy audit.
        # Not a claim that the future 2.5D gameplay camera is identical.
        camera.location = (focus.x + 6.0 * math.sin(angle),
                           focus.y - 6.0 * math.cos(angle), focus.z + .35)
        look_at(camera, focus)
        filename = output / f"direct-96px-real-blender-{direction}.png"
        scene.render.filepath = str(filename)
        bpy.ops.render.render(write_still=True)
        with Image.open(filename) as img:
            raw = img.convert("RGBA")
        original.append(alpha_binary(raw))
    return original


def shared_palette(raw_frames):
    # Quantize all directions together, so rotating does not swap
    # independent per-direction color ramps.
    joined = Image.new("RGB", (CELL * len(DIRECTIONS), CELL))
    for i, source in enumerate(raw_frames):
        joined.paste(source.convert("RGB"), (i * CELL, 0))
    indexed = joined.quantize(colors=REVIEW_PALETTE_COLORS,
                              method=Image.Quantize.MEDIANCUT,
                              dither=Image.Dither.NONE)
    rgb = indexed.convert("RGB")
    sprites = []
    for i, raw in enumerate(raw_frames):
        crop = rgb.crop((i*CELL, 0, (i+1)*CELL, CELL)).convert("RGBA")
        crop.putalpha(raw.getchannel("A"))
        sprites.append(crop)
    return sprites


def grid(images, background=None):
    image = Image.new("RGBA", (4*CELL, 2*CELL), (0, 0, 0, 0))
    for i, sprite in enumerate(images):
        image.alpha_composite(sprite, (i % 4 * CELL, i // 4 * CELL))
    if background is not None:
        dst = Image.new("RGBA", image.size, (*background, 255))
        dst.alpha_composite(image)
        return dst.convert("RGB")
    return image


def enlarged_nearest(original, factor=4):
    return original.resize((original.width * factor, original.height * factor),
                           Image.Resampling.NEAREST)


def pixel_report(images):
    reports = []
    palette = set()
    for name, sprite in zip(DIRECTIONS, images):
        mask = sprite.getchannel("A")
        box = mask.getbbox()
        if box is None:
            raise ValueError(f"Direction {name} disappeared")
        x0, y0, x1, y1 = box
        height = y1-y0
        if x0 < 2 or y0 < 2 or x1 > 94 or y1 > 94:
            raise ValueError(f"Native source clipped against 96px cell: {name}: {box}")
        # Do not silently accept impossible camera occupancy. Actual
        # game-style target 56-64; 52-68 is just a technical safety envelope
        # for an unapproved, unsculpted T-pose source candidate.
        if not 52 <= height <= 68:
            raise ValueError(f"Model not framed at recognizably native game scale: {name}: {height}px")
        opaque = [tuple(pixel[:3]) for pixel in sprite.getdata() if pixel[3] == 255]
        palette.update(opaque)
        alpha_values = set(mask.getdata())
        if alpha_values - {0, 255}:
            raise ValueError(f"Antialiased halo remains after source preview alpha threshold: {name}")
        reports.append({
            "direction": name,
            "bbox_px": [x0, y0, x1, y1],
            "actor_height_px": height,
            "actor_width_px": x1-x0,
            "inside_preferred_56_to_64": TARGET_HEIGHT_RANGE[0] <= height <= TARGET_HEIGHT_RANGE[1],
            "binary_alpha": True
        })
    if len(palette) > REVIEW_PALETTE_COLORS:
        raise ValueError(f"Shared palette exceeded {REVIEW_PALETTE_COLORS} colors: {len(palette)}")
    return reports, len(palette)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source = args.input.resolve()
    output = args.output.resolve()
    if output == SCOPE or not output.is_relative_to(SCOPE):
        raise ValueError("Mobile source proof must be isolated from runtime assets")
    if not source.is_file():
        raise FileNotFoundError("Genuine independent 3D Blender source required")
    output.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    scene = bpy.context.scene
    if scene.get("hollowed_source_lineage") != "owner-reference-original-v2":
        raise ValueError("Missing new source lineage, cannot prove actual model identity")
    if scene.get("candidate_only") is not True:
        raise ValueError("Never silently promote candidate to finished Hollowed")
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not meshes or sum(len(o.data.vertices) for o in meshes) < 1000:
        raise ValueError("Native proof requires the genuine artist source mesh")
    if bpy.data.actions:
        raise ValueError("Native art inspection may not alter/author animation")
    camera, focus, camera_report = prepare_real_blender_camera(meshes)
    bpy.context.view_layer.material_override = neutral_clay()
    raw_frames = read_actual_frames(output, camera, focus)
    bpy.context.view_layer.material_override = None
    sprites = shared_palette(raw_frames)
    reports, ncolors = pixel_report(sprites)

    for direction, sprite in zip(DIRECTIONS, sprites):
        sprite.save(output/f"pixel-96x96-{direction}.png")

    rgba = grid(sprites)
    rgba.save(output/"pixel-96x96-8ways-TRANSPARENT.png")
    enlarged_nearest(rgba).save(output/"pixel-96x96-8ways-4x-NEAREST.png")
    dark = grid(sprites, background=(21, 23, 27))
    dark.save(output/"pixel-96x96-8ways-DARK-GROUND.png")
    enlarged_nearest(dark).save(output/"pixel-96x96-8ways-DARK-4x-NEAREST.png")
    silhouettes = []
    for sprite in sprites:
        black = Image.new("RGBA", sprite.size, (10, 11, 13, 0))
        black.putalpha(sprite.getchannel("A"))
        silhouettes.append(black)
    silhouette_grid = grid(silhouettes, background=(99, 100, 105))
    silhouette_grid.save(output/"pixel-96x96-8ways-SILHOUETTE.png")
    enlarged_nearest(silhouette_grid).save(
        output/"pixel-96x96-8ways-SILHOUETTE-4x-NEAREST.png")

    manifest = {
        "status": "UNAPPROVED Rotwalker body/source scale review, not gameplay screenshot",
        "source": source.name,
        "source_h1_reused": False,
        "cell_px": [CELL, CELL],
        "preferred_actor_height_px": list(TARGET_HEIGHT_RANGE),
        "shared_diagnostic_palette_colors_max": REVIEW_PALETTE_COLORS,
        "actual_colors_used": ncolors,
        "alpha_binary": True,
        "dithering": False,
        "preview_upscaling": "NEAREST ×4 only",
        "direct_blender_native_96px_renders": True,
        "camera": camera_report,
        "eight_views": reports,
        "existing_universal_lighting_engine_unmodified": True,
        "existing_universal_animation_engine_unmodified": True,
        "gameplay_or_existing_atlas_modified": False,
        "physical_mobile_device_tested": False,
        "owner_approved": False,
    }
    (output/"mobile-pixel-proof.json").write_text(json.dumps(manifest, indent=2)+"\n",
                                                  encoding="utf-8")
    print("ACTUAL NATIVE-SCALE ROTWALKER PROOF — STILL UNAPPROVED", json.dumps(manifest))


if __name__ == "__main__":
    main()
