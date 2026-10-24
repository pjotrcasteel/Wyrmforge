"""Preserve real CMU lower-body/shoulder motion; correct wrist + trailing cloth.

This is a SOURCE-RIG correction only. The two earlier editable Blender rigs,
all approved production atlases, original CMU BVH and G1 materials are untouched.
No per-wrist, hand, ankle or knee oscillator is introduced.
"""
import hashlib
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
INPUT=BASE/"rigged-mocap-biomechanics-candidate"
DEST=BASE/"rigged-mocap-feral-presentation-candidate"
FPS=25  # 16 frames / 25 fps = 0.64 s full stride (~188 steps/min)
FRAMES=16
if DEST.exists():
    raise FileExistsError(f"Never overwrite an editable existing candidate: {DEST}")
assert (INPUT/"hollow-rigged.blend").is_file()
bpy.ops.wm.open_mainfile(filepath=str(INPUT/"hollow-rigged.blend"))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
scene=bpy.context.scene
original=json.loads((INPUT/"gait-diagnostics.json").read_text())
assert len(original)==17
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}
def direction(v):
    assert v.length>1e-6,"Degenerate joint or cloth trajectory"
    return v.normalized()
def orient_bone(name,head,tail):
    delta=tail-head
    neutral=tails[name]-heads[name]
    matrix=(neutral.rotation_difference(delta).to_matrix()@
            rest[name].to_3x3()).to_4x4()
    matrix.translation=head
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()
def coords(v):
    return [float(v[0]),float(v[1]),float(v[2])]
updated=json.loads(json.dumps(original))
# The original cloth bones had almost no secondary motion even when shins
# travelled ~0.28m. Respond to RUNNING air drag (+Y behind character -Y
# travel) and the recorded preceding-frame thigh direction. The single
# sampled-frame lag is fabric inertia, not invented oscillation.
for frame in range(1,FRAMES+2):
    index=(frame-1)%FRAMES
    previous=(index-1)%FRAMES
    scene.frame_set(frame)
    for side in ("L","R"):
        forearm=rig.pose.bones["forearm."+side]
        fore=direction(forearm.tail-forearm.head)
        old_fore=direction(tails["forearm."+side]-heads["forearm."+side])
        old_hand=direction(tails["hand."+side]-heads["hand."+side])
        # Anatomical hand posture is transported by the FOREARM's own
        # captured rotation. No independent wrist or hand-bounce curve.
        hand_dir=direction(old_fore.rotation_difference(fore)@old_hand)
        wrist=forearm.tail.copy()
        end=wrist+hand_dir*lengths["hand."+side]
        orient_bone("hand."+side,wrist,end)
        # Blender poses are actual current-mesh coordinates. Record what
        # really gets keyed instead of reporting intended source positions.
        updated[frame-1]["arms"][side]["wrist"]=coords(wrist)
        updated[frame-1]["arms"][side]["hand"]=coords(end)
        old_cloth=rig.pose.bones["cloth."+side]
        hem_root=old_cloth.head.copy()
        original_dir=direction(tails["cloth."+side]-heads["cloth."+side])
        prev_leg=original[previous]["feet"][side]
        leg_y=direction(Vector(prev_leg["knee"])-Vector(prev_leg["hip"])).y
        # Constant sprint slipstream plus leg-pushed fabric, both bounded
        # and length-preserving. Keep approved mesh/weights/costume intact.
        rearward=0.115+0.065*max(0,leg_y)
        cloth_dir=direction(original_dir+Vector((0,rearward,0.018)))
        hem_end=hem_root+cloth_dir*lengths["cloth."+side]
        orient_bone("cloth."+side,hem_root,hem_end)
        updated[frame-1].setdefault("cloth",{})[side]={
            "root":coords(hem_root),"hem":coords(hem_end),
            "rearwardBias":rearward,"sourceFrame":previous}
        for name in ("hand."+side,"cloth."+side):
            for channel in ("location","rotation_quaternion","scale"):
                rig.pose.bones[name].keyframe_insert(channel,frame=frame,group=name)
    updated[frame-1]["fps"]=FPS

# Require positional loop closure, not only numerical joint-angle bounds.
for side in ("L","R"):
    for region in ("arms","cloth"):
        for key in updated[0][region][side]:
            a=updated[0][region][side][key]
            b=updated[-1][region][side][key]
            if isinstance(a,list):
                assert max(abs(x-y) for x,y in zip(a,b))<1e-5,(side,region,key)
            elif isinstance(a,(int,float)):
                assert abs(a-b)<1e-5,(side,region,key)
            else:
                assert a==b,(side,region,key)
scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
scene.frame_set(1)
DEST.mkdir(parents=True)
(DEST/"gait-diagnostics.json").write_text(json.dumps(updated,indent=2)+"\n")
parent=json.loads((INPUT/"retarget-provenance.json").read_text())
parent.update({
    "status":"UNAPPROVED FERAL PRESENTATION: original production albedo/materials unchanged",
    "parentEditableBlendSha256":hashlib.sha256((INPUT/"hollow-rigged.blend").read_bytes()).hexdigest(),
    "sourceEditableRig":str((INPUT/"hollow-rigged.blend").relative_to(ROOT)),
    "presentationAdjustments":{
        "wrist":"rest anatomical hand-to-forearm orientation transported by measured forearm rotation",
        "cloth":"rearward slipstream and source-thigh-following cloth root, no mesh or weight replacement",
        "timing":"16 source poses at 25fps; accelerated measured CMU 88/120-second stride",
        "sourcePositionSampling":"unchanged captured CMU gait"
    },
    "output":{"frames":FRAMES,"fps":FPS,"directions":"candidate only: eight angles render separately"},
    "artApproval":False
})
(DEST/"retarget-provenance.json").write_text(json.dumps(parent,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Preserved both prior rigs; exported separate captured-run wrist/cloth correction:",DEST)
