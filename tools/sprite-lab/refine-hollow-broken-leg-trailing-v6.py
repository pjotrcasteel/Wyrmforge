"""Hollowed broken LEFT leg V6: damaged foot truly TRAILS behind, not folded underneath.

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
SOURCE=MODEL/"rigged-hollow-broken-leg-impact-v5"
DEST=MODEL/"rigged-hollow-broken-leg-trailing-v6"
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
action=bpy.data.actions.new("Hollow_CMU_BrokenLeftLeg_TrailingFoot_v6_UNAPPROVED")
rig.animation_data.action=action

def solve_leg(side,original,injured_loading,drag,target_ankle):
    """Ankle pinned to prior V3 location; knee solves exact bone lengths.

    The bend POLE is changed on the left injured stance to form a
    distinguishable outward crooked knee; no joint length is altered.
    """
    ankle=target_ankle
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
    # Source V4 already carries the prior crooked left knee. During impact
    # its loading pole receives a second, sharper anatomical side-buckle.
    if side=="L":
        bend+=Vector((.095*injured_loading,-.035*injured_loading,.016*injured_loading))
    bend-=axis*bend.dot(axis)
    if bend.length<1e-7:
        bend=Vector((0,-1,0))-axis*(-axis.y)
    knee=hip+axis*along+unit(bend)*altitude
    orient("thigh."+side,hip,knee)
    orient("shin."+side,knee,ankle)
    original_toe_direction=unit(original["toe"]-original["ankle"])
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
    drag=frame["limpV5"]["leftSwingDrag"]
    # A sharp, physical impact event from actual source captured stance,
    # not a periodic keyframe wave or independently animated shin.
    pain_impact=clamp((injured-.32)/.68,0.,1.)
    pain_impact=pain_impact*pain_impact*(3.-2.*pain_impact)

    # Visible knee collapse happens WHEN putting weight on the BROKEN
    # LEFT leg. The old 0.015 depression never read at 96px: replace with
    # additional ~0.060 at full injured loading (but check BOTH ankle
    # length constraints before accepting any frame).
    pelvis=rig.pose.bones["pelvis"]
    matrix=pelvis.matrix.copy()
    offset=Vector((+.060*pain_impact,0,-.052*pain_impact))
    matrix.translation+=offset
    pelvis.matrix=matrix
    bpy.context.view_layer.update()

    # Body tilts BACK towards the healthier right leg as painful left
    # support collapses. This does not animate hands separately and keeps
    # stretched-arm posture relative to the torso.
    spine=rig.pose.bones["spine"]
    base=spine.matrix.copy()
    origin=base.translation.copy()
    twist=math.radians(-9.0*pain_impact)
    pitch=math.radians(6.0*pain_impact)
    rotation=Matrix.Rotation(twist,4,"Y")@Matrix.Rotation(pitch,4,"X")
    spine.matrix=Matrix.Translation(origin)@rotation@Matrix.Translation(-origin)@base
    bpy.context.view_layer.update()

    # Earlier V3-V5 unintentionally pulled the damaged foot TOWARDS the
    # shoulder (negative Y), making the leg tuck under the stomach.
    # Here the injured free foot actually trails posterior (+Y), outward
    # (+X), and close to the ground. Keep original landing frames locked.
    old_ankle=poses[src]["feet"]["L"]["ankle"]
    injured_target=old_ankle.copy()
    injured_target+=Vector((+.095*drag,+.190*drag,-.015*drag))
    if drag>1e-8:
        original_ground=min(p["feet"]["L"]["ankle"].z for p in poses)
        injured_target.z=max(injured_target.z,original_ground+.025*drag)
        hip=rig.pose.bones["thigh.L"].head.copy()
        reach=lengths["thigh.L"]+lengths["shin.L"]-.003
        heading=injured_target-hip
        if heading.length>reach:
            injured_target=hip+unit(heading)*reach
    trailing_distance=(injured_target-old_ankle).length
    for side in ("L","R"):
        target=injured_target if side=="L" else poses[src]["feet"][side]["ankle"]
        hip,knee,ankle,toe_dir=solve_leg(side,poses[src]["feet"][side],pain_impact,drag,target)
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
    frame["limpV6"]={
        "leftInjuredStance":injured,
        "rightHealthyStance":healthy,
        "painImpact":pain_impact,
        "leftSwingDrag":drag,
        "leftFootTrailDelta":xyz(injured_target-old_ankle),
        "leftFootTrailDistance":trailing_distance,
        "extraPelvisOffset":xyz(offset),
        "extraThoraxCounterRollDegrees":math.degrees(twist),
        "extraThoraxPitchDegrees":math.degrees(pitch),
        "crookedKneePoleShift":.095*pain_impact,
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
assert max(x["limpV6"]["leftInjuredStance"] for x in evidence)>.99
assert max(abs(x["limpV6"]["extraPelvisOffset"][2]) for x in evidence)>.050
assert max(x["limpV6"]["crookedKneePoleShift"] for x in evidence)>.09
assert max(x["limpV6"]["extraThoraxPitchDegrees"] for x in evidence)>5.5
assert max(x["limpV6"]["leftFootTrailDistance"] for x in evidence)>.11

scene.frame_start=1;scene.frame_end=16;scene.render.fps=25;scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(evidence,indent=2)+"\n")
provenance=json.loads((SOURCE/"retarget-provenance.json").read_text())
provenance.update({
 "status":"UNAPPROVED V6 source-timed painful contact plus visibly posterior-trailing broken left leg",
 "variant":"broken-leg-left-trailing-v6",
 "sourceEditableRig":str(ORIGINAL.relative_to(ROOT)),
 "parentEditableBlendSha256":hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),
 "legDamage":{
   "physicalStance":"V4 0.060m deep buckle followed by additional 0.052m instantaneous-looking stance dip and 0.060m lateral impact, torso counterroll and pitch",
   "anatomy":"source V4 two-bone knee IK, sharp second crooked injured-knee bend pole, previous measured fixed ankles",
   "drag":"posterior (+Y) free-foot trail, lateral splay and floor-clamped ankle; fixed original stance contacts",
   "healthyLeg":"original right ankle contact unchanged"
 },
 "artApproval":False,"runtimeCutover":False,"attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("New independent V6 no-cape posterior-trailed broken leg 16 source-driven frames:",DEST,flush=True)
