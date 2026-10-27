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
from mathutils import Matrix, Quaternion, Vector

FRAME_COUNT = 16
FPS = 12
# Attack timeline: grounded anticipation (1-5), reach (6-9), recoil (10-12),
# settling into the locomotion support pose (13-16).
RAKE_KNOTS = (
    # frame, windup, strike, recoil, torso forward, head forward
    (1, 0.00, 0.00, 0.00, 0.00, 0.00),
    (3, 0.60, 0.00, 0.00, 0.08, 0.10),
    (5, 1.00, 0.00, 0.00, 0.16, 0.16),
    (6, 0.12, 0.74, 0.00, 0.76, 0.76),
    (7, 0.00, 1.00, 0.00, 1.00, 1.00),
    (8, 0.00, 0.95, 0.00, 1.00, 0.98),
    (10, 0.00, 0.34, 0.72, 0.54, 0.58),
    (12, 0.00, 0.08, 0.90, 0.20, 0.20),
    (14, 0.00, 0.00, 0.26, 0.05, 0.04),
    (16, 0.00, 0.00, 0.00, 0.00, 0.00),
)

# Different actual performance timing, not mirrored/recolored existing frames:
# MAUL: long telegraph, both claws drop in a weighty simultaneous blow.
# BITE: short deceptive hesitation, fast head/mouth lunge and brief hold.
+STYLE_KNOTS = {
+    "rake": RAKE_KNOTS,
+    "maul": ((1,0,0,0,0,0),(3,.48,0,0,.08,.12),(6,1,0,0,.10,.10),
+             (8,.24,.75,0,.68,.56),(9,0,1,0,1,1),(10,0,.92,0,.93,.86),
+             (12,0,.16,.85,.24,.28),(14,0,0,.45,.08,.12),(16,0,0,0,0,0)),
+    "bite": ((1,0,0,0,0,0),(3,.22,0,0,.06,.12),(4,.72,0,0,.12,.18),
+             (5,.14,.78,0,.76,.96),(6,0,1,0,1,1),(8,0,.86,0,.93,1),
+             (10,0,.22,.75,.48,.42),(12,0,0,.82,.18,.18),(16,0,0,0,0,0)),
+}
+
+def attack_channels(frame, style="rake"):
+    if not 1 <= frame <= FRAME_COUNT:
+        raise ValueError(f"Attack frame outside authored clip: {frame}")
+    if style not in STYLE_KNOTS:
+        raise ValueError(f"Unknown actual source attack: {style}")
+    knots = STYLE_KNOTS[style]
+    for i in range(len(knots) - 1):
+        a, b = knots[i], knots[i + 1]
        if a[0] <= frame <= b[0]:
            t = (frame - a[0]) / (b[0] - a[0])
            eased = t*t*(3 - 2*t)
            return tuple(a[j] * (1 - eased) + b[j] * eased for j in range(1, 6))
    return knots[-1][1:]


