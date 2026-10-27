"""Render source-skinned run + committed attack + passing-target turn.

THIS IS BLENDER SOURCE ANIMATION, never alpha blending of two rendered bodies.
Legs retain independent walking keyframes while spine, head and surviving
claws perform the 16-frame strike. A second scene finishes the strike before
turning into the chase as the target runs past. Review candidates only.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
WALK = SOURCES / "rigged-pixel-v3/hollow-rigged.blend"
REACH = "rigged-hollow-zombie-reach-v3-"
OUTPUT = ROOT / "artifacts/hollow-moving-strike"
FACINGS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
COUNT, CELL, ATTACK_START = 56, 96, 8
STRIKE_POSES, STRIKE_HOLD = 16, 2  # 16 genuine attack poses at 12fps on a 24fps preview
UPPER = ("spine", "chest", "neck", "head",
         "clavicle.L", "clavicle.R", "upper_arm.L", "upper_arm.R",
         "forearm.L", "forearm.R", "hand.L", "hand.R")

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--variant", choices=("standard", "broken-arm-right", "one-arm-left", "broken-leg-left"),
                    default="standard")
parser.add_argument("--directions", choices=("SE", "all"), default="SE")
args = parser.parse_args()
DIRECTIONS = FACINGS if args.directions == "all" else ("S", "E")
DEST = OUTPUT / args.variant
DEST.mkdir(parents=True, exist_ok=True)


def smooth(t):
    x = min(1.0, max(0.0, t))
    return x*x*(3-2*x)


def load_source(path):
    if not path.exists() or path.open("rb").read(7) != b"BLENDER":
        raise FileNotFoundError(f"Actual Blender source required: {path}")
    bpy.ops.wm.open_mainfile(filepath=str(path))
    rig = bpy.data.objects["Hollow editable animation rig"]
    mesh = bpy.data.objects["Hollow skinned character"]
    if mesh.type != "MESH" or rig.type != "ARMATURE" or not rig.animation_data.action:
        raise ValueError(f"Not an editable skinned Hollowed source: {path}")
    if not any(m.type == "ARMATURE" and m.object == rig for m in mesh.modifiers):
        raise ValueError("The cape-free actor is not bound to the source armature")
    return bpy.context.scene, rig


def samples(rig):
    scene = bpy.context.scene
    frames = []
    for index in range(16):
        scene.frame_set(index+1)
        frames.append({bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones})
    return frames


# Sample the ACTUAL authored walking action. Its mesh is never reused; the
# runtime/preview model remains the current cape-free source body.
_, walk_rig = load_source(WALK)
walk_frames = samples(walk_rig)
walk_rest = {bone.name: bone.matrix_local.copy() for bone in walk_rig.data.bones}
walk_bones = set(walk_frames[0])

variant_source = SOURCES / f"{REACH}{args.variant}/hollow-rigged.blend"
scene, rig = load_source(variant_source)
source_yaw = rig.rotation_euler.z
if not {"pelvis", "spine", "chest", "neck", "head", "thigh.L",
        "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"}.issubset(walk_bones):
    raise ValueError("The REAL walking source is missing required foot/support joints")
if not walk_bones.issubset(set(rig.pose.bones.keys())):
    raise ValueError("Walking and cape-free strike rigs have incompatible joint names")
for name, base in walk_rest.items():
    other = rig.data.bones[name].matrix_local
    if max(abs(base[r][c]-other[r][c]) for r in range(4) for c in range(4)) > .002:
        raise ValueError(f"Walking joint cannot safely retarget to cape-free rig: {name}")

# The source-authoring action is a real 3D windup/hit/recovery, not old reach.
script = Path(__file__).with_name("author-hollow-attack-motion.py")
spec = importlib.util.spec_from_file_location("hollow_source_attack", script)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Missing Blender attack author: {script}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
attack_report = module.author_attack_action(bpy, rig, args.variant)
attack_frames = samples(rig)

# Add the SAME mesh-bound internal fire sockets as the approved idle Ember QC.
# This changes the source MATERIAL, not the silhouette or a composited GIF.
embers_spec = Path(__file__).with_name("hollow-source-embers.py")
fire_spec = importlib.util.spec_from_file_location("hollow_source_embers", embers_spec)
if fire_spec is None or fire_spec.loader is None:
    raise RuntimeError(f"Missing canonical Hollowed source emission shader: {embers_spec}")
embers = importlib.util.module_from_spec(fire_spec)
fire_spec.loader.exec_module(embers)
actor = bpy.data.objects["Hollow skinned character"]
fire_controls, source_regions = embers.attach_internal_fire(actor)
if not fire_controls:
    raise ValueError("No source-bound fire shader on cape-free Hollowed")

action = bpy.data.actions.new(f"Hollow_{args.variant}_MovingStrike_AndChase_v1")
rig.animation_data.action = action
scene.frame_start, scene.frame_end, scene.render.fps = 1, COUNT, 24

# A blend of local skeletal transforms, not RGBA sprites or root teleportation.
def blend_matrix(first, second, weight):
    if weight <= 0:
        return first.copy()
    if weight >= 1:
        return second.copy()
    a, qa, sa = first.decompose()
    b, qb, sb = second.decompose()
    return Matrix.LocRotScale(a.lerp(b, weight), qa.slerp(qb, weight), sa.lerp(sb, weight))


def key_sequence(turn_after_impact):
    # Reusing a single clip for every row means truly authored 3D facings,
    # not a mirrored flat 2D turn or frozen sprinting legs.
    for index in range(COUNT):
        frame = index+1
        scene.frame_set(frame)
        walk_index = index % 16
        active = ATTACK_START <= index < ATTACK_START + STRIKE_POSES * STRIKE_HOLD
        strike_index = min(STRIKE_POSES - 1, max(0, (index-ATTACK_START)//STRIKE_HOLD))
        attack_alpha = (smooth((index-ATTACK_START+1)/5)
                        *smooth((ATTACK_START+STRIKE_POSES*STRIKE_HOLD-index)/6)) if active else 0
        # Independent movement phase keeps foot-support contacts periodic for
        # EVERY attack phase. No full-body switch to planted 'attack' atlas.
        for bone in rig.pose.bones:
            name = bone.name
            # Use the EXACT actual source gait. The earlier preview
            # incorrectly multiplied the walk onto an idle REACH pose,
            # making every running frame look like a permanent attack.
            # Rest transforms were verified compatible above.
            moving = walk_frames[walk_index][name]
            # Only the upper skeletal delta is additive to locomotion.
            # Never replace the walking pelvis, feet, cloth or hand support
            # with a full-body attack pose.
            if active and name in UPPER:
                attack_delta = attack_frames[strike_index][name] @ attack_frames[0][name].inverted()
                swung = attack_delta @ moving
                result = blend_matrix(moving, swung, attack_alpha)
            else:
                result = moving
            bone.matrix_basis = result
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("location", frame=frame, group=name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
            bone.keyframe_insert("scale", frame=frame, group=name)
        # On a pass-by, finish the swipe before rotating back toward the
        # player. The attack animation NEVER rewinds or gets cancelled.
        turn = 0 if not turn_after_impact else 158 * smooth((index-31)/21)
        rig.rotation_euler.z = math.radians(turn)
        rig.keyframe_insert("rotation_euler", frame=frame)
    scene.frame_set(1)


scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 4
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = CELL
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"

report = {"model": args.variant, "capeFree": True, "sourceWalk": str(WALK.relative_to(ROOT)),
          "sourceStrike": str(variant_source.relative_to(ROOT)),
          "3dSkinned": True, "legGaitContinuousDuringAttack": True,
          "attackUninterruptedByTurn": True, "sourceAttack": attack_report,
          "basePoseExactlyAuthoredWalk": True, "attackOnlyUpperBodyAdditive": True,
          "frames": COUNT, "attackPoses": STRIKE_POSES, "attackFps": 12,
          "previewFps": 24, "sourceEmissionOnSkinnedMesh": True,
          "sourceFireRegionVertices": source_regions,
          "emissionOutsideAttack": .85, "maxSourceAttackEmission": 4.35,
          "directions": list(DIRECTIONS), "mobileReviewOnly": True,
          "ownerApproved": False, "runtimeIntegrated": False, "preflightRigMatched": True,
          "renders": []}

for scenario, turns in (("running-strike", False), ("pass-by-turn-and-chase", True)):
    # Each case has its own editable source action; no action frames recycled.
    if scenario != "running-strike":
        action = bpy.data.actions.new(f"Hollow_{args.variant}_PassBy_TurnAndChase_v1")
        rig.animation_data.action = action
    key_sequence(turns)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST / f"{args.variant}-{scenario}.blend"))
    for direction in DIRECTIONS:
        angle = source_yaw + math.radians(ROTATION + 180 - FACINGS.index(direction)*45)
        review = []
        for index in range(COUNT):
            scene.frame_set(index+1)
            # Use the actor's OWN skinned eye/mouth/wound emission, not screen
            # overlay. Flares exactly at the committed 3D claw impact.
            authored_pose = (index-ATTACK_START)//STRIKE_HOLD
            strength = (embers.strength_for_motion(authored_pose, attack_start=0)
                        if ATTACK_START <= index < ATTACK_START+STRIKE_POSES*STRIKE_HOLD else .85)
            for socket in fire_controls:
                socket.default_value = strength
            rig.rotation_euler.z += angle
            bpy.context.view_layer.update()
            temporary = DEST / "_temporary.png"
            scene.render.filepath = str(temporary)
            bpy.ops.render.render(write_still=True)
            image = Image.open(temporary).convert("RGBA")
            temporary.unlink()
            if image.size != (CELL, CELL) or not image.getbbox():
                raise ValueError(f"Missing real skinned pose: {scenario}/{direction}/{index}")
            if index == ATTACK_START + 8 * STRIKE_HOLD:
                # Independently prove bright source emission actually changed
                # the rendered actor. Do not ship a "fire" review lacking fire.
                for socket in fire_controls:
                    socket.default_value = 0
                blank = DEST / "_no_emission.png"
                scene.render.filepath = str(blank)
                bpy.ops.render.render(write_still=True)
                unlit = Image.open(blank).convert("RGBA")
                blank.unlink()
                alpha = image.getchannel("A")
                if image.getchannel("A").tobytes() != unlit.getchannel("A").tobytes():
                    raise ValueError("Fire unexpectedly changes the source actor silhouette")
                changed = ImageChops.difference(image.convert("RGB"), unlit.convert("RGB"))
                differences = sum(1 for px, opaque in zip(changed.convert("L").getdata(),alpha.getdata())
                                  if opaque and px > 8)
                if differences < 3:
                    raise ValueError("No VISIBLE fire on the original 3D face/wounds at impact")
                report.setdefault("verifiedFirePixels",{})[f"{scenario}/{direction}"] = differences
                for socket in fire_controls:
                    socket.default_value = strength
            panel = Image.new("RGB", (CELL*3, CELL*3+40), (17, 16, 23))
            frame = image.resize((CELL*3, CELL*3), Image.Resampling.NEAREST)
            panel.paste(frame, (0, 40), frame)
            ImageDraw.Draw(panel).text((8, 12), f"FIRE / {scenario} {direction} {index+1}/{COUNT}",
                                       fill=(245, 185, 127))
            review.append(panel)
        filename = f"{args.variant}-{scenario}-{direction}.gif"
        review[0].save(DEST / filename, save_all=True, append_images=review[1:],
                       duration=42, loop=0)
        report["renders"].append(filename)
        print(f"Source 3D {scenario}/{direction}: {COUNT} poses", flush=True)

(DEST / "manifest.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"variant": args.variant, "directions": DIRECTIONS, "renders": report["renders"]}))
