"""Author source-skinned Feral and Crippled Hollowed MOTION REVIEW candidates.

Source is the CURRENT cape-free 3D Blender character (not the discarded cape
atlas). No gameplay or runtime assets are changed, and no owner approval is
inferred. Preview renders only S/E to constrain CI CPU time. A true crawler
needs independent low-contact rig animation and is not fabricated here.

Run with bpy 4.5 and Pillow:
python tools/sprite-lab/author-hollow-horde-motion.py
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
OUT = ROOT / "artifacts/hollow-horde-motion"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
PREVIEW_DIRECTIONS = ("S", "E")
FRAMES = 16
CELL = 96
ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
SOURCES = {
    "frenzied": MODEL / "rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend",
    "crippled": MODEL / "rigged-hollow-zombie-reach-v3-broken-leg-left/hollow-rigged.blend",
}
FPS = {"frenzied": 25, "crippled": 15}
OUT.mkdir(parents=True, exist_ok=True)


def apply_rotation(bones, name, axis, degrees):
    bone = bones[name]
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = (
        Quaternion(Vector(axis), math.radians(degrees)) @ bone.rotation_quaternion
    ).normalized()


def author(name: str):
    source_path = SOURCES[name]
    if not source_path.is_file() or source_path.read_bytes()[:7] != b"BLENDER":
        raise RuntimeError(f"Real editable Blender source required: {source_path}")
    bpy.ops.wm.open_mainfile(filepath=str(source_path))
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    rig = bpy.data.objects["Hollow editable animation rig"]
    mesh = bpy.data.objects["Hollow skinned character"]
    assert any(m.type == "ARMATURE" and m.object == rig for m in mesh.modifiers)
    assert len(mesh.data.polygons) > 1000
    assert rig.animation_data and rig.animation_data.action
    assert scene.camera is not None and scene.camera.data.type == "ORTHO"

    source_action = rig.animation_data.action
    required = {"pelvis", "spine", "chest", "neck", "head", "upper_arm.L",
                "upper_arm.R", "forearm.L", "forearm.R", "thigh.L", "thigh.R",
                "shin.L", "shin.R", "foot.L", "foot.R"}
    bones = {b.name: b for b in rig.pose.bones}
    assert required.issubset(bones)

    # Read all source poses BEFORE keying new action curves. The stored bone
    # basis matrices are source 3D skeletal poses, not drawn sprite positions.
    source_poses = []
    for frame in range(1, FRAMES + 1):
        scene.frame_set(frame)
        source_poses.append({key: b.matrix_basis.copy() for key, b in bones.items()})

    action = source_action.copy()
    action.name = f"Hollow_Horde_{name.title()}_Review_v1"
    action.use_fake_user = True
    rig.animation_data.action = action

    for index, saved in enumerate(source_poses):
        frame = index + 1
        scene.frame_set(frame)
        for key, matrix in saved.items():
            bones[key].matrix_basis = matrix
        bpy.context.view_layer.update()

        phase = 2 * math.pi * index / FRAMES
        if name == "frenzied":
            # Low, searching head. Abrupt unequal shoulders and dominant
            # forearm lead, with two authored attention beats per stride.
            lurch = max(0, math.sin(phase * 2 - .5))
            hunt = math.sin(phase)
            apply_rotation(bones, "pelvis", (1, 0, 0), 6 + 3 * hunt)
            apply_rotation(bones, "spine", (1, 0, 0), 11 + 6 * lurch)
            apply_rotation(bones, "chest", (1, 0, 0), 9 + 5 * lurch)
            apply_rotation(bones, "chest", (0, 0, 1), 6 * hunt)
            apply_rotation(bones, "neck", (1, 0, 0), -10 - 5 * lurch)
            apply_rotation(bones, "head", (0, 0, 1), 6 * math.sin(phase * 2 + .4))
            apply_rotation(bones, "upper_arm.L", (1, 0, 0), 9 + 11 * lurch)
            apply_rotation(bones, "upper_arm.R", (1, 0, 0), -13 - 7 * hunt)
            apply_rotation(bones, "forearm.L", (1, 0, 0), -12 - 7 * lurch)
            apply_rotation(bones, "forearm.R", (1, 0, 0), -8 + 5 * hunt)
        else:
            # Preserve the actual broken-leg source. Add compensatory torso
            # weight shift, stiff injured-side foot, trailing arms and an
            # uneven head beat; DO NOT fake crawling or change root travel.
            limp = max(0, math.sin(phase + .6))
            shift = math.sin(phase)
            apply_rotation(bones, "pelvis", (0, 1, 0), -4 - 4 * limp)
            apply_rotation(bones, "spine", (0, 1, 0), 5 + 6 * limp)
            apply_rotation(bones, "chest", (1, 0, 0), 10 + 3 * limp)
            apply_rotation(bones, "neck", (0, 0, 1), 4 * shift)
            apply_rotation(bones, "head", (1, 0, 0), -6 + 5 * limp)
            apply_rotation(bones, "upper_arm.L", (1, 0, 0), -8)
            apply_rotation(bones, "upper_arm.R", (1, 0, 0), 6 + 5 * limp)
            apply_rotation(bones, "forearm.L", (1, 0, 0), 8)
            apply_rotation(bones, "forearm.R", (1, 0, 0), -5)

        bpy.context.view_layer.update()
        # The action remains 3D skeletal data with 16 new articulated poses.
        for key, bone in bones.items():
            bone.keyframe_insert("location", frame=frame, group=key)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=key)
            bone.keyframe_insert("scale", frame=frame, group=key)

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.render.film_transparent = True
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.fps = FPS[name]
    original_yaw = rig.rotation_euler.z

    report = {"actor": "hollowed", "version": 1, "archetype": name,
              "sourceRig": str(source_path.relative_to(ROOT)),
              "sourceAction": source_action.name, "newAction": action.name,
              "frames": FRAMES, "fps": FPS[name],
              "directionsReviewed": list(PREVIEW_DIRECTIONS),
              "cape": False, "sourceSkinned3D": True,
              "ownerApproved": False, "runtimeIntegrated": False,
              "simulationSpeedChanged": False, "gameplayModified": False}
    for direction in PREVIEW_DIRECTIONS:
        row = DIRECTIONS.index(direction)
        rig.rotation_euler.z = original_yaw + math.radians(ROTATION + 180 - row * 45)
        rendered = []
        for index in range(FRAMES):
            scene.frame_set(index + 1)
            temp = OUT / f"_temp_{name}_{direction}_{index}.png"
            scene.render.filepath = str(temp)
            bpy.ops.render.render(write_still=True)
            pixel = Image.open(temp).convert("RGBA")
            temp.unlink()
            assert pixel.size == (CELL, CELL)
            box = pixel.getbbox()
            if not box or min(box[:2]) <= 0 or max(box[2:]) >= CELL:
                raise ValueError(f"Empty/clipped true 3D pose {name}/{direction}/{index}: {box}")
            rendered.append(pixel)
        review = []
        for index, frame in enumerate(rendered):
            board = Image.new("RGBA", (196, 178), (21, 19, 24, 255))
            ink = ImageDraw.Draw(board)
            ink.text((10, 10), f"HOLLOWED / {name.upper()}", fill=(219, 197, 169))
            ink.text((10, 26), f"{direction} 3D source / {index+1:02}/{FRAMES}", fill=(150, 143, 137))
            ink.line((19, 139, 176, 139), fill=(69, 63, 64))
            board.alpha_composite(frame, (50, 49))
            review.append(board.convert("RGB"))
        gif = OUT / f"{name}-{direction}.gif"
        review[0].save(gif, save_all=True, append_images=review[1:],
                       duration=round(1000 / FPS[name]), loop=0, optimize=False)
        report[f"gif_{direction}"] = gif.name
        report[f"gif_{direction}_sha256"] = hashlib.sha256(gif.read_bytes()).hexdigest()
        print(f"Rendered {name} true Blender motion {direction}/{FRAMES} frames", flush=True)

    rig.rotation_euler.z = original_yaw
    scene.frame_set(1)
    rig.animation_data.action = action
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f"hollow-{name}-review.blend"))
    (OUT / f"{name}-manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


results = [author(name) for name in SOURCES]
(OUT / "README.md").write_text(
    "# Feral / crippled Hollowed — owner motion candidates\n\n"
    "Actual source-skinned Blender actions on the CURRENT cape-free models. "
    "Never use the old caped atlas. These are not shipped.\n\n"
    + "\n".join(f"![{name} {direction}]({name}-{direction}.gif)"
                  for name in SOURCES for direction in PREVIEW_DIRECTIONS)
    + "\n\n**Next gate:** owner visual review, foot-contact validation, "
      "native 320/390 in-game motion, then eight-direction export and "
      "C#-authoritative per-archetype speed. A real crawler needs a separately "
      "keyed full-body floor-contact rig; it has not been authored by this script.\n"
)
print(json.dumps(results, indent=2))
