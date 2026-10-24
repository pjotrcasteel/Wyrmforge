"""Author Hollowed feral RUN v2. The v1 shuffling prototype stays historical.

Keeps the original accepted .blend and runtime sprites untouched.
Two real footfalls/cycle; 40% planted stance, 60% high/fast recovery;
arms counter-pump with shoulders and elbows instead of rigidly swept-back hands.
Run with Python bpy (Blender 4.5.3); no RGB manipulation or sprite tweening.
"""
from pathlib import Path
import json
import math
import bpy
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-pixel-v3/hollow-rigged.blend"
DEST = MODEL / "rigged-sprint-v2-candidate"
if DEST.exists():
    raise FileExistsError(f"Do not replace existing editable sprint candidate: {DEST}")
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
for bone in rig.pose.bones:
    bone.rotation_mode = "QUATERNION"
if rig.animation_data and rig.animation_data.action:
    rig.animation_data.action.use_fake_user = True
action = bpy.data.actions.new("Hollow_FeralSprint_HeadFirst_v2")
rig.animation_data_create()
rig.animation_data.action = action

FRAMES = 16
FPS = 24
STANCE = .40
SWEEP = .36
LIFT = .128

def segment(name, head, tail):
    axis = tail - head
    if axis.length < 1e-5:
        raise ValueError(f"Invalid segment {name}: zero-length")
    neutral = tails[name] - heads[name]
    matrix = (neutral.rotation_difference(axis).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation = head
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()

def foot_path(phase):
    if phase < STANCE:
        return -.5 * SWEEP + SWEEP * phase / STANCE, 0., True
    t = (phase - STANCE) / (1 - STANCE)
    smooth = t * t * (3 - 2 * t)
    return .5 * SWEEP - SWEEP * smooth, LIFT * math.sin(math.pi * t) ** 1.12, False

def ik(hip, ankle, upper, lower, pole, label):
    displacement = ankle - hip
    raw_distance = displacement.length
    limit = upper + lower - 1e-4
    if raw_distance > limit + .007:
        raise ValueError(f"Unreachable {label}: {raw_distance:.5f} vs {limit:.5f}")
    distance = max(abs(upper - lower) + 1e-4, min(raw_distance, limit))
    along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
    direction = displacement.normalized()
    normal = Vector(pole)
    normal -= direction * normal.dot(direction)
    if normal.length < 1e-5:
        raise ValueError(f"Pole singularity: {label}")
    normal.normalize()
    joint = hip + direction * along + normal * math.sqrt(max(0, upper * upper - along * along))
    return joint

diagnostics = []
max_step = 0
for index in range(FRAMES + 1):
    phase = index / FRAMES
    wave = math.tau * phase
    left = foot_path(phase % 1)
    right = foot_path((phase + .5) % 1)
    double_flight = not left[2] and not right[2]
    # Pelvis compression and release: two energetic contacts with short airborne intervals.
    sway = .012 * math.sin(wave)
    bob = .011 * math.cos(2 * wave) + (.021 if double_flight else 0)
    offset = Vector((sway, -.020, -.086 + bob))
    torso = Quaternion((0, 0, 1), .033 * math.sin(wave)) @ Quaternion(
        (1, 0, 0), math.radians(34 + 4 * math.cos(2 * wave)))
    center = heads["pelvis"]
    point = lambda p: center + torso @ (p - center) + offset
    segment("root", heads["root"], tails["root"])
    for name in ("pelvis", "spine", "chest", "neck"):
        segment(name, point(heads[name]), point(tails[name]))
    head = point(heads["head"])
    # Eyes stay forward while shoulder mass commits into the run; no dangling neck.
    head_orientation = torso @ Quaternion((1, 0, 0), math.radians(-13 + 3 * math.sin(wave - .3)))
    segment("head", head, head + head_orientation @ (tails["head"] - heads["head"]))
    arms = {}
    footfalls = {}
    for side, sign, shift in (("L", 1, 0), ("R", -1, .5)):
        p = (phase + shift) % 1
        travel, lift, grounded = foot_path(p)
        hip = point(heads["thigh." + side])
        # In-place foot path is authored in model axes; motion root is game-owned.
        ankle = Vector((sign * .093 + sway * .20, .012 + travel, -.445 + lift))
        knee = ik(hip, ankle, lengths["thigh." + side], lengths["shin." + side],
                  (sign * .22, -1, .14), "leg " + side)
        segment("thigh." + side, hip, knee)
        segment("shin." + side, knee, ankle)
        # Ankle driven by IK. Preserve the source toe length and alignment.
        toe = ankle + tails["foot." + side] - heads["foot." + side]
        segment("foot." + side, ankle, toe)
        shoulder = point(heads["upper_arm." + side])
        segment("clavicle." + side, point(heads["clavicle." + side]), shoulder)
        # True anti-phase arm pump: one hand reaches forward by the ribs,
        # opposite hand drives back; elbows bend naturally and NEVER flip pole.
        forward = .5 - .5 * math.cos(math.tau * p)
        wrist = shoulder + Vector((sign * (.115 + .012 * forward),
                                   .130 - .305 * forward,
                                   -.175 + .077 * forward))
        elbow = ik(shoulder, wrist, lengths["upper_arm." + side],
                   lengths["forearm." + side],
                   (sign * .35, -.08 - .09 * forward, .11), "arm " + side)
        segment("upper_arm." + side, shoulder, elbow)
        segment("forearm." + side, elbow, wrist)
        palm_direction = Vector((sign * .025, .015 - .095 * forward, -.095))
        palm_direction.normalize()
        segment("hand." + side, wrist, wrist + palm_direction * lengths["hand." + side])
        cloth_head = point(heads["cloth." + side])
        cloth_axis = tails["cloth." + side] - heads["cloth." + side]
        cloth_lag = Quaternion((1, 0, 0), -.11 + .075 * math.sin(math.tau * (p - .22)))
        segment("cloth." + side, cloth_head, cloth_head + cloth_lag @ torso @ cloth_axis)
        footfalls[side] = {"phase": p, "stance": grounded, "travel": travel,
                           "lift": lift, "ankle": list(ankle), "hip": list(hip),
                           "knee": list(knee)}
        arms[side] = {"shoulder": list(shoulder), "elbow": list(elbow),
                      "wrist": list(wrist), "forward": forward}
    for bone in rig.pose.bones:
        for prop in ("location", "rotation_quaternion", "scale"):
            bone.keyframe_insert(prop, frame=index + 1, group=bone.name)
    diagnostics.append({"frame": index, "phase": phase, "feet": footfalls, "arms": arms,
                        "torsoPitch": 34 + 4 * math.cos(2 * wave),
                        "doubleFlight": double_flight})
# Require actual movement differences; no later relabeling of a shuffling gait.
assert SWEEP >= .34 and LIFT >= .11 and FPS >= 22 and STANCE <= .45
assert any(f["doubleFlight"] for f in diagnostics), "No airborne recovery"
assert abs(diagnostics[0]["arms"]["L"]["wrist"][1] -
           diagnostics[0]["arms"]["R"]["wrist"][1]) > .22, "Arms not counter-pumping"
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation = "BEZIER"
        key.handle_left_type = key.handle_right_type = "AUTO_CLAMPED"
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
scene.frame_set(1)
profile = {
    "schemaVersion": 1, "name": "Hollowed_FeralSprint_v2_UNAPPROVED",
    "clip": "walk", "framesPerDirection": FRAMES, "fps": FPS, "directions": 8,
    "stanceFraction": STANCE, "footSweepModelUnits": SWEEP, "recoveryLiftModelUnits": LIFT,
    "locomotionDistanceModelUnitsPerCycle": SWEEP / STANCE,
    "bodyPitchDegrees": [30, 38], "originalSourceRig": str(SOURCE.relative_to(ROOT)),
    "status": "VISUAL CANDIDATE ONLY; source accepted gait and walk normals unchanged",
    "constraints": "root displacement is authoritative game movement, material/lighting remains shared",
}
(DEST / "candidate-profile.json").write_text(json.dumps(profile, indent=2) + "\n")
(DEST / "gait-diagnostics.json").write_text(json.dumps(diagnostics, indent=2) + "\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST / "hollow-rigged.blend"))
print(f"Saved independent v2 pursuit rig: {FRAMES} frames, {FPS} fps, {SWEEP} unit sweep, {LIFT} unit recovery")
