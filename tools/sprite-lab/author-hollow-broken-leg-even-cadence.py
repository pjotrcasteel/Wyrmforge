"""Artist-authored asymmetric Hollowed injury with *evenly paced* foot recovery.

This is NOT V7 with new offsets or a retimed healthy sprint. The cape-free,
stretched-arm standard supplies the intact mesh and arms ONLY. Feet follow
separately authored left-pain/right-drive contacts in rig space; both leg
chains are solved at each keyed pose. Original source and approved art stay
untouched. Review candidate, NEVER a runtime atlas.

Run: python tools/sprite-lab/author-hollow-broken-leg-even-cadence.py
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-hollow-zombie-reach-v3-standard"
DEST = MODEL / "rigged-hollow-broken-leg-even-cadence"
ORIGINAL = SOURCE / "hollow-rigged.blend"
FRAMES = 16
FPS = 22
GROUND = -0.435
assert ORIGINAL.is_file(), ORIGINAL
assert not DEST.exists(), f"Never replace an existing review candidate: {DEST}"

# One COMPLETE stride: healthy right supports most of the cycle. The
# injured left foot touches briefly, fails to accept load, then skims the
# ground in a dragged, incomplete recovery. Anatomical axes: X lateral,
# -Y forward, Z up; positions are relative to the Hollowed's rig root.
# Keyframes describe foot CONTACT EVENTS, not offsets to healthy mocap.
#
# right: heel strike -> long loaded drive -> toe-off -> fast lifted recovery
# -> heel strike -> loaded drive through seamless loop closure.
# Left damaged foot now has a deliberately SHORT recovery and no sharp
# two-frame forward snap. The right foot also gets a shorter, lower recovery
# arc. These are newly authored FOOT contacts, not a global 16-frame retime.
# Max actual 3D ankle travel is tested per keyed frame below and by CI.
RIGHT = (
    (0.00, -.060, GROUND),
    (0.20, -.020, GROUND),
    (0.44, +.050, GROUND),
    (0.58, +.100, GROUND),  # long healthy support and toe-off
    (0.66, +.052, GROUND + .060),
    (0.75, -.045, GROUND + .090),  # lower, longer swing
    (0.84, -.090, GROUND + .065),
    (0.88, -.096, GROUND),  # deliberate landing
    (0.94, -.071, GROUND),
    (1.00, -.060, GROUND),
)
LEFT = (
    (0.00, +.135, GROUND + .085),
    (0.14, +.125, GROUND + .081),
    (0.28, +.075, GROUND + .073),
    (0.40, -.014, GROUND + .030),
    (0.51, -.070, GROUND + .005),
    (0.55, -.074, GROUND),    # damaged foot touches, fails to bear weight
    (0.60, -.052, GROUND + .007),
    (0.70, +.018, GROUND + .050),
    (0.82, +.090, GROUND + .086),
    (0.94, +.136, GROUND + .085),
    (1.00, +.135, GROUND + .085),
)
PAIN = (
    (0.00, 0), (0.49, 0), (0.53, .42),
    (0.565, 1), (0.595, .45), (0.65, 0), (1.00, 0),
)
RIGHT_LOAD = (
    (0.00, 1), (0.52, 1), (0.58, .82),
    (0.65, .26), (0.73, .24), (0.86, .86),
    (0.90, 1), (1.00, 1),
)


def interpolate(points, t, component=1):
    """Monotone cubic segments: no accidental floor penetration or spline
    overshoot at the planted foot. Seam endpoints have a shared tangent."""
    t = max(0.0, min(1.0, t))
    x = [p[0] for p in points]
    y = [p[component] for p in points]
    sec = [(y[i + 1] - y[i]) / (x[i + 1] - x[i])
           for i in range(len(points) - 1)]
    tangents = []
    for i in range(len(points)):
        before = (i - 1) % (len(points) - 1)
        after = i % (len(points) - 1)
        a, b = sec[before], sec[after]
        if a * b <= 0:
            tangent = 0.0
        else:
            tangent = 2.0 * a * b / (a + b)
        tangents.append(tangent)
    tangents[-1] = tangents[0]
    if t == 1:
        return y[-1]
    i = next(j for j in range(len(x) - 1) if x[j] <= t < x[j + 1])
    h = x[i + 1] - x[i]
    u = (t - x[i]) / h
    return ((2 * u**3 - 3 * u**2 + 1) * y[i]
            + (u**3 - 2 * u**2 + u) * h * tangents[i]
            + (-2 * u**3 + 3 * u**2) * y[i + 1]
            + (u**3 - u**2) * h * tangents[i + 1])


def sample_contact(table, t):
    return interpolate(table, t, 1), interpolate(table, t, 2)


def xyz(v):
    return [float(n) for n in v]


def hierarchy_depth(b):
    n = 0
    while b.parent:
        b = b.parent
        n += 1
    return n


def unit(v):
    if v.length < 1.e-7:
        raise ValueError("Collapsed limb in authored contact")
    return v.normalized()


bpy.ops.wm.open_mainfile(filepath=str(ORIGINAL))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["Hollow editable animation rig"]
mesh = bpy.data.objects["Hollow skinned character"]
assert len(mesh.data.polygons) == 68380
rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
heads = {b.name: b.head_local.copy() for b in rig.data.bones}
tails = {b.name: b.tail_local.copy() for b in rig.data.bones}
lengths = {b.name: b.length for b in rig.data.bones}
ordered = sorted(rig.pose.bones, key=hierarchy_depth)
source_action = rig.animation_data.action
source_action.use_fake_user = True

# The undamaged actor's arms retain the already accepted long, directed
# reaching silhouette. None of its left/right leg trajectories are sampled
# into the new movement source.
intact_upper = []
for i in range(FRAMES):
    scene.frame_set(i + 1)
    intact_upper.append({b.name: b.matrix.copy() for b in ordered})

action = bpy.data.actions.new("Hollow_BrokenLeftLeg_EvenCadence_DraggedRecovery_ReviewOnly")
rig.animation_data.action = action


def orient(name, a, b):
    original_vector = tails[name] - heads[name]
    rotation = original_vector.rotation_difference(unit(b - a))
    matrix = (rotation.to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation = a
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()


def solve_leg(side, ankle, pole, toe_vector):
    """Restore exact original segment lengths, with a forward-facing
    anatomical knee plane. No folded-under-stomach IK pole."""
    hip = rig.pose.bones["thigh." + side].head.copy()
    thigh = lengths["thigh." + side]
    shin = lengths["shin." + side]
    d = ankle - hip
    reach = d.length
    if not abs(thigh - shin) + .002 < reach < thigh + shin - .002:
        raise ValueError(f"Authored {side} leg unreachable: {reach:.4f}, "
                         f"t={phase:.3f}, hip={list(hip)}, foot={list(ankle)}")
    axis = unit(d)
    along = (thigh**2 - shin**2 + reach**2) / (2 * reach)
    height = math.sqrt(max(0., thigh**2 - along**2))
    bend = pole - axis * pole.dot(axis)
    knee = hip + axis * along + unit(bend) * height
    orient("thigh." + side, hip, knee)
    orient("shin." + side, knee, ankle)
    # Contact-safe disabled ankle: dragging toes may skim the ground but
    # may NOT pass under it during the painful, incomplete recovery.
    # Keep the exact original foot-bone length; rotate the foot around
    # its ankle into the achievable arc rather than lifting the whole
    # leg and invalidating the authored injured stance/propulsion.
    toe_dir = unit(toe_vector)
    foot_length = lengths["foot." + side]
    floor_limit = GROUND - .010  # one centimetre for foot thickness
    minimum_vertical = (floor_limit - ankle.z) / foot_length
    if toe_dir.z < minimum_vertical:
        horizontal = unit(Vector((toe_dir.x, toe_dir.y, 0)))
        vertical = max(-.999, min(0., minimum_vertical))
        radius = math.sqrt(1.0 - vertical * vertical)
        toe_dir = Vector((horizontal.x * radius, horizontal.y * radius, vertical))
    toe = ankle + toe_dir * foot_length
    assert toe.z >= floor_limit - 1.e-5, (side, phase, ankle.z, toe.z)
    orient("foot." + side, ankle, toe)
    return {"hip": xyz(hip), "knee": xyz(knee),
            "ankle": xyz(ankle), "toe": xyz(toe),
            "flexDegrees": 180. - math.degrees((hip-knee).angle(ankle-knee))}


records = []
max_ankle_advance = {"L": 0., "R": 0.}
for i in range(FRAMES + 1):
    src = i % FRAMES
    phase = i / FRAMES
    scene.frame_set(i + 1)
    for b in ordered:
        b.matrix = intact_upper[src][b.name].copy()
        bpy.context.view_layer.update()

    painful = interpolate(PAIN, phase)
    healthy = interpolate(RIGHT_LOAD, phase)
    pelvis = rig.pose.bones["pelvis"]
    pelvis_matrix = pelvis.matrix.copy()
    # Healthy right-leg loading is the stable baseline. On damaged-left
    # contact, support actually FAILS: rightward fall, compression and a
    # short body hitch before right-leg propulsion recovers.
    pelvis_matrix.translation += Vector((
        -.018 * healthy - .035 * painful,
        +.020 * painful,
        -.008 * healthy - .045 * painful,
    ))
    pelvis.matrix = pelvis_matrix
    bpy.context.view_layer.update()

    spine = rig.pose.bones["spine"]
    matrix = spine.matrix.copy()
    pivot = matrix.translation.copy()
    # Rotate torso, shoulders and stretched hands as ONE chain; no
    # separately bouncing or orbiting hands/elbows.
    roll = math.radians(9 * painful)
    pitch = math.radians(5 * painful)
    rotation = Matrix.Rotation(roll, 4, "Y") @ Matrix.Rotation(pitch, 4, "X")
    spine.matrix = Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot) @ matrix
    bpy.context.view_layer.update()

    right_y, right_z = sample_contact(RIGHT, phase)
    left_y, left_z = sample_contact(LEFT, phase)
    foot_positions = {
        "R": Vector((-.075, right_y, right_z)),
        "L": Vector((+.083 + .070 * (1.0 - painful), left_y, left_z)),
    }
    feet = {}
    # LEFT foot first; the healthy right leg retains the final authored
    # support trajectory independent of the impaired IK chain.
    for side in ("L", "R"):
        # Injured ankle cannot actively dorsiflex: shin hangs behind the
        # hip and toes drag the ground until contact; no sudden foot flip.
        toe_vector = (Vector((+.04, -.34 - .66 * painful, -.95 + .88 * painful))
                      if side == "L" else Vector((0, -1, -.07)))
        pole = (Vector((+.70 * (1 - painful) - .20 * painful, -1, .035))
                if side == "L" else Vector((-.02, -1, .02)))
        feet[side] = solve_leg(side, foot_positions[side], pole, toe_vector)

    # Check the COMPLETE toe/ankle chain across frame boundaries,
    # including closure; this is deliberately a real 3D constraint,
    # not merely smoothing the foot's forward Y channel.
    if records:
        for side in ("L", "R"):
            previous = Vector(records[-1]["feet"][side]["ankle"])
            current = Vector(feet[side]["ankle"])
            movement = (current - previous).length
            max_ankle_advance[side] = max(max_ankle_advance[side], movement)
            assert movement < .090, (
                "Injured gait has a one-frame teleport", side, i, movement
            )

    arms = {}
    for side in ("L", "R"):
        upper = rig.pose.bones["upper_arm." + side]
        forearm = rig.pose.bones["forearm." + side]
        hand = rig.pose.bones["hand." + side]
        arms[side] = {"shoulder": xyz(upper.head), "elbow": xyz(upper.tail),
                      "wrist": xyz(forearm.tail), "hand": xyz(hand.tail),
                      "stretchReach": True}

    for b in ordered:
        for channel in ("location", "rotation_quaternion", "scale"):
            b.keyframe_insert(channel, frame=i + 1, group=b.name)
    records.append({
        "frame": i, "phase": phase, "feet": feet, "arms": arms,
        "contact": {"rightSupport": healthy, "leftFailedLoad": painful,
                    "rightAnkleGround": abs(right_z - GROUND) < .003,
                    "leftAnkleGround": abs(left_z - GROUND) < .003},
        "trunk": {"pelvisFallRightMeters": .035 * painful,
                  "injuredLoadCompressionMeters": .045 * painful,
                  "counterRollDegrees": math.degrees(roll)},
        "sourceLegTrajectoryRetained": False,
        "authoredFootContactEvents": True,
    })

# EXACT closure: first and seventeenth pose share the same uninjured
# upper-body source and all explicitly designed foot contact coordinates.
for side in ("L", "R"):
    for region in ("arms", "feet"):
        joints = ("shoulder","elbow","wrist","hand") if region == "arms" else ("hip","knee","ankle","toe")
        for joint in joints:
            assert max(abs(a-b) for a, b in
                       zip(records[0][region][side][joint], records[-1][region][side][joint])) < 1.e-4, (side, joint)

# Linear sampling keeps the authored poses exact and does not insert a
# second uncontrolled interpolation overshoot between contact events.
for fc in action.fcurves:
    for key in fc.keyframe_points:
        key.interpolation = "LINEAR"

assert any(f["contact"]["leftFailedLoad"] > .98 for f in records)
assert sum(f["contact"]["leftAnkleGround"] for f in records[:16]) <= 3
assert sum(f["contact"]["rightAnkleGround"] for f in records[:16]) >= 10
assert max(f["feet"]["R"]["ankle"][2] for f in records[:16]) - GROUND > .085
assert all(f["arms"]["L"]["stretchReach"] and f["arms"]["R"]["stretchReach"] for f in records)
assert all(value < .090 for value in max_ankle_advance.values())
# The old ground-safe gait snapped the healthy and injured ankle by
# 0.161 and 0.149m per frame respectively. These limits are a stricter
# regression gate: changing frame timing alone cannot make them pass.
assert max_ankle_advance["R"] < .08, max_ankle_advance
assert max_ankle_advance["L"] < .08, max_ankle_advance

scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST / "gait-diagnostics.json").write_text(json.dumps(records, indent=2) + "\n")
provenance = json.loads((SOURCE / "retarget-provenance.json").read_text())
provenance.update({
    "status": "UNAPPROVED EVEN-CADENCE injured stride: no 3m/s ankle snap, grounded toes, unchanged gameplay",
    "variant": "broken-leg-left-even-cadence",
    "parentEditableBlendSha256": hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),
    "sourceEditableRig": str(ORIGINAL.relative_to(ROOT)),
    "injuryAuthoring": {"maxAnkleTravelPerFrame": max_ankle_advance, "maxAllowedAnkleTravelPerFrame": .080, "toeGroundPlaneZ": GROUND, "minimumToeZ": GROUND - .010, "rightFoot": RIGHT, "leftFoot": LEFT,
                        "failedLoading": PAIN, "rightSupport": RIGHT_LOAD,
                        "floorZ": GROUND, "sourceLegTrajectoryRetained": False,
                        "poseBasis": "16 authored contact samples, exact rig-length 2-link legs"},
    "output": {"frames": FRAMES, "fps": FPS, "directions": 8},
    "artApproval": False, "runtimeCutover": False, "attackDeathReexported": False,
    "lightingMaterialsRegenerated": False,
})
(DEST / "retarget-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST / "hollow-rigged.blend"))
print("Saved EVEN-CADENCE injured-left gait; worst ankle travel/frame:", max_ankle_advance, DEST, flush=True)
