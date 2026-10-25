"""Correct the no-cape Hollowed's anatomically implausible arm action.

Source: genuine 120Hz CMU running capture already retargeted to the original
Blender skeleton. Fore/aft arm PHASE and bilateral opposition come from measured
CMU elbow/wrist trajectories, not sine/cosine animators or frozen arms.
This follow-up rebuilds physically linked segments around the recorded moving
shoulders. Preserve existing editable sources, leg motion, skull, clothing,
all production sprites, and PR #332 lighting.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-mocap-no-cape-islands-candidate"
DEST=MODEL/"rigged-mocap-no-cape-sprint-guarded-candidate"
FRAMES=16
FPS=25

if DEST.exists():
    raise FileExistsError(f"Never overwrite separate artist source: {DEST}")
original_blend=SOURCE/"hollow-rigged.blend"
assert original_blend.is_file()
bpy.ops.wm.open_mainfile(filepath=str(original_blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
skinned=bpy.data.objects["Hollow skinned character"]
assert len(skinned.data.polygons) < 70000, "No-cape source geometry was not loaded"
scene=bpy.context.scene
source=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(source)==17
bones=rig.data.bones
rest={b.name:b.matrix_local.copy() for b in bones}
heads={b.name:b.head_local.copy() for b in bones}
tails={b.name:b.tail_local.copy() for b in bones}
lengths={b.name:b.length for b in bones}
before={(side,region):[
    Vector(frame["arms"][side][region]) for frame in source[:FRAMES]
] for side in ("L","R") for region in ("shoulder","elbow","wrist","hand")}
def unit(vector):
    if vector.length<1e-8:
        raise ValueError("Degenerate original-skeleton segment")
    return vector.normalized()
def clamp(value,lo,hi):
    return max(lo,min(hi,value))
def v3(vector):
    return [float(x) for x in vector]
def orient(name,start,end):
    delta=end-start
    if delta.length<1e-6:
        raise ValueError(f"Collapsed {name}")
    neutral=tails[name]-heads[name]
    # Keep all editability and original bone lengths; pose.matrix accounts
    # for actual parent transforms, unlike directly writing only local Euler.
    matrix=(neutral.rotation_difference(delta).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation=start
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()
def flex(shoulder,elbow,wrist):
    return 180-math.degrees((shoulder-elbow).angle(wrist-elbow))

# Correct documented baseline fault: the upper arms never swing ahead of the
# torso. They spend the entire captured review behind it. Recover the ORIGINAL
# measured timing, but center the upper arm's fore/aft range around the captured
# shoulder instead of retaining the source actor's ragged, extended-zombie pose.
centers={}
for side in ("L","R"):
    centers[side]=sum((before[side,"elbow"][i].y-before[side,"shoulder"][i].y)
                      for i in range(FRAMES))/FRAMES

# Capture all ORIGINAL source pose matrices before assigning a new action.
# Otherwise scene.frame_set() on an empty action would silently freeze the
# pelvis, knees, shoulders and 120Hz-derived running motion in frame 1.
# Parent-order application preserves exact known source geometry/stance.
def depth(bone):
    value=0
    while bone.parent:
        value+=1
        bone=bone.parent
    return value
ordered_bones=sorted(list(rig.pose.bones),key=depth)
original_action=rig.animation_data.action
original_action.use_fake_user=True
source_poses=[]
for frame in range(FRAMES):
    scene.frame_set(frame+1)
    source_poses.append({bone.name:bone.matrix.copy() for bone in ordered_bones})
action=bpy.data.actions.new("Hollowed_CMU_ShoulderDrivenArmGuard_NO_CAPE_UNAPPROVED")
rig.animation_data.action=action
records=[]
for index in range(FRAMES+1):
    source_frame=index%FRAMES
    scene.frame_set(index+1)
    for bone in ordered_bones:
        bone.matrix=source_poses[source_frame][bone.name].copy()
        bpy.context.view_layer.update()
    evidence=json.loads(json.dumps(source[source_frame]))
    evidence["frame"]=index
    evidence["description"]="CMU-measured shoulder/elbow reciprocal phase, rigid anatomical segments, no hand oscillators"
    for side,sign in (("L",1),("R",-1)):
        measured=source[source_frame]["arms"][side]
        shoulder=rig.pose.bones["upper_arm."+side].head.copy()
        source_shoulder=Vector(measured["shoulder"])
        assert (shoulder-source_shoulder).length<.02,(side,index,"unexpected shoulder drift")
        old_elbow=Vector(measured["elbow"])
        old_wrist=Vector(measured["wrist"])
        upper_len=lengths["upper_arm."+side]
        fore_len=lengths["forearm."+side]
        hand_len=lengths["hand."+side]

        raw_fore_aft=old_elbow.y-source_shoulder.y
        upper_fore_aft=clamp((raw_fore_aft-centers[side])*1.12-.018,-.098,.105)
        lateral=clamp(old_elbow.x-source_shoulder.x,-.035,.035)
        # The humerus must lead; its captured shoulder is the unique origin.
        upper_drop=math.sqrt(upper_len**2-upper_fore_aft**2-lateral**2)
        elbow=shoulder+Vector((lateral,upper_fore_aft,-upper_drop))
        orient("upper_arm."+side,shoulder,elbow)

        # The preceding full-retarget lifted the forearm into an unrealistic
        # raised boxing guard. Keep captured forearm travel and wrist recovery
        # but constrain the sagittal hinge to a LOW, relaxed infected sprinter
        # hand path. Distinct captured wrist samples still determine the
        # orientation (we never drive the wrist with independent sine waves).
        fore=old_wrist-old_elbow
        fore_x=clamp(fore.x,-.024,.024)
        fore_z=clamp(fore.z,-.025,.038)
        fore_y=-math.sqrt(fore_len**2-fore_x**2-fore_z**2)
        wrist=elbow+Vector((fore_x,fore_y,fore_z))
        orient("forearm."+side,elbow,wrist)

        # Long claw geometry must drop FROM the hand, rather than hooking up
        # like a boxer. A fixed anatomy-specific wrist rest bias follows the
        # measured forearm without a separate animated wrist controller.
        direction=unit((wrist-elbow)*.14+Vector((sign*.014,-.019,-.125)))
        hand=wrist+direction*hand_len
        orient("hand."+side,wrist,hand)

        evidence["arms"][side]={
            "shoulder":v3(shoulder),"elbow":v3(elbow),
            "wrist":v3(wrist),"hand":v3(hand),
            "elbowFlexDegrees":flex(shoulder,elbow,wrist),
            "sourceElbowForeAft":raw_fore_aft,
            "retargetedElbowForeAft":upper_fore_aft
        }
    # Key ALL pose bones, not just six arms: preserve the actual CMU source
    # leg stance, neck movement, shoulder girdle and pelvis for every frame.
    for bone in ordered_bones:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=index+1,group=bone.name)
    records.append(evidence)

# In Blender the action channels must remain cyclic; avoid auto handles that
# overshoot hand or elbow direction over the last->first interpolated frame.
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

for side in ("L","R"):
    def sizes(key):
        return [Vector(frame["arms"][side][key]) for frame in records]
    shoulders,elbows,wrists,hands=(sizes(key) for key in ("shoulder","elbow","wrist","hand"))
    for k in range(FRAMES):
        assert abs((elbows[k]-shoulders[k]).length-lengths["upper_arm."+side])<2e-5
        assert abs((wrists[k]-elbows[k]).length-lengths["forearm."+side])<2e-5
        assert abs((hands[k]-wrists[k]).length-lengths["hand."+side])<2e-5
        assert 58<records[k]["arms"][side]["elbowFlexDegrees"]<155
        assert wrists[k].z < shoulders[k].z-.035
        assert hands[k].z < elbows[k].z
        assert ((elbows[k]-shoulders[k]).z < -.1)
        assert (hands[k]-wrists[k]).z<0
        # Hands shall not cross the body's sagittal midline.
        assert wrists[k].x* (1 if side=="L" else -1)>0
    for key in ("shoulder","elbow","wrist","hand"):
        assert (sizes(key)[0]-sizes(key)[-1]).length<1e-5,(side,key)
    # Shoulder should initiate an active run, elbow anterior + posterior.
    fwd=[(elbows[k]-shoulders[k]).y for k in range(FRAMES)]
    assert min(fwd)<-.06 and max(fwd)>.045,(side,fwd)

scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(records,indent=2)+"\n")
parent=json.loads((SOURCE/"retarget-provenance.json").read_text())
parent.update({
    "status":"UNAPPROVED no-cape low-arm sprint, gait and art visual acceptance required",
    "sourceEditableRig":str(original_blend.relative_to(ROOT)),
    "parentEditableBlendSha256":hashlib.sha256(original_blend.read_bytes()).hexdigest(),
    "anatomicalRepair":{
        "upperArm":"captured-phase shoulder-led upper arm swings front AND rear of torso",
        "forearm":"captured wrist travel projected to low sagittal-plane running hinge",
        "hand":"downward claw at forearm-dependent resting angle; no raised boxing guard",
        "legs":"original CMU leg source / foot plants unchanged",
        "source":"CMU 09_01 original 120Hz running motion; no added sine/cosine limb curves",
        "cape":"fully deleted whole rear cloth islands in base editable mesh"},
    "output":{"frames":FRAMES,"fps":FPS,"directions":"review only, no material cutover"},
    "artApproval":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(parent,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Authored separate NO-CAPE shoulder-led sprint review rig:",DEST,flush=True)