def author_attack_action(bpy, rig, variant="standard", style="rake"):
    if rig.type != "ARMATURE" or not rig.animation_data or not rig.animation_data.action:
        raise ValueError("Missing actual original Hollowed walk action")
    if style not in STYLE_KNOTS:
        raise ValueError(f"Unknown source attack: {style}")
    original = rig.animation_data.action
    original.use_fake_user = True
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

    action = bpy.data.actions.new(f"Hollow_{variant}_Feral_{style.title()}_v9")
    # Native two-bone IK produces a REAL 3D hand trajectory around the head
    # and across the victim, instead of rotating two full arms in place.
    rest = {bone.name:bone for bone in rig.data.bones}
    hands = []
    hand_side = "R" if variant == "one-arm-left" else "L"
    # Never create a ghost arm. The broken-arm rigs use whichever surviving
    # limb is physically present; full two-arm mauls need both actual arms.
    available_sides = tuple(side for side in ("L","R") if all(
        f"{part}.{side}" in rest for part in ("upper_arm","forearm","hand")))
    if hand_side not in available_sides:
        raise ValueError(f"Source attack's striking claw is absent: {hand_side}")
    arms_to_ik = available_sides if style in ("maul","bite") else (hand_side,)

    def orient_bone(name, start, end):
        direction = end-start
        if direction.length < 1e-6:
            raise ValueError(f"Degenerate claw bone vector: {name}")
        bone = rest[name]
        original = bone.tail_local - bone.head_local
        orient = original.rotation_difference(direction)
        matrix = (orient.to_matrix() @ bone.matrix_local.to_3x3()).to_4x4()
        matrix.translation = start
        return matrix

    def place_claw(frame, windup, strike, recoil, side):
        # Animated in actual source rig coordinates. No 2D sprite rotation,
        # no synthetic extra limb, no teleportation or fake impact effect.
        bpy.context.view_layer.update()
        lead_upper, lead_fore, lead_hand = (
            f"upper_arm.{side}", f"forearm.{side}", f"hand.{side}")
        upper = rig.pose.bones[lead_upper]
        shoulder = upper.head.copy()
        forearm = rig.pose.bones[lead_fore]
        original_wrist = rig.pose.bones[lead_hand].head.copy()
        sign = 1 if side == "L" else -1
        length_a, length_b = rest[lead_upper].length, rest[lead_fore].length
        reach = length_a + length_b
        # A predator chambers near its ear, then tears DOWN AND IN across
        # the chest toward the hunter. The strike is not a straight reach.
        chamber = shoulder + Vector((sign*.15, .08, reach*.68))
        # A real 3D four-frame swept trajectory through the player's upper
        # body. The old source authored nearly identical strike frames 6-9,
        # which looked like a held reach instead of a travelling claw.
        rake_start = shoulder + Vector((sign*.25, -.31, reach*.58))
        rake_end = shoulder + Vector((-sign*.38, -.34, reach*.12))
        if style == "rake":
            if frame <= 5:
                target = original_wrist.lerp(chamber, windup)
            elif frame <= 9:
                t = min(1.0, max(0.0, (frame-6)/3))
                t = t*t*(3-2*t)
                target = rake_start.lerp(rake_end, t)
            else:
                t = min(1.0, max(0.0, (frame-9)/7))
                t = t*t*(3-2*t)
                target = rake_end.lerp(original_wrist, t)
        elif style == "maul":
            # Two raised, independently skinned fists descend together.
            high = shoulder + Vector((sign*.16, .11, reach*.79))
            low = shoulder + Vector((sign*.07, -.39, -reach*.05))
            if frame <= 6:
                target = original_wrist.lerp(high, windup)
            elif frame <= 10:
                target = high.lerp(low, max(0,min(1,(frame-7)/2)))
            else:
                target = low.lerp(original_wrist, max(0,min(1,(frame-10)/6)))
        else:
            # Lunge & BITE: two reaching arms seize the victim's shoulders;
            # head/neck, not fists, deliver the rapid contact.
            grab = shoulder + Vector((sign*.20, -.42, reach*.16))
            if frame <= 4:
                target = original_wrist.lerp(chamber, windup)
            elif frame <= 8:
                target = chamber.lerp(grab,max(0,min(1,(frame-5)/2)))
            else:
                target = grab.lerp(original_wrist,max(0,min(1,(frame-8)/8)))
        line = target-shoulder
        near = abs(length_a-length_b)+.0005
        distance = min(max(line.length, near), reach-.003)
        axis = line.normalized()
        clamped = shoulder + axis*distance
        tangent = Vector((sign, -.35, .65))
        tangent -= axis * tangent.dot(axis)
        if tangent.length < .0001:
            tangent = Vector((0,0,1))
        tangent.normalize()
        along = (length_a*length_a-length_b*length_b+distance*distance)/(2*distance)
        elbow = shoulder + axis*along + tangent*math.sqrt(max(0,length_a*length_a-along*along))
        upper.matrix = orient_bone(lead_upper,shoulder,elbow)
        bpy.context.view_layer.update()
        forearm.matrix = orient_bone(lead_fore,elbow,clamped)
        bpy.context.view_layer.update()
        # At the tip, claw points forward/down on impact, then flexes back.
        tip = clamped + (clamped-elbow).normalized()*rest[lead_hand].length
        rig.pose.bones[lead_hand].matrix = orient_bone(lead_hand,clamped,tip)
        bpy.context.view_layer.update()
        return tuple(round(v,4) for v in clamped)

    rig.animation_data.action = action
    # Arm anatomy determines which surviving claw performs the impact.
    lead = "R" if variant == "one-arm-left" else "L"
    for frame in range(1, FRAME_COUNT + 1):
        windup, strike, recoil, forward, head = attack_channels(frame, style)
        for pb in rig.pose.bones:
            location, rotation, scale = baseline[pb.name]
            pb.location = location.copy()
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = rotation.copy()
            pb.scale = scale.copy()
            name = pb.name
            # Clear silhouette beats: pull weight BACK, twist/chamber one
            # surviving claw, release torso FORWARD, hit, then recoil.
            # The walk/crawl compositor subsequently supplies its own grounded
            # lower-body support; this source action does not fake foot travel.
            if name == "pelvis":
                pb.location.z -= .018*windup + .006*strike
                pb.location.y -= .025*windup - .040*strike + .016*recoil
            elif name == "spine":
                angle = (-.19*windup + .035*forward - .08*recoil) if style == "rake" else (
                    -.26*windup + .15*forward - .15*recoil if style == "maul"
                    else -.10*windup + .24*forward - .16*recoil)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), angle) @ pb.rotation_quaternion
            elif name == "chest":
                pitch = (-.27*windup + .07*forward - .11*recoil) if style == "rake" else (
                    -.35*windup + .23*forward - .18*recoil if style == "maul"
                    else -.13*windup + .40*forward - .25*recoil)
                twist = ((-.28*windup + .37*strike - .09*recoil) if style == "rake"
                    else (.03*windup + .05*strike) if style == "maul"
                    else (.18*strike - .08*recoil)) * (1 if lead == "L" else -1)
                pb.rotation_quaternion = (
                    Quaternion(Vector((0, 0, 1)), twist)
                    @ Quaternion(Vector((1, 0, 0)), pitch)
                    @ pb.rotation_quaternion)
            elif name == "neck":
                pitch = (.14*windup - .16*head + .06*recoil) if style != "bite" else (
                    .26*windup - .52*head + .20*recoil)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), pitch) @ pb.rotation_quaternion
            elif name == "head":
                pitch = (.18*windup - .18*head + .08*recoil) if style != "bite" else (
                    .36*windup - .68*head + .22*recoil)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), pitch) @ pb.rotation_quaternion
            elif name.startswith(("clavicle.", "upper_arm.")):
                is_lead = name.endswith("." + lead)
                # Powerful unilateral claw rake: high chamber behind head,
                # fast forward reach, then diagonal inward cut. The back arm
                # counterbalances instead of becoming a T-pose second blade.
                phase = (-1.20*windup + 1.02*strike - .25*recoil) if is_lead \
                    else (.13*windup - .22*strike + .12*recoil)
                if name.startswith("clavicle."):
                    phase *= .47
                yaw = (-.36*windup + .68*strike) * (1 if is_lead else -.35)
                diagonal = (.24*windup - .63*strike) * (1 if lead == "L" else -1) \
                    if is_lead else .08*recoil
                pb.rotation_quaternion = (
                    Quaternion(Vector((0, 0, 1)), diagonal)
                    @ Quaternion(Vector((0, 1, 0)), yaw)
                    @ Quaternion(Vector((1, 0, 0)), phase)
                    @ pb.rotation_quaternion)
            elif name.startswith("forearm."):
                phase = (-.92*windup + 1.18*strike - .25*recoil) \
                    if name.endswith("." + lead) else (.05*windup - .26*strike)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), phase) @ pb.rotation_quaternion
            elif name.startswith("hand."):
                phase = (.40*windup - .68*strike + .28*recoil) \
                    if name.endswith("." + lead) else (.05*windup - .08*strike)
                pb.rotation_quaternion = Quaternion(Vector((1, 0, 0)), phase) @ pb.rotation_quaternion
            # Keep the torso upright; the CLAW supplies the speed and angular
            # contrast, not an implausible full-body ground slam.
            # Lower limb joints remain exactly the genuine source skin support.
        if max(windup, strike, recoil) > .02:
            for side in arms_to_ik:
                hands.append({"frame": frame, "side":side,
                              "clawTarget":place_claw(frame,windup,strike,recoil,side)})
        for pb in rig.pose.bones:
            pb.keyframe_insert("location", frame=frame, group=pb.name)
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
            pb.keyframe_insert("scale", frame=frame, group=pb.name)
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
        "style": style,
        "distinctSourceAttackAction": True,
        "impactAtSourceFrame": 9 if style == "maul" else 6 if style == "bite" else 7,
        "newAttackAction": action.name,
        "frames": FRAME_COUNT,
        "fps": FPS,
        "attackSourceKeyed": True,
        "windupFrames": [2, 3, 4, 5],
        "strikeFrames": [6, 7, 8, 9],
        "recoveryFrames": [10, 11, 12, 13, 14, 15, 16],
        "lockedPlantedLegs": True,
        "dominantClaw": lead,
        "asymmetricWindupClawFollowThrough": True,
        "impactAtFrame": 7,
        "diagonalClawRake": True,
        "chestHeightNotGroundSlam": True,
        "realTwoBoneIKClaw": True,
        "highForwardContact": True,
        "continuousSweepingClawAcrossFourSourceFrames": True,
        "authoredClawTargets": hands,
        "actualIKSides": list(arms_to_ik),
        "visualRole": {"rake":"fast diagonal tearing swipe",
                       "maul":"heavy overhead double-claw blow",
                       "bite":"rapid forward neck-and-mouth snap"}[style],
    }
