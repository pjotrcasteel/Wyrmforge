"""Hollowed broken LEFT leg V4: injury in stance, not just an ankle drag.

Source: previous fully rendered V3 no-cape actor, including the owner's
approved-direction stretched zombie arms. Refine only this leg/torso:
- PAINFUL LEFT FOOT LOADING: heel remains planted while pelvis buckles
  down/right, left knee visibly swings outward, chest counter-rolls.
- HEALTHY RIGHT STANCE: right ankle plants; damaged left foot remains low,
  toes point down, recovery stays shortened.
- Original rig/meshes and ALL V1-V3 sources retained; no wrist animation,
  GPU-engine modification, gameplay speed change or production cutover.

An independent editable Blender candidate, 16 source-key cyclic animation.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-hollow-zombie-reach-v3-broken-leg-left"
DEST=MODEL/"rigged-hollow-broken-leg-buckling-v4"
ORIGINAL=SOURCE/"hollow-rigged.blend"
if DEST.exists():
    raise FileExistsError(f"Do not overwrite previous review: {DEST}")
bpy.ops.wm.open_mainfile(filepath=str(ORIGINAL))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
rig=bpy.data.objects["Hollow editable animation rig"]
mesh=bpy.data.objects["Hollow skinned character"]
assert len(mesh.data.polygons)==68380
source=json.loads((SOURCE/"gait-diagnostics.json").read_text())
assert len(source)==17

rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}
def unit(v):
    if v.length<1e-8: raise ValueError("collapsed anatomical segment")
    return v.normalized()
def xyz(v): return [float(x) for x in v]
def clamp(x,a,b):return max(a,min(b,x))
def bone_depth(b):
    depth=0
    while b.parent:
        depth+=1;b=b.parent
    return depth
def orient(name,a,b):
    neutral=tails[name]-heads[name]
    matrix=(neutral.rotation_difference(b-a).to_matrix()@rest[name].to_3x3()).to_4x4()
    matrix.translation=a
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()
def real_interior_knee(hip,knee,ankle):
    return math.degrees((hip-knee).angle(ankle-knee))

ordered=sorted(list(rig.pose.bones),key=bone_depth)
original_action=rig.animation_data.action
original_action.use_fake_user=True
poses=[]
for i in range(16):
    scene.frame_set(i+1)
    poses.append({
        "bone":{b.name:b.matrix.copy() for b in ordered},
        "feet":{s:{
           "hip":rig.pose.bones["thigh."+s].head.copy(),
           "knee":rig.pose.bones["thigh."+s].tail.copy(),
           "ankle":rig.pose.bones["shin."+s].tail.copy(),
           "toe":rig.pose.bones["foot."+s].tail.copy(),
        } for s in ("L","R")}
    })
action=bpy.data.actions.new("Hollow_CMU_BrokenLeftLeg_BuckleAndDrag_v4_UNAPPROVED")
rig.animation_data.action=action

def solve_leg(side,original,injured_loading,drag):
    """Ankle pinned to prior V3 location; knee solves exact bone lengths.

    The bend POLE is changed on the left injured stance to form a
    distinguishable outward crooked knee; no joint length is altered.
    """
    ankle=original["ankle"]
    hip=rig.pose.bones["thigh."+side].head.copy()
    vector=ankle-hip
    distance=vector.length
    thigh=lengths["thigh."+side];shin=lengths["shin."+side]
    maximum=thigh+shin-.001
    minimum=abs(thigh-shin)+.001
    if not minimum<distance<maximum:
        raise ValueError(f"{side} contact outside 2-link reach: {distance:.6f} not in ({minimum:.6f},{maximum:.6f})")
    axis=unit(vector)
    along=(thigh*thigh-shin*shin+distance*distance)/(2*distance)
    altitude=math.sqrt(max(0,thigh*thigh-along*along))
    bend=original["knee"]-hip
    # Original captured leg bending plane is retained as a starting point.
    # Deliberately imperfect injured-leg knee hinges out while LOAD-BEARING.
    if side=="L":
        bend+=Vector((.105*injured_loading,-.065*injured_loading,.020*injured_loading))
    bend-=axis*bend.dot(axis)
    if bend.length<1e-7:
        bend=Vector((0,-1,0))-axis*(-axis.y)
    knee=hip+axis*along+unit(bend)*altitude
    orient("thigh."+side,hip,knee)
    orient("shin."+side,knee,ankle)
    original_toe_direction=unit(original["toe"]-ankle)
    if side=="L":
        # Trailing injured foot droops on swing, NOT during ground contact.
        drooped=unit(Vector((.04,-.32,-.94)))
        toe_dir=unit(original_toe_direction*(1-.78*drag)+drooped*(.78*drag))
    else:
        toe_dir=original_toe_direction
    orient("foot."+side,ankle,ankle+toe_dir*lengths["foot."+side])
    return hip,knee,ankle,toe_dir

evidence=[]
for i in range(17):
    src=i%16
    scene.frame_set(i+1)
    for b in ordered:
        b.matrix=poses[src]["bone"][b.name].copy()
        bpy.context.view_layer.update()
    frame=json.loads(json.dumps(source[src]))
    frame["frame"]=i
    injured=frame["weightTransfer"]["damagedLeftSupport"]
    healthy=frame["weightTransfer"]["healthyRightSupport"]
    drag=frame["limpV3"]["leftSwingDrag"]

    # Visible knee collapse happens WHEN putting weight on the BROKEN
    # LEFT leg. The old 0.015 depression never read at 96px: replace with
    # additional ~0.060 at full injured loading (but check BOTH ankle
    # length constraints before accepting any frame).
    pelvis=rig.pose.bones["pelvis"]
    matrix=pelvis.matrix.copy()
    offset=Vector((+.055*injured-.010*healthy,0,-.060*injured+.006*healthy))
    matrix.translation+=offset
    pelvis.matrix=matrix
    bpy.context.view_layer.update()

    # Body tilts BACK towards the healthier right leg as painful left
    # support collapses. This does not animate hands separately and keeps
    # stretched-arm posture relative to the torso.
    spine=rig.pose.bones["spine"]
    base=spine.matrix.copy()
    origin=base.translation.copy()
    twist=math.radians(-12.0*injured+4.0*healthy)
    spine.matrix=Matrix.Translation(origin)@Matrix.Rotation(twist,4,"Y")@Matrix.Translation(-origin)@base
    bpy.context.view_layer.update()

    for side in ("L","R"):
        hip,knee,ankle,toe_dir=solve_leg(side,poses[src]["feet"][side],injured,drag)
        frame["feet"][side].update({
            "hip":xyz(hip),"knee":xyz(knee),"ankle":xyz(ankle),
            "toe":xyz(ankle+toe_dir*lengths["foot."+side]),
            "interiorKneeDegrees":real_interior_knee(hip,knee,ankle)
        })
        assert (ankle-poses[src]["feet"][side]["ankle"]).length<1e-5

    # Update diagnostics to real evaluated skeleton, not stale source.
    for side in ("L","R"):
        arm=rig.pose.bones["upper_arm."+side]
        elbow=rig.pose.bones["forearm."+side]
        wrist=rig.pose.bones["hand."+side]
        frame["arms"][side].update({
            "shoulder":xyz(arm.head),"elbow":xyz(arm.tail),
            "wrist":xyz(elbow.tail),"hand":xyz(wrist.tail)
        })
    frame["limpV4"]={
        "leftInjuredStance":injured,
        "rightHealthyStance":healthy,
        "leftSwingDrag":drag,
        "extraPelvisOffset":xyz(offset),
        "extraThoraxCounterRollDegrees":math.degrees(twist),
        "crookedKneePoleShift":.105*injured,
        "droopingToeSwing":.78*drag,
        "bothSourceFootContactsLocked":True,
        "legBoneLengthsUnchanged":True,
        "sourceFrame":src
    }
    for bone in ordered:
        for property in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(property,frame=i+1,group=bone.name)
    evidence.append(frame)
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"

for side in ("L","R"):
    for region,keys in (("arms",("shoulder","elbow","wrist","hand")),("feet",("hip","knee","ankle","toe"))):
        for k in keys:
            a=evidence[0][region][side][k]
            b=evidence[16][region][side][k]
            assert max(abs(x-y) for x,y in zip(a,b))<1e-5,(side,region,k)
assert max(x["limpV4"]["leftInjuredStance"] for x in evidence)>.99
assert max(abs(x["limpV4"]["extraPelvisOffset"][2]) for x in evidence)>.055
assert max(x["limpV4"]["crookedKneePoleShift"] for x in evidence)>.10
assert max(x["limpV4"]["droopingToeSwing"] for x in evidence)>.75

scene.frame_start=1;scene.frame_end=16;scene.render.fps=25;scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(evidence,indent=2)+"\n")
provenance=json.loads((SOURCE/"retarget-provenance.json").read_text())
provenance.update({
 "status":"UNAPPROVED V4 genuine broken-leg loading/buckle/crooked knee and toe drag review",
 "variant":"broken-leg-left-buckling-v4",
 "sourceEditableRig":str(ORIGINAL.relative_to(ROOT)),
 "parentEditableBlendSha256":hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),
 "legDamage":{
   "physicalStance":"extra 0.060m hip collapse and 0.055m lateral weight shift at broken left foot support, torso counterroll up to -12deg",
   "anatomy":"real two-bone knee IK, lateral injured knee bend pole, measured old fixed ankles",
   "drag":"existing V3 lower foot swing + forward-reach limit, added natural drooped toes",
   "healthyLeg":"original right ankle contact unchanged"
 },
 "artApproval":False,"runtimeCutover":False,"attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("New independent V4 no-cape broken-leg 16 source-driven frames:",DEST,flush=True)
