"""Author a separate feral Hollowed run candidate from the EDITABLE existing Blender rig.

No accepted .blend, runtime atlas, C# combat state, or source artwork is overwritten.
Reference: World War Z (2013) behind-the-scenes VFX movement (stooped,
arms swept back, head-first commitment); original WyrmForge interpretation.
Usage: blender -b --python tools/sprite-lab/build-hollow-feral-candidate.py
Candidate needs real 8-direction pixel export, phone review, and owner acceptance
before replacing the approved shuffle. This is NOT a runtime animation yet.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-pixel-v3/hollow-rigged.blend"
DEST = MODEL / "rigged-feral-v1-candidate"
if DEST.exists():
    raise FileExistsError(f"Preserve previous candidate: {DEST}")
DEST.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
rig = bpy.data.objects["Hollow editable animation rig"]
scene = bpy.context.scene
scene.frame_set(1)
bones = rig.data.bones
heads = {b.name: b.head_local.copy() for b in bones}
tails = {b.name: b.tail_local.copy() for b in bones}
rest = {b.name: b.matrix_local.copy() for b in bones}
lengths = {b.name: b.length for b in bones}
for p in rig.pose.bones:
    p.rotation_mode = "QUATERNION"
rig.animation_data.action.use_fake_user = True
action = bpy.data.actions.new("Hollow_Feral_ForwardPressure_v1")
rig.animation_data.action = action


def segment(name, head, tail):
    direction = tail - head
    if direction.length < 1e-5:
        raise ValueError(f"Degenerate authored bone {name}")
    neutral = tails[name] - heads[name]
    matrix = (neutral.rotation_difference(direction).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation = head
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()


def foot(phase):
    """57% planted contact; more purposeful recovery, no air-running on a planted foot."""
    stance = .57
    sweep = .19
    if phase < stance:
        return -.5 * sweep + sweep * phase / stance, 0, True
    t = (phase - stance) / (1 - stance)
    t = t * t * (3 - 2 * t)
    return .5 * sweep - sweep * t, .065 * math.sin(math.pi * t) ** 1.2, False


def joint(a, b, l1, l2, pole):
    delta = b - a
    distance = max(abs(l1 - l2) + 1e-4, min(delta.length, l1 + l2 - 1e-4))
    axis = delta.normalized()
    projected = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance)
    perpendicular = Vector(pole)
    perpendicular -= axis * perpendicular.dot(axis)
    perpendicular.normalize()
    return a + axis * projected + perpendicular * math.sqrt(max(0, l1 * l1 - projected ** 2))


diagnostics = []
for index in range(17):
    phase = index / 16
    cycle = 2 * math.pi * phase
    # Lower predatory center, forward-hunting chest and neck, controlled asymmetry.
    sway = .02 * math.sin(cycle)
    bob = .008 * math.cos(2 * cycle)
    rotation = Quaternion((0, 0, 1), .045 * math.sin(cycle)) @ Quaternion(
        (1, 0, 0), math.radians(24 + 4 * math.sin(2 * cycle)))
    pelvis = heads["pelvis"]
    offset = Vector((sway, -.015, -.052 + bob))
    point = lambda value: pelvis + rotation @ (value - pelvis) + offset
    segment("root", heads["root"], tails["root"])
    for name in ("pelvis", "spine", "chest", "neck"):
        segment(name, point(heads[name]), point(tails[name]))
    # The head leads every surge; not a loose pendulum hanging from the chest.
    head = point(heads["head"])
    neck = Quaternion((1, 0, 0), math.radians(8 + 5 * math.sin(cycle - .5)))
    segment("head", head, head + neck @ rotation @ (tails["head"] - heads["head"]))
    for side, sign, shift in (("L", 1, 0), ("R", -1, .5)):
        p = (phase + shift) % 1
        travel, height, planted = foot(p)
        hip = point(heads["thigh." + side])
        ankle = Vector((sign * .09 + sway * .2, .015 + travel, -.445 + height))
        knee = joint(hip, ankle, lengths["thigh." + side], lengths["shin." + side], (sign * .18, -1, .10))
        segment("thigh." + side, hip, knee)
        segment("shin." + side, knee, ankle)
        segment("foot." + side, ankle, ankle + tails["foot." + side] - heads["foot." + side])
        shoulder = point(heads["upper_arm." + side])
        segment("clavicle." + side, point(heads["clavicle." + side]), shoulder)
        # Controlled arms-back pursuit. A counter-beat briefly reaches for prey,
        # without the continuous forward windmill of a generic zombie.
        surge = max(0, math.sin(cycle + shift * math.pi * 2))
        reach = .06 * surge
        wrist = shoulder + Vector((sign * .13, .145 - reach, -.20 + .032 * surge))
        elbow = joint(shoulder, wrist, lengths["upper_arm." + side],
                      lengths["forearm." + side], (sign * .9, .3, .3))
        segment("upper_arm." + side, shoulder, elbow)
        segment("forearm." + side, elbow, wrist)
        segment("hand." + side, wrist, wrist + Vector((sign * .025, .06 - reach * .5, -.08)))
        cloth = point(heads["cloth." + side])
        lag = Quaternion((1, 0, 0), -.16 + .05 * math.sin(cycle - .6))
        segment("cloth." + side, cloth, cloth + lag @ rotation @ (tails["cloth." + side] - heads["cloth." + side]))
        diagnostics.append({"frame": index, "side": side, "phase": p,
                            "planted": planted, "ankle": list(ankle), "knee": list(knee)})
    for bone in rig.pose.bones:
        for channel in ("location", "rotation_quaternion", "scale"):
            bone.keyframe_insert(channel, frame=index + 1, group=bone.name)
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation = "LINEAR"
scene.frame_start = 1
scene.frame_end = 16
scene.render.fps = 12
scene.frame_set(1)
(DEST / "gait-diagnostics.json").write_text(json.dumps(diagnostics, indent=2) + "\n")
(DEST / "candidate-profile.json").write_text(json.dumps({
    "clip": "walk", "frames": 16, "directions": 8, "stanceFraction": .57,
    "travelModelUnitsPerCycle": .19 / .57,
    "sourceRig": str(SOURCE.relative_to(ROOT)), "style": "feral head-first pursuit",
    "status": "unreviewed candidate; production walk and linked normals unchanged"
}, indent=2) + "\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST / "hollow-rigged.blend"))
print("Saved unreviewed editable source candidate:", DEST)
