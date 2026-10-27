"""Author a distinct source-skeletal Hollowed attack, NOT recycled walking poses.

Used for visual-review renders on the real cape-free, fully weighted source
Blender rigs. Existing published walk/attack atlases stay unchanged until QC.
The original walk action is preserved. A new attack action gives the creature
an anticipation crouch, a two-arm/hunched-torso lunge, and a planted recovery.
Each transition is keyed continuously at the source-pose level, never by
replaying the walking loop under an attack label.
"""
from __future__ import annotations

import math
from mathutils import Quaternion, Vector

FRAME_COUNT = 16
FPS = 12
# Attack timeline: grounded anticipation (1-5), reach (6-9), recoil (10-12),
# settling into the locomotion support pose (13-16).
POSE_KNOTS = (
    # frame, windup, strike, recoil, torso forward, head forward
    (1, 0.00, 0.00, 0.00, 0.00, 0.00),
    (3, 0.55, 0.00, 0.00, 0.08, 0.05),
    (5, 1.00, 0.00, 0.00, 0.14, 0.10),
    (7, 0.18, 1.00, 0.00, 0.95, 0.85),
    (9, 0.00, 0.95, 0.00, 1.00, 1.00),
    (11, 0.00, 0.20, 1.00, 0.50, 0.70),
    (13, 0.00, 0.00, 0.55, 0.24, 0.35),
    (16, 0.00, 0.00, 0.00, 0.00, 0.00),
)

def attack_channels(frame):
    if not 1 <= frame <= FRAME_COUNT:
        raise ValueError(f"Attack frame outside authored clip: {frame}")
    for i in range(len(POSE_KNOTS) - 1):
        a, b = POSE_KNOTS[i], POSE_KNOTS[i + 1]
        if a[0] <= frame <= b[0]:
            t = (frame - a[0]) / (b[0] - a[0])
            eased = t*t*(3 - 2*t)
            return tuple(a[j] * (1 - eased) + b[j] * eased for j in range(1, 6))
    return POSE_KNOTS[-1][1:]


def author_attack_action(bpy, rig):
    if rig.type != "ARMATURE" or not rig.animation_data or not rig.animation_data.action:
        raise ValueError("Missing actual original Hollowed walk action")
    original = rig.animation_data.action
    # Sample the exact original planted source pose and retain genuine local
    # skeletal coordinates. No additive 2D deformation of the final sprite.
    baseline = {}
    rig.rotation_euler.z = 0
    bpy.context.scene.frame_set(3)
    bpy.context.view_layer.update()
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
        baseline[pb.name] = (
            pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()
        )

    action = bpy.data.actions.new("Hollow_Gothic_Fire_Lunge_Attack_16")
    rig.animation_data.action = action
    for frame in range(1, FRAME_COUNT + 1):
        windup, strike, recoil, forward, head = attack_channels(frame)
        for pb in rig.pose.bones:
            location, rotation, scale = baseline[pb.name]
            pb.location = location.copy()
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = rotation.copy()
            pb.scale = scale.copy()
            name = pb.name
            # Core mass pitches towards the victim and recoils, independent
            # of which arms/legs exist in each REAL damaged body.
            if name == "pelvis":
                pb.location.z -= .022*windup + .014*strike
                pb.location.y -= .018*windup + .085*strike - .026*recoil
            elif name in ("spine", "chest"):
                angle = (-.19*windup + .38*forward - .11*recoil) * (1.0 if name == "chest" else .64)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), angle) @ pb.rotation_quaternion
            elif name == "neck":
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), -.10*windup + .24*head) @ pb.rotation_quaternion
            elif name == "head":
                pitch = .17*windup - .24*head
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), pitch) @ pb.rotation_quaternion
            elif name.startswith("clavicle.") or name.startswith("upper_arm."):
                side = 1 if name.endswith(".L") else -1
                pitch = -.44*windup + .98*strike - .21*recoil
                if name.startswith("upper_arm."):
                    pitch *= .87
                pb.rotation_quaternion = (
                    Quaternion(Vector((1, 0, 0)), pitch)
                    @ Quaternion(Vector((0, 1, 0)), side*(.16*windup + .23*strike))
                    @ pb.rotation_quaternion
                )
            elif name.startswith("forearm."):
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), -.55*windup + 1.18*strike - .26*recoil) @ pb.rotation_quaternion
            elif name.startswith("hand."):
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), .25*windup - .52*strike) @ pb.rotation_quaternion
            # Lower legs are held at real planted 3D support pose. Never
            # animate walk-cycle stride through a supposedly rooted strike.
            pb.keyframe_insert("location", frame=frame, group=name)
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=name)
            pb.keyframe_insert("scale", frame=frame, group=name)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = FRAME_COUNT
    bpy.context.scene.frame_set(1)
    for fc in action.fcurves:
        for key in fc.keyframe_points:
            key.interpolation = "BEZIER"
            key.handle_left_type = "AUTO_CLAMPED"
            key.handle_right_type = "AUTO_CLAMPED"
    # Source action stays in the Blender file so both source clips remain
    # editable independently. A walk/attack/turn QC sequence is rendered next.
    return {
        "sourceWalkAction": original.name,
        "newAttackAction": action.name,
        "frames": FRAME_COUNT,
        "fps": FPS,
        "attackSourceKeyed": True,
        "windupFrames": [2, 3, 4, 5],
        "strikeFrames": [6, 7, 8, 9],
        "recoveryFrames": [10, 11, 12, 13, 14, 15, 16],
        "lockedPlantedLegs": True,
    }
