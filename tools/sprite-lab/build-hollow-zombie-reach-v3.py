"""Hollowed v3: stretched zombie reach, single-usable-arm injuries, severe limp.

Builds ONLY new editable Blender review candidates from the approved-direction
no-cape rig and source-mocap injury poses. Keeps all prior v1/v2 experiments,
approved production assets, Ashling and GPU renderer unchanged.

Healthy arms: shoulder-led forward extension, ~150-170 deg elbows; intact
shoulder motion from CMU survives, and the wrist continues its forearm.
Damaged arm: preserve the existing injury pose while extending ONLY the
functional arm. Broken leg: retain v2 hip loading, add painful left-stance
hip drop and genuine contact-aware swing drag with two-link knee recovery.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

parser=argparse.ArgumentParser()
parser.add_argument("--variant",required=True,
                    choices=("standard","broken-arm-right","one-arm-left","broken-leg-left"))
args=parser.parse_args()
variant=args.variant
ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
source_paths={
 "standard":"rigged-mocap-no-cape-captured-hands-candidate",
 "broken-arm-right":"rigged-hollow-trauma-broken-arm-right",
 "one-arm-left":"rigged-hollow-trauma-one-arm-left",
 "broken-leg-left":"rigged-hollow-trauma-broken-leg-weight-transfer-v2"
}
SOURCE=MODEL/source_paths[variant]
DEST=MODEL/("rigged-hollow-zombie-reach-v3-"+variant)
if DEST.exists():
    raise FileExistsError(f"Do not overwrite review artwork: {DEST}")
blend=SOURCE/"hollow-rigged.blend"
assert blend.is_file()
bpy.ops.wm.open_mainfile(filepath=str(blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
actor=bpy.data.objects["Hollow skinned character"]
assert len(actor.data.polygons)==68380
scene=bpy.context.scene
F=16
bones=rig.data.bones
rest={b.name:b.matrix_local.copy() for b in bones}
heads={b.name:b.head_local.copy() for b in bones}
tails={b.name:b.tail_local.copy() for b in bones}
lengths={b.name:b.length for b in bones}
original=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(original)==17
def unit(v):
    if v.length<1e-8:raise ValueError("zero length")
    return v.normalized()
def clamp(x,lo,hi):return max(lo,min(hi,x))
def smooth(x):
    x=clamp(x,0.,1.)
    return x*x*(3-2*x)
def xyz(v):return [float(x) for x in v]
def orient(name,head,tail):
    neutral=tails[name]-heads[name]
    matrix=(neutral.rotation_difference(tail-head).to_matrix()@rest[name].to_3x3()).to_4x4()
    matrix.translation=head
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()
def flex(a,b,c):
    return 180-math.degrees((a-b).angle(c-b))
def depth(b):
    i=0
    while b.parent:
        b=b.parent;i+=1
    return i

ordered=sorted(list(rig.pose.bones),key=depth)
old_action=rig.animation_data.action
assert old_action
old_action.use_fake_user=True
samples=[]
for frame in range(16):
    scene.frame_set(frame+1)
    samples.append({
      "pose":{b.name:b.matrix.copy() for b in ordered},
      "legs":{s:{
        "ankle":rig.pose.bones["shin."+s].tail.copy(),
        "knee":rig.pose.bones["thigh."+s].tail.copy(),
        "toe":rig.pose.bones["foot."+s].tail.copy()
      } for s in ("L","R")}
    })
floor=min(sample["legs"]["L"]["ankle"].z for sample in samples)
clearance=max(sample["legs"]["L"]["ankle"].z for sample in samples)-floor
assert clearance>.14
action=bpy.data.actions.new("Hollow_CMU_ZombieReach_v3_"+variant.replace("-","_")+"_UNAPPROVED")
rig.animation_data.action=action

def exact_ik_leg(side,ankle,original_knee,toe):
    hip=rig.pose.bones["thigh."+side].head.copy()
    length1=lengths["thigh."+side]
    length2=lengths["shin."+side]
    axis=ankle-hip
    distance=axis.length
    min_dist=abs(length1-length2)+.001
    max_dist=length1+length2-.001
    if not min_dist<distance<max_dist:
        raise ValueError(f"Unreachable {side} source foot {distance:.4f}; allowed {min_dist:.4f}–{max_dist:.4f}")
    along=(length1**2-length2**2+distance**2)/(2*distance)
    lift=math.sqrt(max(0.,length1**2-along**2))
    axis=unit(axis)
    pole=original_knee-hip
    pole-=axis*pole.dot(axis)
    if pole.length<1e-6:
        pole=Vector((0,-1,0))-axis*axis.y*-1
    knee=hip+axis*along+unit(pole)*lift
    orient("thigh."+side,hip,knee)
    orient("shin."+side,knee,ankle)
    orient("foot."+side,ankle,ankle+unit(toe-samples[0]["legs"][side]["ankle"])*lengths["foot."+side])
    return hip,knee

records=[]
for i in range(F+1):
    j=i%F
    scene.frame_set(i+1)
    for b in ordered:
        b.matrix=samples[j]["pose"][b.name].copy()
        bpy.context.view_layer.update()
    frame=json.loads(json.dumps(original[j]))
    frame["frame"]=i
    frame["reachStyle"]="shoulder-driven mostly extended zombie arms, not half-flexed boxer running"

    if variant=="broken-leg-left":
        leg=samples[j]["legs"]["L"]
        source_ankle=leg["ankle"]
        fraction=smooth((source_ankle.z-floor)/clearance)
        # Strong visually distinguishable dragged swing. Zero at stance:
        # no kick, no planted foot slide. Direction comes from captured foot.
        desired=source_ankle.copy()
        desired.z-=.11*fraction
        desired.y+=.08*fraction
        desired.x+=.028*fraction
        # Keep hip from v2, but drop on the painful LEFT loading phase.
        injured=frame["weightTransfer"]["damagedLeftSupport"]
        healthy=frame["weightTransfer"]["healthyRightSupport"]
        pelvic=rig.pose.bones["pelvis"]
        m=pelvic.matrix.copy()
        # Mild extra compressive collapse; preserve original reach envelope.
        drop=.015*injured
        m.translation.z-=drop
        pelvic.matrix=m
        bpy.context.view_layer.update()
        torso=rig.pose.bones["spine"]
        origin=torso.matrix.translation.copy()
        ang=math.radians(5.0*healthy-7.0*injured)
        torso.matrix=Matrix.Translation(origin)@Matrix.Rotation(ang,4,"Y")@Matrix.Translation(-origin)@torso.matrix.copy()
        bpy.context.view_layer.update()
        # Stance feet retain EXACT previous source position, both resolved
        # against relocated pelvis. Only injured foot during swing drags.
        left_hip,left_knee=exact_ik_leg("L",desired,leg["knee"],leg["toe"])
        right=samples[j]["legs"]["R"]
        right_hip,right_knee=exact_ik_leg("R",right["ankle"],right["knee"],right["toe"])
        for side,hip,knee,ankle in (
            ("L",left_hip,left_knee,desired),("R",right_hip,right_knee,right["ankle"])
        ):
            frame["feet"][side].update({
                "hip":xyz(hip),"knee":xyz(knee),"ankle":xyz(ankle),
                "kneeFlexDegrees":flex(hip,knee,ankle)
            })
        frame["limpV3"]={
            "leftSwingDrag":float(fraction),
            "leftFootDelta":xyz(desired-source_ankle),
            "extraHipDrop":drop,
            "torsoCompensationDegrees":math.degrees(ang),
            "rightFootPlantedOnOriginalTrajectory":True
        }

    active=("L",) if variant=="broken-arm-right" else ("R",) if variant=="one-arm-left" else ("L","R")
    for side in active:
        sign=1 if side=="L" else -1
        upper=rig.pose.bones["upper_arm."+side]
        fore=rig.pose.bones["forearm."+side]
        hand=rig.pose.bones["hand."+side]
        shoulder=upper.head.copy()
        old_upper=unit(upper.tail-shoulder)
        old_fore=unit(fore.tail-fore.head)
        # The captured shoulder drives the real 16-frame cycle, while
        # arm reaches forward at shoulder height, long and almost straight.
        # Small source vectors preserve organic motion / opposite-side sway.
        upper_dir=unit(old_upper*.17+unit(Vector((sign*.13,-.94,-.30)))*.83)
        fore_dir=unit(old_fore*.12+unit(Vector((sign*.06,-.97,-.22)))*.88)
        elbow=shoulder+upper_dir*lengths["upper_arm."+side]
        wrist=elbow+fore_dir*lengths["forearm."+side]
        # Forearm-following claw hangs slightly downward, never hooks up
        # or flips independently. Both bones remain anatomically editable.
        claw_dir=unit(fore_dir*.75+Vector((sign*.018,-.06,-.25))*.25)
        tip=wrist+claw_dir*lengths["hand."+side]
        orient("upper_arm."+side,shoulder,elbow)
        orient("forearm."+side,elbow,wrist)
        orient("hand."+side,wrist,tip)
        degrees=flex(shoulder,elbow,wrist)
        assert 142<degrees<178,(variant,side,i,degrees)
        assert wrist.y<shoulder.y-.23
        frame["arms"][side].update({
            "shoulder":xyz(shoulder),"elbow":xyz(elbow),
            "wrist":xyz(wrist),"hand":xyz(tip),
            "elbowFlexDegrees":degrees,"fullyFunctional":True,
            "stretchReach":True
        })
    for side in ("L","R"):
        if side not in active:
            frame["arms"][side].update({"fullyFunctional":False,"stretchReach":False})
    for bone in ordered:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    records.append(frame)

for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

for side in ("L","R"):
    for key in ("shoulder","elbow","wrist","hand"):
        a=records[0]["arms"][side][key];b=records[-1]["arms"][side][key]
        assert max(abs(x-y) for x,y in zip(a,b))<1e-5,(side,key)
    for key in ("hip","knee","ankle"):
        a=records[0]["feet"][side][key];b=records[-1]["feet"][side][key]
        assert max(abs(x-y) for x,y in zip(a,b))<1e-5,(side,key)
    assert all(len(f["arms"][side]["hand"])==3 for f in records)
if variant=="broken-leg-left":
    assert max(f["limpV3"]["leftSwingDrag"] for f in records)>.9
    assert max(f["limpV3"]["extraHipDrop"] for f in records)>.013
    for i in range(F):
        l=records[i]["limpV3"]
        if l["leftSwingDrag"]<1e-5:
            assert max(abs(x) for x in l["leftFootDelta"])<1e-5

scene.frame_start=1;scene.frame_end=F;scene.render.fps=25;scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(records,indent=2)+"\n")
parent=json.loads((SOURCE/"retarget-provenance.json").read_text())
parent.update({
 "status":"UNAPPROVED v3 user-directed stretched zombie arm / emphatic limp review",
 "variant":variant,
 "sourceEditableRig":str(blend.relative_to(ROOT)),
 "parentEditableBlendSha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
 "design":{
  "healthyArms":"shoulder-led near full forward extension; elbow flex typically 150-170 degrees",
  "injuredArm":"only undamaged side reaches forward; damaged side retains original authored v1 injury",
  "brokenLeg":"injured foot 0.11m lower, 0.08m shorter swing reach at maximum; source-contact-driven extra hip drop, compensatory lean",
  "legs":"original right-foot contacts; affected left swing only, no new motion oscillator"
 },
 "output":{"frames":F,"fps":25,"directions":8},
 "artApproval":False,"runtimeCutover":False,"attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(parent,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Saved full source and 17 cyclic real Blender poses for",variant,DEST,flush=True)
