"""Biomechanically coupled follow-up to captured CMU subject 09 RUN.

Independent editable review candidate; never overwrites the original rig, the
first CMU retarget, production walk atlas, or pose-derived lighting material.
Torso/shoulder landmarks come from captured motion rather than limb oscillators.

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
DEST = ASSETS / "rigged-mocap-biomechanics-candidate"

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

# Blender 4.5 embedded Python does not consistently ship io_anim_bvh;
# parse this small canonical CMU BVH ourselves rather than depending on an
# uninstalled addon. Read ALL original 120-Hz source samples unchanged.
def load_bvh(source_file):
    import re
    from mathutils import Quaternion
    lines=[line.strip() for line in source_file.read_text().splitlines()]
    motion=lines.index("MOTION")
    channels=0
    nodes=[]
    stack=[]
    pending=None
    for line in lines[1:motion]:
        parts=line.split()
        if not parts:
            continue
        if parts[0] in ("ROOT","JOINT"):
            name=parts[1]
            parent=stack[-1] if stack else None
            pending={"name":name,"parent":parent,
                     "offset":Vector((0,0,0)),"channels":[],"start":channels}
            nodes.append(pending)
        elif line=="End Site":
            pending={"name":"#end"}
        elif line=="{":
            stack.append(None if pending and pending["name"]=="#end" else len(nodes)-1)
            pending=None
        elif line=="}":
            stack.pop()
        elif parts[0]=="OFFSET" and stack and stack[-1] is not None:
            nodes[stack[-1]]["offset"]=Vector(map(float,parts[1:4]))
        elif parts[0]=="CHANNELS" and stack and stack[-1] is not None:
            current=nodes[stack[-1]]
            current["channels"]=parts[2:]
            current["start"]=channels
            assert len(current["channels"])==int(parts[1])
            channels+=len(current["channels"])
    assert not stack
    assert nodes[0]["name"]=="Hips"
    assert len(nodes)>20 and channels>80,(len(nodes),channels)
    framecount=int(lines[motion+1].split(":")[1])
    dt=float(lines[motion+2].split(":")[1])
    assert framecount>=120 and abs(dt-1/120)<1e-4,(framecount,dt)
    source_rows=[list(map(float,line.split())) for line in lines[motion+3:] if line]
    assert len(source_rows)==framecount,(len(source_rows),framecount)
    axes={"Xrotation":Vector((1,0,0)),"Yrotation":Vector((0,1,0)),
          "Zrotation":Vector((0,0,1))}
    samples=[]
    identity=Quaternion((1,0,0,0))
    for row in source_rows:
        assert len(row)==channels,(len(row),channels)
        positions=[]
        world_rots=[]
        result={}
        for node in nodes:
            rot=identity.copy()
            translation=node["offset"].copy()
            for i,channel in enumerate(node["channels"]):
                number=row[node["start"]+i]
                if channel.endswith("rotation"):
                    rot=rot@Quaternion(axes[channel],math.radians(number))
                elif channel.endswith("position"):
                    axis=Vector((int(channel[0]=="X"),int(channel[0]=="Y"),int(channel[0]=="Z")))
                    translation+=axis*number
                else:
                    raise ValueError("Unsupported BVH channel "+channel)
            parent=node["parent"]
            if parent is None:
                pos=translation
                quat=rot
            else:
                pos=positions[parent]+world_rots[parent]@translation
                quat=world_rots[parent]@rot
            positions.append(pos)
            world_rots.append(quat)
            result[node["name"]]=pos
        samples.append(result)
    return samples, dt

# BVH original data is Y-up, whereas Blender target source rig is Z-up.
all_frames, source_timestep=load_bvh(BVH)
missing=set(JOINTS)-set(all_frames[0])
if missing:
    raise RuntimeError("Missing original measured mocap joints: "+str(sorted(missing)))
raw=all_frames[1:]  # first frame is T-pose calibration, not a running key
n=len(raw)
print("Loaded",n,"real CMU captured running poses at",1/source_timestep,"Hz",flush=True)
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
up = Vector((0,1,0))
travel = end_hips - start_hips
travel.y = 0
travel = normalized(travel)
cross_hips = raw[first]["LeftUpLeg"] - raw[first]["RightUpLeg"]
cross_hips.y = 0
right = normalized(cross_hips - travel * cross_hips.dot(travel))
forward = normalized(travel - right * travel.dot(right))
# Preserve original anatomy: flipping the right-axis when the subject runs
# opposite the BVH convention would swap LeftArm and RightArm on the model.
# Anatomical left must ALWAYS map to Hollowed +X irrespective of travel.
assert right.dot(cross_hips)>0 and forward.dot(travel)>0
assert abs(right.dot(forward))<1e-4
def direction(vector):
    # Original source is forward relative to real travel, Blender model forward -Y.
    return Vector((vector.dot(right),-vector.dot(forward),vector.dot(up)))
def source_at_fraction(t):
    """Sample only measured positions. Wrap the cycle without mixing root travel."""
    index = first + (t % 1.0) * period
    low = int(math.floor(index))
    high = min(n - 1, low + 1)
    weight = index - low
    return {name: raw[low][name].lerp(raw[high][name], weight) for name in JOINTS}

def lerp_source(t):
    """Denoise 120-Hz marker displacement, NOT independently animate the wrists.

    CMU warns that original hand/toe measurements are noisy. Every joint is
    filtered against the same captured hips at each tap: smoothing global
    BVH root travel at the loop seam would otherwise create a fake body jerk.
    """
    offsets = ((-2, 1), (-1, 4), (0, 6), (1, 4), (2, 1))
    snapshots = [(source_at_fraction(t + offset / period), weight)
                 for offset, weight in offsets]
    hip = source_at_fraction(t)["Hips"]
    result = {"Hips": hip}
    for name in JOINTS:
        if name == "Hips":
            continue
        displacement = sum(
            ((frame[name] - frame["Hips"]) * weight for frame, weight in snapshots),
            Vector((0, 0, 0))) / 16
        result[name] = hip + displacement
    return result
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
    root_z=(sample["Hips"].dot(up)-raw[first]["Hips"].dot(up))*scale
    root_offset=Vector((0,-.015,max(-.035,min(.035,root_z))-.025))
    origin=heads["pelvis"]
    # Reference torso has its own lean/roll/turn. Apply it to the ORIGINAL
    # rest pose, then overlay a restrained infected forward commitment.
    spine_vec=scaled_joint_vector(sample,"Hips","Spine1")
    src_forward_lean=math.atan2(-spine_vec.y,max(.1,spine_vec.z))
    lean=max(math.radians(10),min(math.radians(28),src_forward_lean+math.radians(12)))
    # Real shoulder-line twist and tilt, not locked shoulders with arms flapping.
    # Source left/right landmarks rotate around the captured spine while running.
    shoulder_line=direction(sample["LeftArm"]-sample["RightArm"])
    hip_line=direction(sample["LeftUpLeg"]-sample["RightUpLeg"])
    clamp=lambda x,limit:max(-limit,min(limit,x))
    shoulder_yaw=clamp(math.degrees(math.atan2(-shoulder_line.y,shoulder_line.x)),15)
    pelvis_yaw=clamp(math.degrees(math.atan2(-hip_line.y,hip_line.x)),12)
    shoulder_roll=clamp(math.degrees(math.atan2(shoulder_line.z,shoulder_line.x)),8)
    torso=(Quaternion((0,0,1),math.radians(shoulder_yaw)) @
           Quaternion((0,1,0),math.radians(-shoulder_roll)) @
           Quaternion((1,0,0),lean))
    pelvic_turn=Quaternion((0,0,1),math.radians(pelvis_yaw))
    point=lambda p:origin+torso@(p-origin)+root_offset
    pelvis_point=lambda p:origin+pelvic_turn@(p-origin)+root_offset
    orient_bone("root",heads["root"],tails["root"])
    orient_bone("pelvis",pelvis_point(heads["pelvis"]),pelvis_point(tails["pelvis"]))
    for name in ("spine","chest","neck"):
        orient_bone(name,point(heads[name]),point(tails[name]))
    head_pos=point(heads["head"])
    orient_bone("head",head_pos,head_pos+torso@(tails["head"]-heads["head"]))
    frameside={"frame":index,"sourceFraction":t,"feet":{},"arms":{},
               "pelvisVertical":root_offset.z,"forwardLeanDegrees":math.degrees(lean),
               "shoulderYawDegrees":shoulder_yaw,"shoulderRollDegrees":shoulder_roll,
               "pelvisYawDegrees":pelvis_yaw}
    for side, label in (("L","Left"),("R","Right")):
        hip=pelvis_point(heads["thigh."+side])
        knee=hip+scaled_joint_vector(sample,f"{label}UpLeg",f"{label}Leg")*lengths["thigh."+side]
        ankle=knee+scaled_joint_vector(sample,f"{label}Leg",f"{label}Foot")*lengths["shin."+side]
        toe=ankle+scaled_joint_vector(sample,f"{label}Foot",f"{label}ToeBase")*lengths["foot."+side]
        for name,start,end in (("thigh",hip,knee),("shin",knee,ankle),("foot",ankle,toe)):
            orient_bone(f"{name}.{side}",start,end)
        clavicle_base=point(heads["clavicle."+side])
        shoulder=point(heads["upper_arm."+side])
        source_shoulder=scaled_joint_vector(sample,"Spine1",f"{label}Arm")
        # Clavicle starts at the captured-twisting chest. Its endpoint follows
        # the SOURCE shoulder line while keeping the model's original length.
        # Blending in rest direction guards against CMU marker jitter and
        # extreme motion that would deform the approved torso/shoulder mesh.
        rest_shoulder=normalized(shoulder-clavicle_base)
        clavicle_length=lengths["clavicle."+side]
        shoulder=clavicle_base+normalized(rest_shoulder*.65+source_shoulder*.35)*clavicle_length
        orient_bone("clavicle."+side,clavicle_base,shoulder)
        elbow=shoulder+scaled_joint_vector(sample,f"{label}Arm",f"{label}ForeArm")*lengths["upper_arm."+side]
        wrist=elbow+scaled_joint_vector(sample,f"{label}ForeArm",f"{label}Hand")*lengths["forearm."+side]
        # Natural wrist: projected source wrist bend capped to 16deg; no flopping.
        fore=normalized(wrist-elbow)
        # Maintain wrist-to-forearm continuity; stable rest-hand alignment is
        # only a small bias, NEVER an independently oscillating wrist track.
        rest_hand=normalized(torso@(tails["hand."+side]-heads["hand."+side]))
        hand=wrist+normalized(fore*.88+rest_hand*.12)*lengths["hand."+side]
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
# Imported samples are pure data; original Blender rig stays editable.
src_sha=hashlib.sha256(BVH.read_bytes()).hexdigest()
(DEST/"retarget-provenance.json").write_text(json.dumps({
    "status":"UNAPPROVED biomechanics revision: no production atlas replacement",
    "source":"CMU Graphics Lab, Subject 09, Motion 01 RUN",
    "sourceUrl":"https://github.com/una-dinosauria/cmu-mocap/blob/master/data/009/09_01.bvh",
    "sourceSha256":src_sha,"license":"CMU dataset free for all uses; Bruce Hahne BVH conversion",
    "authoringRig":str(SOURCE.relative_to(ROOT)),
    "loop": {"firstActualMotionIndex":first,"periodSourceFrames":period,
             "fitError":score,"rawSamplingHz":120},
    "output":{"frames":FRAMES,"fps":FPS,"directions":"preview only, not 8-way exported"},
    "axis":{"right":list(right),"forward":list(forward),"travel":list(travel)},
    "biomechanics":"captured shoulder yaw/roll, pelvis counterturn and shoulder-girdle translation; 120Hz hips-relative marker denoising",
    "noRecoloring":True,"noNewShaders":True
},indent=2)+"\n")
(DEST/"gait-diagnostics.json").write_text(json.dumps(samples,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Retargeted ORIGINAL CMU 3D running clip onto ORIGINAL Hollowed skeleton:",DEST,flush=True)
