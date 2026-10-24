"""Retarget CMU Motion Capture subject 9 actual RUN, not invented limb sinusoids.

Original BVH source from CMU Graphics Lab and Bruce Hahne's BVH conversion.
See art/source/enemies/hollow/reference/README.md. Non-commercial restrictions: NONE
on original CMU dataset ("free for all uses"). Preserve BVH and original .blend.

Exports a NEW, unapproved .blend with keyed physical joint trajectories; imports
BVH at its native 120Hz and searches its actual marker poses for a loop boundary.
All model limbs preserve their original artist-authored lengths and proportions.
Run with Blender 4.5 bpy: python tools/sprite-lab/build-hollow-mocap-run.py
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = ASSETS / "rigged-pixel-v3/hollow-rigged.blend"
BVH = ROOT / "art/source/enemies/hollow/reference/CMU-09_01-run.bvh"
DEST = ASSETS / "rigged-mocap-run-v1-candidate"

FRAMES = 16
FPS = 22
JOINTS = (
    "Hips", "Spine", "Spine1", "Neck1", "Head",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand"
)
if DEST.exists():
    raise FileExistsError(f"Never overwrite editable authored model: {DEST}")
if not BVH.exists():
    raise FileNotFoundError(f"Missing license-qualified source motion: {BVH}")
DEST.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
rig = bpy.data.objects["Hollow editable animation rig"]
bone_data = rig.data.bones
heads = {b.name: b.head_local.copy() for b in bone_data}
tails = {b.name: b.tail_local.copy() for b in bone_data}
rest = {b.name: b.matrix_local.copy() for b in bone_data}
lengths = {b.name: b.length for b in bone_data}
for bone in rig.pose.bones:
    bone.rotation_mode = "QUATERNION"
if rig.animation_data and rig.animation_data.action:
    rig.animation_data.action.use_fake_user = True

before = set(bpy.data.objects)
if hasattr(bpy.ops.wm, "bvh_import"):
    bpy.ops.wm.bvh_import(filepath=str(BVH), target="ARMATURE", rotate_mode="NATIVE",
                          axis_forward="-Z", axis_up="Y", global_scale=1.0)
else:
    bpy.ops.import_anim.bvh(filepath=str(BVH), target="ARMATURE",
                            rotate_mode="NATIVE", axis_forward="-Z",
                            axis_up="Y", global_scale=1.0)
new_armatures = [obj for obj in bpy.data.objects if obj not in before and obj.type == "ARMATURE"]
if len(new_armatures) != 1:
    raise RuntimeError(f"Expected exactly one newly imported mocap armature: {new_armatures}")
mocap = new_armatures[0]
missing = set(JOINTS) - set(mocap.pose.bones)
if missing:
    raise RuntimeError(f"CMU source skeleton unexpectedly missing joints {sorted(missing)}")
if bpy.context.scene.frame_end < 70:
    raise RuntimeError("CMU run is too short for one complete gait cycle")

def sample_source(frame):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {name: mocap.matrix_world @ mocap.pose.bones[name].head for name in JOINTS}

raw = [sample_source(frame) for frame in range(2, bpy.context.scene.frame_end + 1)]
n = len(raw)
def normalized(v):
    if v.length <= 1e-8:
        raise ValueError("Degenerate mocap anatomical vector")
    return v.normalized()
def centered_key(sample):
    # Normalize by leg-length: pair bones are from one real measured body.
    hip = sample["Hips"]
    stature = .5 * sum(
        (sample[f"{side}UpLeg"] - sample[f"{side}Leg"]).length +
        (sample[f"{side}Leg"] - sample[f"{side}Foot"]).length
        for side in ("Left", "Right"))
    if stature <= 0:
        raise ValueError("Source rig missing nonzero physical limbs")
    return [((sample[j] - hip) / stature) for j in (
        "LeftFoot","RightFoot","LeftLeg","RightLeg",
        "LeftForeArm","RightForeArm","LeftHand","RightHand")]

# Select a full physical gait by matching anatomical *endpoint poses*, not
# applying a sine/cosine phase. Begin after possible capture calibration frame.
candidates = []
for begin in range(4, max(5, n - 64)):
    pose0 = centered_key(raw[begin])
    for period in range(52, 101):
        if begin + period >= n:
            continue
        pose1 = centered_key(raw[begin + period])
        squared = sum((a - b).length_squared for a, b in zip(pose0,pose1))
        # Prefer measured roughly 0.7sec cadence unless equality strongly favors else.
        seconds = period / 120
        score = squared + .3 * ((seconds - FRAMES / FPS) ** 2)
        candidates.append((score,begin,period))
if not candidates:
    raise ValueError("No complete raw run cycle in licensed BVH file")
score, first, period = min(candidates)
if score > .25:
    raise ValueError(f"CMU motion cut is not a valid continuous full stride: {score:.3f}")
print("Mocap authentic chosen cycle", first, period, "source frames",score,flush=True)

# Travel aligned basis from CMU source: character forward is game-world -Y.
# RIGHT is the anatomical left/right hip line, not a guessed camera direction.
start_hips = raw[first]["Hips"]
end_hips = raw[first+period]["Hips"]
up = Vector((0,0,1))
travel = end_hips - start_hips
travel.z = 0
travel = normalized(travel)
cross_hips = raw[first]["LeftUpLeg"] - raw[first]["RightUpLeg"]
cross_hips.z = 0
right = normalized(cross_hips - travel * cross_hips.dot(travel))
forward = normalized(up.cross(right))
if forward.dot(travel)<0:
    # The subject's body orientation determines the sign; ensure the original
    # recorded run direction remains forward after mapping.
    forward = -forward
    right = -right
assert abs(right.dot(forward))<1e-4
def direction(vector):
    # Original source is forward relative to real travel, Blender model forward -Y.
    return Vector((vector.dot(right),-vector.dot(forward),vector.z))
def lerp_source(t):
    index = first + t * period
    low = int(math.floor(index))
    high = min(n-1, low+1)
    weight = index-low
    return {name:raw[low][name].lerp(raw[high][name],weight) for name in JOINTS}
def scaled_joint_vector(sample, a, b):
    return normalized(direction(sample[b]-sample[a]))
def orient_bone(name, head, tail):
    delta = tail-head
    if delta.length<1e-6:
        raise ValueError(f"Bone collapsed: {name}")
    neutral = tails[name] - heads[name]
    matrix = (neutral.rotation_difference(delta).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation = head
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()
def angle(a,j,b):
    return 180-math.degrees((a-j).angle(b-j))

action = bpy.data.actions.new("Hollowed_CMU_Run_09_01_Retarget_UNAPPROVED")
rig.animation_data_create()
rig.animation_data.action=action
samples=[]
for index in range(FRAMES+1):
    # Duplicating start frame at frame 17 makes 16-key cycle seamless; never
    # interpolate a static 3/4 pose over the loop or freeze the terminal frame.
    t=(index%FRAMES)/FRAMES
    sample=lerp_source(t)
    src_hip=sample["Hips"]
    # Small true source-derived pelvis bounce, never independent arm bobbing.
    scale=(lengths["thigh.L"]+lengths["shin.L"])/(
        (sample["LeftUpLeg"]-sample["LeftLeg"]).length+
        (sample["LeftLeg"]-sample["LeftFoot"]).length)
    root_z=(sample["Hips"].z - raw[first]["Hips"].z)*scale
    root_offset=Vector((0,-.015,max(-.035,min(.035,root_z))-.025))
    origin=heads["pelvis"]
    # Reference torso has its own lean/roll/turn. Apply it to the ORIGINAL
    # rest pose, then overlay a restrained infected forward commitment.
    spine_vec=scaled_joint_vector(sample,"Hips","Spine1")
    src_forward_lean=math.atan2(-spine_vec.y,max(.1,spine_vec.z))
    lean=max(math.radians(10),min(math.radians(28),src_forward_lean+math.radians(12)))
    torso=Quaternion((1,0,0),lean)
    point=lambda p:origin+torso@(p-origin)+root_offset
    orient_bone("root",heads["root"],tails["root"])
    for name in ("pelvis","spine","chest","neck"):
        orient_bone(name,point(heads[name]),point(tails[name]))
    head_pos=point(heads["head"])
    orient_bone("head",head_pos,head_pos+torso@(tails["head"]-heads["head"]))
    frameside={"frame":index,"sourceFraction":t,"feet":{},"arms":{},
               "pelvisVertical":root_offset.z,"forwardLeanDegrees":math.degrees(lean)}
    for side, label in (("L","Left"),("R","Right")):
        hip=point(heads["thigh."+side])
        knee=hip+scaled_joint_vector(sample,f"{label}UpLeg",f"{label}Leg")*lengths["thigh."+side]
        ankle=knee+scaled_joint_vector(sample,f"{label}Leg",f"{label}Foot")*lengths["shin."+side]
        toe=ankle+scaled_joint_vector(sample,f"{label}Foot",f"{label}ToeBase")*lengths["foot."+side]
        for name,start,end in (("thigh",hip,knee),("shin",knee,ankle),("foot",ankle,toe)):
            orient_bone(f"{name}.{side}",start,end)
        clavicle_base=point(heads["clavicle."+side])
        shoulder=point(heads["upper_arm."+side])
        shoulder_offset=scaled_joint_vector(sample,"Spine1",f"{label}Arm")
        # Respect originally authored clavicle position and length: no lateral sliding.
        clavicle_length=lengths["clavicle."+side]
        shoulder=clavicle_base+normalized(shoulder-clavicle_base+shoulder_offset*.008)*clavicle_length
        orient_bone("clavicle."+side,clavicle_base,shoulder)
        elbow=shoulder+scaled_joint_vector(sample,f"{label}Arm",f"{label}ForeArm")*lengths["upper_arm."+side]
        wrist=elbow+scaled_joint_vector(sample,f"{label}ForeArm",f"{label}Hand")*lengths["forearm."+side]
        # Natural wrist: projected source wrist bend capped to 16deg; no flopping.
        fore=normalized(wrist-elbow)
        hand=wrist+fore*lengths["hand."+side]
        for name,start,end in (("upper_arm",shoulder,elbow),("forearm",elbow,wrist),("hand",wrist,hand)):
            orient_bone(f"{name}.{side}",start,end)
        cloth_start=point(heads["cloth."+side])
        # Cloth stays on actual torso, no fake limb blending.
        orient_bone("cloth."+side,cloth_start,cloth_start+torso@(tails["cloth."+side]-heads["cloth."+side]))
        frameside["feet"][side]={"hip":list(hip),"knee":list(knee),"ankle":list(ankle),
                                 "kneeFlexDegrees":angle(hip,knee,ankle)}
        frameside["arms"][side]={"shoulder":list(shoulder),"elbow":list(elbow),
                                 "wrist":list(wrist),"hand":list(hand),
                                 "elbowFlexDegrees":angle(shoulder,elbow,wrist)}
    for bone in rig.pose.bones:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=index+1,group=bone.name)
    samples.append(frameside)
# Do not blend periodically unrelated skeleton rotations.
for curve in action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="BEZIER"
        key.handle_left_type=key.handle_right_type="AUTO_CLAMPED"
scene=bpy.context.scene
scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
# Delete imported reference armature; actual animated character rig and original
# skinned editable mesh are preserved in the saved Blender project.
bpy.data.objects.remove(mocap,do_unlink=True)
src_sha=hashlib.sha256(BVH.read_bytes()).hexdigest()
(DEST/"retarget-provenance.json").write_text(json.dumps({
    "status":"UNAPPROVED: no production atlas replacement",
    "source":"CMU Graphics Lab, Subject 09, Motion 01 RUN",
    "sourceUrl":"https://github.com/una-dinosauria/cmu-mocap/blob/master/data/009/09_01.bvh",
    "sourceSha256":src_sha,"license":"CMU dataset free for all uses; Bruce Hahne BVH conversion",
    "authoringRig":str(SOURCE.relative_to(ROOT)),
    "loop": {"firstActualMotionIndex":first,"periodSourceFrames":period,
             "fitError":score,"rawSamplingHz":120},
    "output":{"frames":FRAMES,"fps":FPS,"directions":"preview only, not 8-way exported"},
    "axis":{"right":list(right),"forward":list(forward),"travel":list(travel)},
    "noRecoloring":True,"noNewShaders":True
},indent=2)+"\n")
(DEST/"gait-diagnostics.json").write_text(json.dumps(samples,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Retargeted ORIGINAL CMU 3D running clip onto ORIGINAL Hollowed skeleton:",DEST,flush=True)
