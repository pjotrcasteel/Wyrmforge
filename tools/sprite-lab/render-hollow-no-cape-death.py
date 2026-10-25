"""Render a genuine 3D skeletal death for cape-free Hollowed, never rotate a walk sprite.

Uses the preserved no-cape, zombie-reach standard skinned Blender character and
the existing authored 24-pose Hollow_Death_Collapse Blender action. No gameplay
authority, in-game lighting contract or approved run/attack clips are changed.
Output is a candidate pending a real Hunt / owner visual review.
Python 3.11 + bpy 4.5.x + Pillow; CPU-only and reproducible on GitHub Actions.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend"
DEATH_ACTION_SOURCE = MODEL / "rigged-death-v5/hollow-death.blend"
OUT = ROOT / "artifacts/hollow-no-cape-death"
FRAMES = 24
FPS = 12
CELL = 128
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
SOURCE_ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
OUT.mkdir(parents=True, exist_ok=True)

if not SOURCE.is_file() or not DEATH_ACTION_SOURCE.is_file():
    raise FileNotFoundError("Need actual preserved no-cape mesh and authored death rig; never fake death frames")

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["Hollow editable animation rig"]
character = bpy.data.objects["Hollow skinned character"]
assert any(m.type == "ARMATURE" and m.object == rig for m in character.modifiers)
assert len(character.data.polygons) > 1000
assert scene.camera is not None

# Reuse the real 24-key skeletal collapse, authored for the SAME original bone
# names/rest pose. Load only the action; do not replace our cape-free skin.
with bpy.data.libraries.load(str(DEATH_ACTION_SOURCE), link=False) as (available, selected):
    names = [name for name in available.actions if name.startswith("Hollow_Death_Collapse")]
    assert len(names) == 1, f"Missing or ambiguous old skeletal death action: {names}"
    selected.actions = names
# Blender 4.5 library loading resolves selected.actions to Action datablocks, not names.
action = selected.actions[0]
assert action is not None
if rig.animation_data is None:
    rig.animation_data_create()
rig.animation_data.action = action

# Validate that the rig imported from both source files has every animation
# curve's referenced bone, and this is not a single rigid-object tilt.
bone_names = {b.name for b in rig.pose.bones}
curve_names = set()
for curve in action.fcurves:
    if 'pose.bones["' in curve.data_path:
        curve_names.add(curve.data_path.split('pose.bones["', 1)[1].split('"]', 1)[0])
assert {"pelvis", "spine", "chest", "head", "thigh.L", "shin.L", "thigh.R", "shin.R"}.issubset(curve_names)
assert curve_names.issubset(bone_names), sorted(curve_names - bone_names)

# The authored collapse carried an after-skin floor-contact corrective in the
# old mesh. Rebuild its same Z-floor cap on the no-cape skin, after Armature.
group = bpy.data.node_groups.new("Hollow death grounded no-cape geometry", "GeometryNodeTree")
group.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
group.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
nodes, links = group.nodes, group.links
input_node = nodes.new("NodeGroupInput")
output_node = nodes.new("NodeGroupOutput")
position = nodes.new("GeometryNodeInputPosition")
separate = nodes.new("ShaderNodeSeparateXYZ")
floor = nodes.new("ShaderNodeMath")
floor.operation = "MAXIMUM"
floor.inputs[1].default_value = -0.5
combine = nodes.new("ShaderNodeCombineXYZ")
set_position = nodes.new("GeometryNodeSetPosition")
links.new(input_node.outputs["Geometry"], set_position.inputs["Geometry"])
links.new(position.outputs["Position"], separate.inputs[0])
links.new(separate.outputs["X"], combine.inputs["X"])
links.new(separate.outputs["Y"], combine.inputs["Y"])
links.new(separate.outputs["Z"], floor.inputs[0])
links.new(floor.outputs[0], combine.inputs["Z"])
links.new(combine.outputs[0], set_position.inputs["Position"])
links.new(set_position.outputs["Geometry"], output_node.inputs["Geometry"])
modifier = character.modifiers.new("Ground contact for authored death", "NODES")
modifier.node_group = group

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.render.film_transparent = True
scene.render.resolution_x = CELL
scene.render.resolution_y = CELL
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.camera.data.ortho_scale = 1.55 * CELL / 96
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
baseline_yaw = rig.rotation_euler.z
atlas = Image.new("RGBA", (CELL * FRAMES, CELL * len(DIRECTIONS)))
rendered_frames = {}
bounds = {}

for row, direction in enumerate(DIRECTIONS):
    rig.rotation_euler.z = baseline_yaw + math.radians(SOURCE_ROTATION + 180 - row * 45)
    rendered_frames[direction] = []
    for frame in range(FRAMES):
        scene.frame_set(frame + 1)
        frame_path = OUT / f"_temporary_{row:02}_{frame:02}.png"
        scene.render.filepath = str(frame_path)
        bpy.ops.render.render(write_still=True)
        rendered = Image.open(frame_path).convert("RGBA")
        frame_path.unlink()
        if rendered.size != (CELL, CELL):
            raise ValueError(f"Wrong death sprite size: {direction} / {frame}")
        box = rendered.getbbox()
        if not box or box[0] == 0 or box[1] == 0 or box[2] == CELL or box[3] == CELL:
            raise ValueError(f"Death silhouette clipped or empty: {direction} {frame}: {box}")
        rendered_frames[direction].append(rendered)
        bounds[f"{direction}:{frame}"] = box
        atlas.alpha_composite(rendered, (frame * CELL, row * CELL))
    print(f"Rendered actual skinned death: {direction} / {FRAMES} poses", flush=True)

atlas_path = OUT / "death.png"
atlas.save(atlas_path, optimize=True)
# Native preview at twice size, without anti-aliased scaling, for artistic QC.
samples = (0, 3, 6, 9, 12, 16, 20, 23)
board = Image.new("RGBA", (len(samples) * (CELL + 12), len(DIRECTIONS) * (CELL + 22)), (18, 17, 21, 255))
ink = ImageDraw.Draw(board)
for row, direction in enumerate(DIRECTIONS):
    ink.text((2, row * (CELL + 22)), direction, fill=(205, 191, 171))
    for col, frame in enumerate(samples):
        board.alpha_composite(rendered_frames[direction][frame], (col * (CELL + 12) + 6, row * (CELL + 22) + 17))
board.resize((board.width * 2, board.height * 2), Image.Resampling.NEAREST).convert("RGB").save(OUT / "death-contact-sheet.png")
gif_frames = []
for i, sprite in enumerate(rendered_frames["S"]):
    canvas = Image.new("RGBA", (CELL + 20, CELL + 20), (18, 17, 21, 255))
    canvas.alpha_composite(sprite, (10, 10))
    gif_frames.append(canvas.resize((4 * (CELL + 20), 4 * (CELL + 20)), Image.Resampling.NEAREST).convert("RGB"))
gif_frames[0].save(OUT / "death-south-review.gif", save_all=True, append_images=gif_frames[1:], duration=round(1000 / FPS), loop=0)

scene.frame_set(1)
rig.rotation_euler.z = baseline_yaw
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "hollow-no-cape-death.blend"))
metadata = {
    "schemaVersion": 1,
    "actor": "hollowed",
    "clip": "death",
    "renderedFrom3D": True,
    "capeRemovedInActualMesh": True,
    "sourceRig": str(SOURCE.relative_to(ROOT)),
    "originalDeathAction": str(DEATH_ACTION_SOURCE.relative_to(ROOT)),
    "sourceStatus": "candidate requiring 8-way and mobile visual approval",
    "directions": list(DIRECTIONS),
    "frames": FRAMES, "fps": FPS, "cell": CELL,
    "worldSize": 124, "anchor": [64, 88],
    "image": "death.png",
    "sha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest(),
    "boundingBoxes": bounds,
}
(OUT / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
print("Generated actual 24-pose, eight-direction, no-cape skeletal death preview. Owner visual acceptance pending.", flush=True)
