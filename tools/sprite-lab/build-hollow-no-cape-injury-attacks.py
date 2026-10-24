"""Non-destructive no-cape Hollowed attack SOURCE preview from existing rig.

Transfers the actual 16-key canonical 3D Hollowed attack action onto the
cape-free, short-claw Blender rig. For an unusable arm, restricts that joint
chain to the torso; for a broken RIGHT arm, MIRRORS the captured authored
RIGHT claw strike to the functional LEFT arm. No invented attacks, disabled
arm dealing damage, new engine paths, gameplay or re-used wrong normals.

Unapproved 96px eight-way visual preview only. Never modify the original
attack rig or production attack atlas; original source is retained.
"""
import argparse
import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
parser=argparse.ArgumentParser()
parser.add_argument("--variant",choices=("standard","broken-arm-right","one-arm-left"),required=True)
args=parser.parse_args()
variant=args.variant
ORIGINAL=MODEL/"rigged-attack-v2/hollow-attack.blend"
NO_CAPE=MODEL/"rigged-mocap-no-cape-captured-hands-candidate/hollow-rigged.blend"
DEST=MODEL/("rigged-hollow-no-cape-attack-"+variant+"-preview")
if DEST.exists():raise FileExistsError(f"Never overwrite source attack variant {DEST}")
assert ORIGINAL.is_file() and NO_CAPE.is_file()
bpy.ops.wm.open_mainfile(filepath=str(ORIGINAL))
attacking=bpy.data.objects["Hollow editable animation rig"]
attack_scene=bpy.context.scene
original_bone_names={p.name for p in attacking.pose.bones}
def depth(b):
    i=0
    while b.parent:
        b=b.parent
        i+=1
    return i
original_order=sorted(list(attacking.pose.bones),key=depth)
attack_poses=[]
for frame in range(1,17):
    attack_scene.frame_set(frame)
    attack_poses.append({b.name:b.matrix.copy() for b in original_order})
bpy.ops.wm.open_mainfile(filepath=str(NO_CAPE))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
rig=bpy.data.objects["Hollow editable animation rig"]
character=bpy.data.objects["Hollow skinned character"]
assert len(character.data.polygons)==68380
ordered=sorted(list(rig.pose.bones),key=depth)
assert {b.name for b in ordered}==original_bone_names,"Attack joint hierarchy not compatible with no-cape actor"
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}
old_action=rig.animation_data.action
old_action.use_fake_user=True
new_action=bpy.data.actions.new("Hollowed_NoCape_AuthoredAttack_"+variant+"_UNAPPROVED")
rig.animation_data.action=new_action

def unit(v):
    if v.length<1e-8:raise ValueError("degenerate joint")
    return v.normalized()

def orient(name,head,tail):
    base=tails[name]-heads[name]
    matrix=(base.rotation_difference(tail-head).to_matrix() @ rest[name].to_3x3()).to_4x4()
    matrix.translation=head
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def xyz(v):return [float(x) for x in v]
def reflect(v):return Vector((-v.x,v.y,v.z))
profiles=[]
for i in range(16):
    scene.frame_set(i+1)
    for bone in ordered:
        bone.matrix=attack_poses[i][bone.name].copy()
        bpy.context.view_layer.update()
    left=rig.pose.bones["upper_arm.L"]
    right=rig.pose.bones["upper_arm.R"]
    left_shoulder=left.head.copy()
    right_shoulder=right.head.copy()
    strike_shoulder=right_shoulder.copy()
    right_elbow=rig.pose.bones["upper_arm.R"].tail.copy()
    right_wrist=rig.pose.bones["forearm.R"].tail.copy()
    right_hand=rig.pose.bones["hand.R"].tail.copy()
    # Existing real attack's right-side positions are copied (mirror x)
    # to the functional left side. Body/head and contact remain as authored.
    if variant=="broken-arm-right":
        new_elbow=left_shoulder+reflect(right_elbow-strike_shoulder)
        new_wrist=new_elbow+reflect(right_wrist-right_elbow)
        new_hand=new_wrist+reflect(right_hand-right_wrist)
        for name,a,b in (
            ("upper_arm.L",left_shoulder,new_elbow),
            ("forearm.L",new_elbow,new_wrist),
            ("hand.L",new_wrist,new_hand)
        ): orient(name,a,b)
    if variant!="standard":
        side="R" if variant=="broken-arm-right" else "L"
        sign=-1 if side=="R" else 1
        shoulder=rig.pose.bones["upper_arm."+side].head.copy()
        # Guarded painful right arm: elbow near ribs. Unusable left arm:
        # hangs below shoulder. The captured torso / shoulder drives the
        # arm root; no manually oscillating wrist or fake secondary attack.
        if side=="R":
            upper=unit(Vector((sign*.05,.02,-.18)))
            lower=unit(Vector((sign*.023,-.04,-.17)))
        else:
            upper=unit(Vector((sign*.052,.03,-.175)))
            lower=unit(Vector((sign*.020,.022,-.165)))
        elbow=shoulder+upper*lengths["upper_arm."+side]
        wrist=elbow+lower*lengths["forearm."+side]
        claw=wrist+unit(lower+Vector((0,-.04,-.08)))*lengths["hand."+side]
        for name,a,b in (
            ("upper_arm."+side,shoulder,elbow),
            ("forearm."+side,elbow,wrist),
            ("hand."+side,wrist,claw)
        ):orient(name,a,b)
    for bone in ordered:
        for channel in ("location","rotation_quaternion","scale"):
            bone.keyframe_insert(channel,frame=i+1,group=bone.name)
    profiles.append({
        "frame":i,
        "activeArm":"L" if variant=="broken-arm-right" else "R",
        "impairedArm":("R" if variant=="broken-arm-right" else "L") if variant!="standard" else None,
        "rootAdvance":xyz(rig.pose.bones["pelvis"].head),
        "strikeWrist":xyz(rig.pose.bones["forearm."+("L" if variant=="broken-arm-right" else "R")].tail)
    })
for curve in new_action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation="LINEAR"
scene.frame_start=1
scene.frame_end=16
scene.render.fps=12
scene.frame_set(1)
DEST.mkdir(parents=True)
provenance={
 "status":"UNAPPROVED exact 3D authored source attack on cape-free actor with injury-usable-arm constraints",
 "variant":variant,"frames":16,"fps":12,
 "contactFrames":[7,8],"loop":False,
 "sourceAttackBlend":str(ORIGINAL.relative_to(ROOT)),
 "sourceAttackSha256":hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),
 "sourceNoCapeBlend":str(NO_CAPE.relative_to(ROOT)),
 "sourceNoCapeSha256":hashlib.sha256(NO_CAPE.read_bytes()).hexdigest(),
 "visualContactOnly":True,"runtimeDamageChanged":False,
 "materialPassesReexported":False,"artApproval":False,
 "sourceOriginalAttackTransferred":True,
 "impairedArm":profiles[7]["impairedArm"],
 "activeArm":profiles[7]["activeArm"],
 "poses":profiles
}
(DEST/"attack-review-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Saved separate 16-key no-cape attack",variant,DEST,flush=True)
