"""Hollowed broken-left-leg V7: captured-contact-directed unequal stride timing.

The existing cape-free V6 injury shape is preserved. Previous passes spent
time moving limbs while keeping the same 16-frame symmetric CMU speed
profile; at game size the result still appeared like an ordinary run.
This pass retimes the ENTIRE authored 3D actor rig in measured source pose
space, rather than inventing secondary ankle/wrist oscillations.

Broken left contact holds and compresses; healthy right propulsion passes
faster; trailing left recovery has an irregular short step. Shoulder / torso
motion automatically follows exactly the same sampled source time.

No renderer, gameplay physics, attack/death, Ashling or production overwrite.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-hollow-broken-leg-trailing-v6"
DEST = MODEL / "rigged-hollow-broken-leg-asymmetric-v7"
ORIGINAL = SOURCE / "hollow-rigged.blend"

# Artistic edits to measured source cadence (0..16 wraps):
# 0..2 = damaged foot load; 3..11 = healthy stance and free broken-foot drag;
# 12..16 = short, painful landing and recoil. Source remains real V6 poses.
# Intervals at 0/16 are deliberately close to avoid a loop-speed snap.
SOURCE_PHASES = (
    0.0, 0.45, 0.95, 1.70, 2.90, 4.45, 6.25, 8.20,
    10.00, 11.20, 12.00, 12.75, 13.35, 13.95, 14.65, 15.50,
)
assert len(SOURCE_PHASES) == 16
assert all(b > a for a,b in zip(SOURCE_PHASES, SOURCE_PHASES[1:]))
assert SOURCE_PHASES[0] == 0 and SOURCE_PHASES[-1] < 16
assert not DEST.exists(), f"Refusing to overwrite editable candidate: {DEST}"

source_diagnostics = json.loads((SOURCE / "gait-diagnostics.json").read_text())
assert len(source_diagnostics) == 17
bpy.ops.wm.open_mainfile(filepath=str(ORIGINAL))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["Hollow editable animation rig"]
mesh = bpy.data.objects["Hollow skinned character"]
assert len(mesh.data.polygons) == 68380

def bone_depth(b):
    depth = 0
    while b.parent:
        depth += 1
        b = b.parent
    return depth

def xyz(value):
    return [float(n) for n in value]

def sample_source(phase):
    whole = math.floor(phase)
    scene.frame_set(whole + 1, subframe=phase - whole)
    bpy.context.view_layer.update()
    return {
        "bones": {b.name:b.matrix.copy() for b in ordered},
        "feet": {side:{
            "hip":rig.pose.bones["thigh."+side].head.copy(),
            "knee":rig.pose.bones["thigh."+side].tail.copy(),
            "ankle":rig.pose.bones["shin."+side].tail.copy(),
            "toe":rig.pose.bones["foot."+side].tail.copy()
        } for side in ("L","R")},
        "arms": {side:{
            "shoulder":rig.pose.bones["upper_arm."+side].head.copy(),
            "elbow":rig.pose.bones["upper_arm."+side].tail.copy(),
            "wrist":rig.pose.bones["forearm."+side].tail.copy(),
            "hand":rig.pose.bones["hand."+side].tail.copy()
        } for side in ("L","R")}
    }

ordered = sorted(list(rig.pose.bones), key=bone_depth)
original_action = rig.animation_data.action
assert original_action is not None
original_action.use_fake_user = True
captured = [sample_source(t) for t in SOURCE_PHASES]
source_end = sample_source(16.0)

# Inspect authored loop before replacing action.
for side in ("L","R"):
    for region in ("feet","arms"):
        for key in captured[0][region][side]:
            assert (captured[0][region][side][key] - source_end[region][side][key]).length < 1e-4, (side,region,key)

new_action = bpy.data.actions.new("Hollow_CMU_BrokenLeftLeg_StaggerAndRecovery_v7_UNAPPROVED")
rig.animation_data.action = new_action
frames = []
for i in range(17):
    src_index = i % 16
    sample = captured[src_index]
    phase = SOURCE_PHASES[src_index]
    scene.frame_set(i+1)
    for bone in ordered:
        bone.matrix = sample["bones"][bone.name].copy()
        bpy.context.view_layer.update()
    source_a = math.floor(phase)
    source_b = min(source_a+1,16)
    fraction = phase-source_a
    # Diagnostics always correspond to actual evaluated source pose;
    # inheritance is only for material/provenance and injury annotation.
    parent_frame=source_diagnostics[source_a]
    record=json.loads(json.dumps(parent_frame))
    record["frame"]=i
    for side in ("L","R"):
        for region in ("feet","arms"):
            for joint,position in sample[region][side].items():
                record[region][side][joint] = xyz(position)

    def source_support(name):
        a=float(source_diagnostics[source_a]["weightTransfer"][name])
        b=float(source_diagnostics[source_b]["weightTransfer"][name])
        return (1-fraction)*a + fraction*b

    injured_support = source_support("damagedLeftSupport")
    healthy_support = source_support("healthyRightSupport")
    record["weightTransfer"]["damagedLeftSupport"] = injured_support
    record["weightTransfer"]["healthyRightSupport"] = healthy_support
    record["temporalAsymmetry"] = {
        "sourceFrame":phase,
        "leftPainfulContact":injured_support,
        "rightHealthyPropulsion":healthy_support,
        "sourceFrameAdvance":(SOURCE_PHASES[src_index+1]-phase if src_index<15 else 16-phase),
        "authoredSourceRetiming":True,
        "preservesFullCapturedJointChain":True,
        "authoritativeInWorldVelocity":False
    }
    for bone in ordered:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    frames.append(record)

# Linear key interpolation after sampling an artist-authored eased source
# guarantees we are reviewing precisely the recorded sample trajectory,
# rather than an unanticipated second spline overshoot in Blender.
for curve in new_action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation = "LINEAR"

for side in ("L","R"):
    for region in ("feet","arms"):
        for joint in frames[0][region][side]:
            if joint not in ("hip","knee","ankle","toe","shoulder","elbow","wrist","hand"):
                continue
            a=frames[0][region][side][joint]
            b=frames[16][region][side][joint]
            assert max(abs(x-y) for x,y in zip(a,b))<1e-4,(region,side,joint)

# Nonuniform source pace: healthy stride advances faster than the injured
# landing/recoil; no procedural random wobble or independent wrist/ankle keys.
increments = [f["temporalAsymmetry"]["sourceFrameAdvance"] for f in frames[:16]]
assert max(increments)>1.7
assert min(increments)<.50
assert all(frames[i]["arms"]["L"].get("stretchReach",True) for i in range(16))
assert all(frames[i]["arms"]["R"].get("stretchReach",True) for i in range(16))
assert max(f["weightTransfer"]["damagedLeftSupport"] for f in frames[:16])>.95
assert max(f["weightTransfer"]["healthyRightSupport"] for f in frames[:16])>.95

scene.frame_start = 1
scene.frame_end = 16
scene.render.fps = 25
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(frames,indent=2)+"\n")
provenance=json.loads((SOURCE/"retarget-provenance.json").read_text())
provenance.update({
    "status":"UNAPPROVED contact-conditioned full-pose broken-left-leg cadence and asymmetric recovery review",
    "variant":"broken-leg-left-asymmetric-v7",
    "sourceEditableRig":str(ORIGINAL.relative_to(ROOT)),
    "parentEditableBlendSha256":hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),
    "animationRetiming":{
        "measuredSource":"CMU-09_01 3D real captured full body, artist-corrected V6 no-cape injury",
        "phaseMapSourceSamples":list(SOURCE_PHASES),
        "authoring":"more time on left damaged contact; faster right healthy push and recovery",
        "fullBody":"all bones share one time origin; no invented sinusoidal wrist or ankle trajectories",
        "runtimeLocomotionSpeedChanged":False
    },
    "output":{"frames":16,"fps":25,"directions":8},
    "artApproval":False,"runtimeCutover":False,"attackDeathReexported":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Saved 16 authentic full-body injured-left-leg timing samples, candidate:",DEST,flush=True)
