"""Second-pass physical weight transfer for Hollowed's injured left leg.

Starts from the independently editable, approved-direction trauma v1 Blender
candidate. The original recorded CMU running contact pattern is NOT invented
or repaced; body weight shifts and chest counter-lean are derived from the
*actual opposite foot clearance*. Both ankle/toe targets are then locked with
two-bone IK, so a dramatic sway never masquerades as foot sliding.

Review-only. Never replace game movement, source Blender, Ashling, G1 normals,
or authored production walk/attack/death.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-hollow-trauma-broken-leg-left"
DEST=MODEL/"rigged-hollow-trauma-broken-leg-weight-transfer-v2"
FRAMES=16
FPS=25

if DEST.exists():
    raise FileExistsError(f"Never overwrite editable candidate: {DEST}")
source_blend=SOURCE/"hollow-rigged.blend"
assert source_blend.exists()
bpy.ops.wm.open_mainfile(filepath=str(source_blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
character=bpy.data.objects["Hollow skinned character"]
assert len(character.data.polygons)==68380
scene=bpy.context.scene
bones=rig.data.bones
heads={b.name:b.head_local.copy() for b in bones}
tails={b.name:b.tail_local.copy() for b in bones}
rest={b.name:b.matrix_local.copy() for b in bones}
lengths={b.name:b.length for b in bones}
source=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(source)==17

def unit(v):
    if v.length<1e-8: raise ValueError("Degenerate joint")
    return v.normalized()

def clamp(value,lo,hi):
    return max(lo,min(hi,value))

def smooth(value):
    x=clamp(value,0.,1.)
    return x*x*(3-2*x)

def xyz(v):
    return [float(x) for x in v]

def orient(name,start,end):
    neutral=tails[name]-heads[name]
    matrix=(neutral.rotation_difference(end-start).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation=start
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def solve_leg(side,target_ankle,original_knee,original_toe):
    """Exact-length two-link knee, preserving captured knee bending plane."""
    thigh=rig.pose.bones["thigh."+side]
    hip=thigh.head.copy()
    dvec=target_ankle-hip
    dist=dvec.length
    l1=lengths["thigh."+side]
    l2=lengths["shin."+side]
    minimum=abs(l1-l2)+1e-5
    maximum=l1+l2-1e-5
    if not minimum<dist<maximum:
        raise ValueError(f"Unreachable {side} ankle/contact dist={dist:.6f}, reachable={maximum:.6f}")
    axis=unit(dvec)
    along=(l1*l1-l2*l2+dist*dist)/(2*dist)
    height=math.sqrt(max(0.,l1*l1-along*along))
    bend=original_knee-hip
    bend-=axis*bend.dot(axis)
    if bend.length<1e-5:
        bend=Vector((0,-1,0))-axis*axis.y*-1
    new_knee=hip+axis*along+unit(bend)*height
    orient("thigh."+side,hip,new_knee)
    orient("shin."+side,new_knee,target_ankle)
    # Preserve original foot pointing relative to source ankle, never
    # rotate toes arbitrarily in flight or independently wiggle the ankle.
    orient("foot."+side,target_ankle,target_ankle+
           unit(original_toe-target_ankle)*lengths["foot."+side])
    return hip,new_knee,target_ankle

def hierarchy_depth(bone):
    depth=0
    while bone.parent:
        depth+=1
        bone=bone.parent
    return depth

ordered=sorted(list(rig.pose.bones),key=hierarchy_depth)
original_action=rig.animation_data.action
original_action.use_fake_user=True
poses=[]
# Query true posed joints rather than imposing frame index sine curves.
for frame in range(FRAMES):
    scene.frame_set(frame+1)
    poses.append({
        "matrices":{bone.name:bone.matrix.copy() for bone in ordered},
        "ankle":{s:rig.pose.bones["shin."+s].tail.copy() for s in ("L","R")},
        "knee":{s:rig.pose.bones["thigh."+s].tail.copy() for s in ("L","R")},
        "toe":{s:rig.pose.bones["foot."+s].tail.copy() for s in ("L","R")}
    })
minimum={s:min(p["ankle"][s].z for p in poses) for s in ("L","R")}
clearance={s:max(p["ankle"][s].z for p in poses)-minimum[s] for s in ("L","R")}
assert all(c>.10 for c in clearance.values())
new_action=bpy.data.actions.new("Hollowed_CMU_BrokenLeftLeg_WeightTransfer_v2_UNAPPROVED")
rig.animation_data.action=new_action

evidence=[]
for i in range(FRAMES+1):
    j=i%FRAMES
    scene.frame_set(i+1)
    for bone in ordered:
        bone.matrix=poses[j]["matrices"][bone.name].copy()
        bpy.context.view_layer.update()
    frame=json.loads(json.dumps(source[j]))
    frame["frame"]=i
    old_ankles=poses[j]["ankle"]
    # Near-floor broken foot = weaker, painful stance.
    # Near-floor RIGHT foot with injured left raised = stronger right-side
    # load-bearing stance. No new gait frequency is added.
    left_clear=clamp((old_ankles["L"].z-minimum["L"])/clearance["L"],0,1)
    right_clear=clamp((old_ankles["R"].z-minimum["R"])/clearance["R"],0,1)
    healthy_support=smooth(left_clear)*(1-smooth(right_clear))
    injured_support=smooth(right_clear)*(1-smooth(left_clear))
    # Real asymmetric mass transfer: stronger load/right hip, short
    # compression while painful left stance. Small translation keeps true
    # ankle end points within both two-bone limb reach envelopes.
    hip_shift=Vector((
        -.037*healthy_support+.013*injured_support,
        -.013*healthy_support,
        -.012*injured_support-.004*healthy_support
    ))
    old_pelvis=rig.pose.bones["pelvis"].matrix.copy()
    # Keep root, parent bone scale and every source joint/mesh unchanged.
    pose_pelvis=old_pelvis.copy()
    pose_pelvis.translation+=hip_shift
    rig.pose.bones["pelvis"].matrix=pose_pelvis
    bpy.context.view_layer.update()

    # Compensate with thoracic spine/collar opposite the pelvic translation,
    # producing forward-driven uneven shoulder balance rather than a stiff
    # side-sliding figure. Based on the same actual stance contact.
    spine=rig.pose.bones["spine"]
    old_spine=spine.matrix.copy()
    counterlean_degrees=5.5*healthy_support-3.5*injured_support
    neck_roll=Matrix.Rotation(math.radians(counterlean_degrees),4,"Y")
    pivot=old_spine.translation.copy()
    spine.matrix=Matrix.Translation(pivot) @ neck_roll @ Matrix.Translation(-pivot) @ old_spine
    bpy.context.view_layer.update()

    # IK both legs to their ORIGINAL world-space ankle targets: this is
    # essential when the pelvis moves during either healthy/injured stance.
    for side in ("L","R"):
        hip,knee,ankle=solve_leg(side,old_ankles[side],poses[j]["knee"][side],poses[j]["toe"][side])
        frame["feet"][side].update({
            "hip":xyz(hip),"knee":xyz(knee),"ankle":xyz(ankle),
            "pelvisCompensation":True
        })
        assert (ankle-old_ankles[side]).length<1e-5

    frame["weightTransfer"]={
        "healthyRightSupport":healthy_support,
        "damagedLeftSupport":injured_support,
        "pelvisOffset":xyz(hip_shift),
        "thoracicCounterleanDegrees":counterlean_degrees,
        "bothAnklesAnchored":True,
        "sourceFrame":j
    }
    for bone in ordered:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    evidence.append(frame)

for curve in new_action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

# Cyclic and locomotion invariants. Character artistic quality is NOT
# asserted by geometric correctness alone.
for side in ("L","R"):
    for key in ("hip","knee","ankle"):
        assert max(abs(a-b) for a,b in zip(evidence[0]["feet"][side][key],evidence[-1]["feet"][side][key]))<1e-5
for i in range(FRAMES):
    for side in ("L","R"):
        for k,original in zip(evidence[i]["feet"][side]["ankle"],poses[i]["ankle"][side]):
            assert abs(k-original)<1e-5
assert max(abs(r["weightTransfer"]["pelvisOffset"][0]) for r in evidence)>.025
assert max(abs(r["weightTransfer"]["thoracicCounterleanDegrees"]) for r in evidence)>3
assert all(abs(a-b)<1e-6 for a,b in zip(evidence[0]["weightTransfer"]["pelvisOffset"],evidence[-1]["weightTransfer"]["pelvisOffset"]))
scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(evidence,indent=2)+"\n")
provenance=json.loads((SOURCE/"retarget-provenance.json").read_text())
provenance.update({
    "status":"UNAPPROVED broken left leg: contact-driven unequal loading + torso compensation",
    "variant":"broken-leg-left-weight-transfer-v2",
    "sourceEditableRig":str(source_blend.relative_to(ROOT)),
    "parentEditableBlendSha256":hashlib.sha256(source_blend.read_bytes()).hexdigest(),
    "weightTransfer":{
        "model":"source ankle-clearance stance phases; lateral hip loading and thoracic counterlean",
        "feet":"both original world-space ankles held via re-solved two-bone IK",
        "nonprocedural":"no independent sin/cos oscillators or jitter",
        "originalRecordedRunFps":FPS
    },
    "artApproval":False,
    "runtimeCutover":False,
    "attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Saved editable injured-left-leg source with TRUE weight transfer:",DEST,flush=True)
