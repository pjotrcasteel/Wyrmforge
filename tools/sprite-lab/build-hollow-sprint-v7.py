"""Author Hollowed feral RUN v7. The v1 shuffling prototype stays historical.

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
DEST = MODEL / "rigged-sprint-v7-candidate"
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
action = bpy.data.actions.new("Hollow_FeralSprint_HeadFirst_v7")
rig.animation_data_create()
rig.animation_data.action = action

FRAMES = 16
FPS = 22
STANCE = .40
SWEEP = .25
LIFT = .225

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
    # Land -> absorb -> extend -> recover. Keep the hip high enough that the
    # shortened flight leg actually FOLDS at the knee instead of dragging.
    bob = .014 * math.cos(2 * wave) + (.013 if double_flight else 0)
    offset = Vector((sway, -.017, -.034 + bob))
    torso = Quaternion((0, 0, 1), .033 * math.sin(wave)) @ Quaternion(
        (1, 0, 0), math.radians(33 + 4 * math.cos(2 * wave)))
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
                  (sign * .12, -1.0, .06), "leg " + side)
        segment("thigh." + side, hip, knee)
        segment("shin." + side, knee, ankle)
        # Ankle driven by IK. Preserve the source toe length and alignment.
        toe = ankle + tails["foot." + side] - heads["foot." + side]
        segment("foot." + side, ankle, toe)
        # Scapular/clavicle counter-rotation is driven by the opposite leg, not
        # decorative arm bob. The clavicle segment keeps its exact rig length.
        base = point(heads["clavicle." + side])
        rest_shoulder = point(heads["upper_arm." + side])
        drive = math.cos(math.tau * p)
        shoulder = base + Quaternion((0, 0, 1), math.radians(sign * 5 * drive)) @ (rest_shoulder-base)
        segment("clavicle." + side, base, shoulder)
        # True anti-phase arm pump: one hand reaches forward by the ribs,
        # opposite hand drives back; elbows remain BELOW shoulders, tucked near
        # the torso, rather than climbing above the head like the rejected v2 hook.
        # Forearm FK from shoulder, not a separately chased IK wrist target.
        # Torso drives clavicle, clavicle drives upper arm, upper arm drives
        # elbow and forearm; all bone lengths are exactly preserved.
        # Loose infected arms may lag the body, but CANNOT fold into hooks.
        upper_axis = Vector((sign * .12, .42 * drive, -.88))
        upper_axis.normalize()
        elbow = shoulder + upper_axis * lengths["upper_arm." + side]
        fore_axis = Vector((sign * .07,
                           .80 * drive + .35 * math.sin(math.tau * p), -.23))
        fore_axis.normalize()
        wrist = elbow + fore_axis * lengths["forearm." + side]
        segment("upper_arm." + side, shoulder, elbow)
        segment("forearm." + side, elbow, wrist)
        palm_direction = Vector((sign * .04, .14 * drive, -.5))
        palm_direction.normalize()
        segment("hand." + side, wrist + Vector((0,0,0)), wrist + palm_direction * lengths["hand." + side])
        cloth_head = point(heads["cloth." + side])
        cloth_axis = tails["cloth." + side] - heads["cloth." + side]
        cloth_lag = Quaternion((1, 0, 0), -.11 + .075 * math.sin(math.tau * (p - .22)))
        segment("cloth." + side, cloth_head, cloth_head + cloth_lag @ torso @ cloth_axis)
        footfalls[side] = {"phase": p, "stance": grounded, "travel": travel,
                           "lift": lift, "ankle": list(ankle), "hip": list(hip),
                           "knee": list(knee)}
        arms[side] = {"shoulder": list(shoulder), "elbow": list(elbow),
                      "wrist": list(wrist), "drive": drive}
    for bone in rig.pose.bones:
        for prop in ("location", "rotation_quaternion", "scale"):
            bone.keyframe_insert(prop, frame=index + 1, group=bone.name)
    diagnostics.append({"frame": index, "phase": phase, "feet": footfalls, "arms": arms,
                        "torsoPitch": 33 + 4 * math.cos(2 * wave),
                        "doubleFlight": double_flight})
# Require actual movement differences; no later relabeling of a shuffling gait.
assert .24 <= SWEEP <= .27 and LIFT >= .21 and FPS >= 22 and STANCE <= .42
# The production animation samples gait phase by displacement; calibrate to
# C# Hollowed base speed (EnemyStagePressure.BaseSpeed=52 world units/sec).
# Hollowed's existing rig has 60 world units per model stride unit.
EXPECTED_AT_HUNT_SPEED = 16 * 52 / (SWEEP / STANCE * 60)
assert abs(EXPECTED_AT_HUNT_SPEED-FPS) < 1.5, (
    "Preview FPS mismatches actual Hunt playback; do not ship fake quick GIF")
assert any(f["doubleFlight"] for f in diagnostics), "No airborne recovery"
assert abs(diagnostics[0]["arms"]["L"]["wrist"][1] -
           diagnostics[0]["arms"]["R"]["wrist"][1]) > .18, "Arms not counter-pumping"
def flexion(a, joint, b):
    incoming, outgoing = Vector(a) - Vector(joint), Vector(b) - Vector(joint)
    return 180 - math.degrees(incoming.angle(outgoing))
for side in ("L", "R"):
    stance = []
    swing = []
    arms = []
    for record in diagnostics[:FRAMES]:
        f = record["feet"][side]
        knee_flex = flexion(f["hip"], f["knee"], f["ankle"])
        (stance if f["stance"] else swing).append(knee_flex)
        arm = record["arms"][side]
        elbow_flex = flexion(arm["shoulder"], arm["elbow"], arm["wrist"])
        arms.append(elbow_flex)
    assert max(swing) >= 108, (side, "missing rapid heel-to-glute recovery", swing)
    assert min(swing) >= 35, (side, "swing leg collapses backwards")
    assert 15 <= min(stance) <= 80, (side, "no bent-knee loading and compression")
    assert min(arms) >= 22 and max(arms) <= 85, (side, "elbow too straight or hooked; revise authored FK", arms)
for record in diagnostics:
    for side in ("L", "R"):
        arm = record["arms"][side]
        assert arm["elbow"][2] < arm["shoulder"][2] - .02, (record["frame"], side, "raised puppet elbow")
        assert arm["wrist"][2] < arm["shoulder"][2] + .005, (record["frame"], side, "wrist above shoulder")
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation = "BEZIER"
        key.handle_left_type = key.handle_right_type = "AUTO_CLAMPED"
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
scene.frame_set(1)
profile = {
    "schemaVersion": 1, "name": "Hollowed_FeralSprint_v7_UNAPPROVED",
    "clip": "walk", "framesPerDirection": FRAMES, "fps": FPS, "directions": 8,
    "stanceFraction": STANCE, "footSweepModelUnits": SWEEP, "recoveryLiftModelUnits": LIFT,
    "locomotionDistanceModelUnitsPerCycle": SWEEP / STANCE,
    "locomotionDistanceWorldUnitsPerCycle": (SWEEP / STANCE) * 60,
    "simulatedHuntBaseSpeedWorldUnitsPerSecond": 52,
    "expectedRuntimePlaybackFramesPerSecondAtBaseSpeed": EXPECTED_AT_HUNT_SPEED,
    "bodyPitchDegrees": [29, 37], "originalSourceRig": str(SOURCE.relative_to(ROOT)),
    "anatomySource": "published sprint biomechanics: discrete stance/flight, swing knee retraction, opposed arm action",
    "kneeFlexionPassCriteria": {"swingMaxAtLeastDegrees":108, "stanceMinimumDegrees":15},
    "elbowFlexionRangeDegrees": [22,85],
    "scapularRotationAmplitudeDegrees": 5,
    "armSwingModelUnits": .206,
    "armKinematics": "FK bone-length-preserving shoulder -> upper arm -> elbow -> wrist",
    "clavicleKeepsBoneLength": True,
    "status": "VISUAL CANDIDATE ONLY; source accepted gait and walk normals unchanged",
    "constraints": "root displacement is authoritative game movement, material/lighting remains shared",
}
(DEST / "candidate-profile.json").write_text(json.dumps(profile, indent=2) + "\n")
(DEST / "gait-diagnostics.json").write_text(json.dumps(diagnostics, indent=2) + "\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST / "hollow-rigged.blend"))
print(f"Saved independent v7 pursuit rig: {FRAMES} frames, {FPS} fps, {SWEEP} unit sweep, {LIFT} unit recovery")
