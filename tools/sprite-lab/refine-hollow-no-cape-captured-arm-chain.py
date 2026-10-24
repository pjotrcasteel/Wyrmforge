"""Retarget captured 3-D arm CHAINS rather than separately waving hands.

The existing CMU-09_01 source contains a coherent measured shoulder-elbow-
wrist path. Earlier attempts separately projected a forearm into an arbitrary
forward 'C' and/or forced arm lift. This preserves the entire original
elbow bend and cross-body relationships in the exact measured 16-frame cycle,
and applies ONE constant camera-independent anatomical calibration rotation
per side around the captured moving shoulder.

Only shoulder-relative arm pose is changed. Original no-cape 3-D model,
leg/pelvis/cape geometry, motion capture and saved material atlases remain
untouched. New editable Blender .blend and full provenance are generated.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-mocap-no-cape-islands-candidate"
DEST=MODEL/"rigged-mocap-no-cape-captured-chain-candidate"
FRAMES=16
FPS=25

if DEST.exists():
    raise FileExistsError(f"Refusing to overwrite editable candidate: {DEST}")
src_blend=SOURCE/"hollow-rigged.blend"
bpy.ops.wm.open_mainfile(filepath=str(src_blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
mesh=bpy.data.objects["Hollow skinned character"]
assert len(mesh.data.polygons)==68380,"Must start from original verified no-cape geometry"
scene=bpy.context.scene
original=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(original)==17
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}

def unit(vector):
    if vector.length<1e-8:
        raise ValueError("Degenerate captured anatomical segment")
    return vector.normalized()

def orient(name,start,end):
    neutral=tails[name]-heads[name]
    rotated=(neutral.rotation_difference(end-start).to_matrix()@rest[name].to_3x3()).to_4x4()
    rotated.translation=start
    rig.pose.bones[name].matrix=rotated
    bpy.context.view_layer.update()

def angle(a,b):
    return math.degrees(a.angle(b))

def xyz(p):
    return [float(x) for x in p]

# Calibrate source RUN shoulder cycle using actual source contact-derived
# mean humerus vector. Rotate its mean shoulder-elbow vector into the vertical
# sagittal rest plane ONCE, not per frame. No periodic invented oscillators.
# Anatomically the upper arm should cross the shoulder plane during sprinting.
corrections={}
for side in ("L","R"):
    upper=[Vector(f["arms"][side]["elbow"])-Vector(f["arms"][side]["shoulder"])
           for f in original[:FRAMES]]
    mean=sum(upper,Vector((0,0,0)))/FRAMES
    # Negative signed angle: captured +Y posterior bias recentered at body,
    # with ~5deg anterior commitment at neutral gait. Original measured
    # shoulder and upper-arm timing/phase remains 100% unchanged.
    source_pitch=math.atan2(mean.y,-mean.z)
    anatomical_neutral=math.radians(-5)
    delta=anatomical_neutral-source_pitch
    if abs(math.degrees(delta))>35:
        raise ValueError(f"Source-to-character arm calibration excessive {side}: {math.degrees(delta)}")
    corrections[side]=Quaternion((1,0,0),delta)
    print(side,"original measured mean humerus",list(mean),
          "one-time shoulder calibration degrees",round(math.degrees(delta),3),flush=True)

def depth(b):
    d=0
    while b.parent:
        d+=1;b=b.parent
    return d
bones=sorted(list(rig.pose.bones),key=depth)
source_action=rig.animation_data.action
source_action.use_fake_user=True
source_poses=[]
for frame in range(FRAMES):
    scene.frame_set(frame+1)
    source_poses.append({b.name:b.matrix.copy() for b in bones})
action=bpy.data.actions.new("Hollow_CMU_CapturedArmChain_NoCape_UNAPPROVED")
rig.animation_data.action=action
records=[]

for i in range(FRAMES+1):
    src=i%FRAMES
    scene.frame_set(i+1)
    for bone in bones:
        bone.matrix=source_poses[src][bone.name].copy()
        bpy.context.view_layer.update()
    record=json.loads(json.dumps(original[src]))
    record["frame"]=i
    record["armMethod"]="single source-derived shoulder-space calibration rotating complete captured 3D arm chain"
    for side in ("L","R"):
        measured=original[src]["arms"][side]
        shoulder=rig.pose.bones["upper_arm."+side].head.copy()
        old_shoulder=Vector(measured["shoulder"])
        assert (old_shoulder-shoulder).length<.02
        old_elbow=Vector(measured["elbow"])
        old_wrist=Vector(measured["wrist"])
        old_hand=Vector(measured["hand"])
        rot=corrections[side]
        # Physically chained, no unrelated wrist or elbow world-space keys.
        # Preserve 3D shoulder/elbow/wrist angles EXACTLY after rigid rotation.
        elbow=shoulder+rot@(old_elbow-old_shoulder)
        wrist=elbow+rot@(old_wrist-old_elbow)
        hand=wrist+rot@(old_hand-old_wrist)
        for name,start,end in (
            ("upper_arm."+side,shoulder,elbow),
            ("forearm."+side,elbow,wrist),
            ("hand."+side,wrist,hand)):
            orient(name,start,end)
        source_upper=old_elbow-old_shoulder
        source_fore=old_wrist-old_elbow
        upper=elbow-shoulder
        fore=wrist-elbow
        assert abs(angle(source_upper,source_fore)-angle(upper,fore))<.001
        assert abs(upper.length-lengths["upper_arm."+side])<.0002
        assert abs(fore.length-lengths["forearm."+side])<.0002
        assert abs((hand-wrist).length-lengths["hand."+side])<.0002
        record["arms"][side]={
            "shoulder":xyz(shoulder),"elbow":xyz(elbow),
            "wrist":xyz(wrist),"hand":xyz(hand),
            "elbowFlexDegrees":original[src]["arms"][side]["elbowFlexDegrees"],
            "calibrationDegrees":math.degrees(corrections[side].angle),
            "originalElbowFlexDegrees":original[src]["arms"][side]["elbowFlexDegrees"]
        }
    # Original leg/hip/clavicle source is preserved; every original source
    # pose is keyed and the only new keys are actual arm-chain rotations.
    for bone in bones:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    records.append(record)

for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

for side in ("L","R"):
    for name in ("shoulder","elbow","wrist","hand"):
        a=Vector(records[0]["arms"][side][name])
        b=Vector(records[-1]["arms"][side][name])
        assert (a-b).length<1e-5,(side,name)
    prev_angle=None
    for frame in records[:FRAMES]:
        a=frame["arms"][side]
        sh,el,wr,hand=[Vector(a[k]) for k in ("shoulder","elbow","wrist","hand")]
        assert abs((el-sh).length-lengths["upper_arm."+side])<.0002
        assert abs((wr-el).length-lengths["forearm."+side])<.0002
        assert wr.x*(1 if side=="L" else -1)>0
        assert hand.z<sh.z+.08, "Raise/hook above shoulder: inspect"
        if prev_angle is not None:
            assert abs(a["elbowFlexDegrees"]-prev_angle)<14
        prev_angle=a["elbowFlexDegrees"]
    rear_front=[(Vector(f["arms"][side]["elbow"])-Vector(f["arms"][side]["shoulder"])).y for f in records[:FRAMES]]
    assert min(rear_front)<-.045 and max(rear_front)>.04,(side,rear_front)

scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(records,indent=2)+"\n")
parent=json.loads((SOURCE/"retarget-provenance.json").read_text())
parent.update({
    "status":"UNAPPROVED measured-source 3D arm-chain recalibration, visual motion gate required",
    "parentEditableBlendSha256":hashlib.sha256(src_blend.read_bytes()).hexdigest(),
    "sourceEditableRig":str(src_blend.relative_to(ROOT)),
    "anatomicalRepair":{
        "method":"one source-measured mean-humerus correction per arm; rotate WHOLE arm chain about captured moving shoulder",
        "shoulderCalibrationDegrees":{s:float(math.degrees(corrections[s].angle)) for s in corrections},
        "elbow":"retains full captured 3D elbow angle and frame-to-frame changes exactly",
        "wrist":"no authored standalone trajectory; preserved 3D elbow->wrist offset",
        "hand":"no authored standalone trajectory; preserved 3D wrist->hand offset",
        "legs":"all original 16 CMU leg/hip/contact source keys unchanged",
        "costume":"verified real mesh cape deleted (73 islands)"
    },
    "output":{"frames":FRAMES,"fps":FPS,"directions":"eight-direction review only"},
    "artApproval":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(parent,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Independent no-cape source-captured whole-arm-chain rig:",DEST,flush=True)
