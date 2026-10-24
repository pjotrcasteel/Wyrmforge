"""Build three physically distinct, editable cape-free Hollowed injury variants.

Original CMU running poses are authoritative. Damage is authored as bounded
joint-chain compensation dependent on captured foot clearance / arm posture:
NO independent sine/cosine wrist or ankle motion. Preserve original Blender,
CMU BVH, materials, source meshes, attack/death, Ashling and engine PR #332.

Usage: python tools/sprite-lab/build-hollow-trauma-variant.py --variant broken-leg-left
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

VARIANTS=("broken-leg-left","broken-arm-right","one-arm-left")
parser=argparse.ArgumentParser()
parser.add_argument("--variant",choices=VARIANTS,required=True)
args=parser.parse_args()
variant=args.variant
ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-mocap-no-cape-captured-hands-candidate"
DEST=MODEL/("rigged-hollow-trauma-"+variant)
FRAMES=16
FPS=25
if DEST.exists():
    raise FileExistsError(f"Never overwrite existing editable model: {DEST}")
source_blend=SOURCE/"hollow-rigged.blend"
assert source_blend.exists()
bpy.ops.wm.open_mainfile(filepath=str(source_blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
character=bpy.data.objects["Hollow skinned character"]
assert len(character.data.polygons)==68380
scene=bpy.context.scene
rig_bones=rig.data.bones
rest={b.name:b.matrix_local.copy() for b in rig_bones}
heads={b.name:b.head_local.copy() for b in rig_bones}
tails={b.name:b.tail_local.copy() for b in rig_bones}
lengths={b.name:b.length for b in rig_bones}
source_records=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(source_records)==17

def unit(v:Vector)->Vector:
    if v.length<1e-8:
        raise ValueError("Degenerate anatomical joint vector")
    return v.normalized()

def clamp(v:float,low:float,high:float)->float:
    return max(low,min(high,v))

def blend(a:Vector,b:Vector,amount:float)->Vector:
    return (a*(1-amount)+b*amount)

def xyz(v:Vector)->list[float]:
    return [float(x) for x in v]

def orient(name:str,start:Vector,end:Vector)->None:
    delta=end-start
    if delta.length<1e-6:
        raise ValueError(f"Collapsed bone: {name}")
    neutral=tails[name]-heads[name]
    matrix=(neutral.rotation_difference(delta).to_matrix()@rest[name].to_3x3()).to_4x4()
    matrix.translation=start
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def flex(start:Vector,middle:Vector,end:Vector)->float:
    return 180-math.degrees((start-middle).angle(end-middle))

def hierarchy_depth(bone)->int:
    n=0
    while bone.parent:
        bone=bone.parent
        n+=1
    return n

ordered_bones=sorted(list(rig.pose.bones),key=hierarchy_depth)
original_action=rig.animation_data.action
assert original_action is not None
original_action.use_fake_user=True
source_poses=[]
for i in range(FRAMES):
    scene.frame_set(i+1)
    source_poses.append({b.name:b.matrix.copy() for b in ordered_bones})

# Physical ground/stride phase comes from original captured foot height.
left_ankles=[Vector(f["feet"]["L"]["ankle"]) for f in source_records[:FRAMES]]
ground=min(v.z for v in left_ankles)
clearance=max(v.z for v in left_ankles)-ground
mean_reach=sum(p.y for p in left_ankles)/FRAMES
assert clearance>.15
assert len(source_poses)==FRAMES
action=bpy.data.actions.new("Hollowed_CMU_Trauma_"+variant.replace("-","_")+"_UNAPPROVED")
rig.animation_data.action=action

variant_config={
    "broken-leg-left":{
        "injury":"left knee/leg has reduced swing clearance, shortened forward reach and weak propulsion",
        "mechanics":"source-height driven foot drag and exact two-bone IK; healthy right leg remains captured",
        "attackingArms":["L","R"],"impairedLeg":"L","impairedArm":None},
    "broken-arm-right":{
        "injury":"right upper arm damaged, elbow guarded close to the ribs, limited countermotion",
        "mechanics":"bounded captured shoulder motion with partially constrained elbow, functioning left arm",
        "attackingArms":["L"],"impairedLeg":None,"impairedArm":"R"},
    "one-arm-left":{
        "injury":"left arm unusable, hanging with mild captured torso-follow, right arm compensates",
        "mechanics":"slack left shoulder/elbow from captured arm chain, right arm retains full sprint motion",
        "attackingArms":["R"],"impairedLeg":None,"impairedArm":"L"}
}
recorded=[]
max_healthy_leg_error=0.0
modified_joint_frames=0

for i in range(FRAMES+1):
    source_index=i%FRAMES
    scene.frame_set(i+1)
    for bone in ordered_bones:
        bone.matrix=source_poses[source_index][bone.name].copy()
        bpy.context.view_layer.update()
    frame=json.loads(json.dumps(source_records[source_index]))
    frame["frame"]=i
    frame["variant"]=variant

    if variant=="broken-leg-left":
        side="L"
        thigh=rig.pose.bones["thigh."+side]
        shin=rig.pose.bones["shin."+side]
        foot=rig.pose.bones["foot."+side]
        hip=thigh.head.copy()
        knee=thigh.tail.copy()
        ankle=shin.tail.copy()
        toe=foot.tail.copy()
        original_distance=(ankle-hip).length
        # Ground contact is unchanged: both recovery clearance and reach
        # are progressively reduced ONLY as source foot rises into swing.
        phase=clamp((ankle.z-ground)/clearance,0,1)
        influence=phase*phase*(3-2*phase)
        target=ankle.copy()
        target.y+=(mean_reach-ankle.y)*.43*influence
        target.z-=.083*influence
        target.x+=.014*influence
        axis=target-hip
        # Reconstruct the real two-bone hinge with original segment lengths.
        l1=lengths["thigh."+side]
        l2=lengths["shin."+side]
        distance=clamp(axis.length,abs(l1-l2)+.008,l1+l2-.008)
        axis=unit(axis)
        new_ankle=hip+axis*distance
        along=(l1*l1-l2*l2+distance*distance)/(2*distance)
        high=math.sqrt(max(0,l1*l1-along*along))
        bend=(knee-hip)-axis*((knee-hip).dot(axis))
        if bend.length<.005:
            bend=Vector((0,-1,0))-axis*(axis.y*-1)
        new_knee=hip+axis*along+unit(bend)*high
        orient("thigh."+side,hip,new_knee)
        orient("shin."+side,new_knee,new_ankle)
        toe=new_ankle+unit(toe-ankle)*lengths["foot."+side]
        orient("foot."+side,new_ankle,toe)
        frame["feet"][side].update({
            "hip":xyz(hip),"knee":xyz(new_knee),"ankle":xyz(new_ankle),
            "kneeFlexDegrees":flex(hip,new_knee,new_ankle),
            "swingInfluence":float(influence),
            "toe":xyz(toe)
        })
        modified_joint_frames+=int(influence>.05)
        if influence<.001:
            assert (new_ankle-ankle).length<.008,"Ground-planted injured foot moved"
        # Do not touch the undamaged planted right leg.
        other=rig.pose.bones["shin.R"].tail
        expected=source_poses[source_index]["shin.R"].translation
        max_healthy_leg_error=max(max_healthy_leg_error,(other-rig.pose.bones["shin.R"].tail).length)

    else:
        side="R" if variant=="broken-arm-right" else "L"
        sign=-1 if side=="R" else 1
        upper=rig.pose.bones["upper_arm."+side]
        fore=rig.pose.bones["forearm."+side]
        palm=rig.pose.bones["hand."+side]
        shoulder=upper.head.copy()
        old_elbow=upper.tail.copy()
        old_wrist=fore.tail.copy()
        old_hand=palm.tail.copy()
        old_upper=unit(old_elbow-shoulder)
        old_fore=unit(old_wrist-old_elbow)
        old_palm=unit(old_hand-old_wrist)

        if variant=="broken-arm-right":
            # Close to ribs and guarded, retaining enough captured following
            # action to prevent a frozen or snapping injured shoulder.
            upper_rest=unit(Vector((sign*.045,.014,-.183)))
            fore_rest=unit(Vector((-sign*.038,-.036,-.143)))
            upper_dir=unit(blend(old_upper,upper_rest,.72))
            fore_dir=unit(blend(old_fore,fore_rest,.72))
            palm_dir=unit(blend(old_palm,fore_dir,.65))
        else:
            # Unusable left arm hangs near hip; the elbow responds subtly
            # to torso momentum but cannot take part in attack motion.
            upper_rest=unit(Vector((sign*.055,.055,-.165)))
            fore_rest=unit(Vector((sign*.038,.028,-.150)))
            upper_dir=unit(blend(old_upper,upper_rest,.87))
            fore_dir=unit(blend(old_fore,fore_rest,.88))
            palm_dir=unit(blend(old_palm,fore_dir,.78))

        elbow=shoulder+upper_dir*lengths["upper_arm."+side]
        wrist=elbow+fore_dir*lengths["forearm."+side]
        hand=wrist+palm_dir*lengths["hand."+side]
        orient("upper_arm."+side,shoulder,elbow)
        orient("forearm."+side,elbow,wrist)
        orient("hand."+side,wrist,hand)
        frame["arms"][side].update({
            "shoulder":xyz(shoulder),"elbow":xyz(elbow),
            "wrist":xyz(wrist),"hand":xyz(hand),
            "elbowFlexDegrees":flex(shoulder,elbow,wrist),
            "disabledForAttack":variant=="one-arm-left",
            "injuryConstrained":True
        })
        modified_joint_frames+=1

    for bone in ordered_bones:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    recorded.append(frame)

for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

for side in ("L","R"):
    for joint in ("shoulder","elbow","wrist","hand"):
        assert max(abs(x-y) for x,y in zip(recorded[0]["arms"][side][joint],recorded[-1]["arms"][side][joint]))<1e-5
    for joint in ("hip","knee","ankle"):
        assert max(abs(x-y) for x,y in zip(recorded[0]["feet"][side][joint],recorded[-1]["feet"][side][joint]))<1e-5

if variant=="broken-leg-left":
    original=[Vector(f["feet"]["L"]["ankle"]) for f in source_records[:FRAMES]]
    revised=[Vector(f["feet"]["L"]["ankle"]) for f in recorded[:FRAMES]]
    assert max((a-b).length for a,b in zip(original,revised))>.035
    assert modified_joint_frames>=5
    assert all(recorded[i]["feet"]["R"]==source_records[i]["feet"]["R"] for i in range(FRAMES))
else:
    arm=variant_config[variant]["impairedArm"]
    original=[Vector(f["arms"][arm]["wrist"]) for f in source_records[:FRAMES]]
    revised=[Vector(f["arms"][arm]["wrist"]) for f in recorded[:FRAMES]]
    assert max((a-b).length for a,b in zip(original,revised))>.035
    assert all(recorded[i]["feet"]==source_records[i]["feet"] for i in range(FRAMES))
assert modified_joint_frames>=5

scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(recorded,indent=2)+"\n")
source_provenance=json.loads((SOURCE/"retarget-provenance.json").read_text())
source_provenance.update({
    "status":"UNAPPROVED authored trauma locomotion; individual GIF owner review required",
    "variant":variant,
    "damage":variant_config[variant],
    "sourceEditableRig":str(source_blend.relative_to(ROOT)),
    "parentEditableBlendSha256":hashlib.sha256(source_blend.read_bytes()).hexdigest(),
    "derivation":"CMU measured sprint; deterministic bounded damaged joint chains, no procedural sine/cosine limb waves",
    "output":{"frames":FRAMES,"fps":FPS,"directions":8},
    "artApproval":False,"runtimeCutover":False,"attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(source_provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Authored",variant,"into separate original-editable Blender rig",DEST,flush=True)
