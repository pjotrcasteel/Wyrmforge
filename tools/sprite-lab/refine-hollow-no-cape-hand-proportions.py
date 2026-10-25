"""Independent anatomical HAND PROPORTION audit/correction for cape-free Hollowed.

Current authored rig has 0.110m hands against 0.167m forearms: visually
oversized appendages can look like bent hooks at 96px. Correct the actual
SKINNED GEOMETRY (not alpha/CSS/image warping) along hand bone axes.
Source CMU action, hierarchy, UVs, normals, shoulder/wrist keys, and every
prior editable .blend remain intact until visual acceptance.
"""
import hashlib
import json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-mocap-no-cape-islands-candidate"
DEST=MODEL/"rigged-mocap-no-cape-short-claws-candidate"
FRACTION=.23
source_blend=SOURCE/"hollow-rigged.blend"
if DEST.exists():
    raise FileExistsError(f"Refusing to overwrite original candidate: {DEST}")
bpy.ops.wm.open_mainfile(filepath=str(source_blend))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects["Hollow editable animation rig"]
character=bpy.data.objects["Hollow skinned character"]
assert any(mod.type=="ARMATURE" and mod.object==rig for mod in character.modifiers)
assert len(character.data.polygons)<70000

# Pre-capture the 17 exact world-space source action bone rotations; mesh-only
# rest edit should NOT key or alter a single animation channel.
original_action=rig.animation_data.action
original_action.use_fake_user=True
source_action_name=original_action.name
orig_vertices=len(character.data.vertices)
orig_faces=len(character.data.polygons)
UV=[layer.name for layer in character.data.uv_layers]
group_ids={side:character.vertex_groups["hand."+side].index for side in ("L","R")}
bones={side:rig.data.bones["hand."+side] for side in ("L","R")}
head={side:bone.head_local.copy() for side,bone in bones.items()}
axis={side:(bone.tail_local-bone.head_local).normalized() for side,bone in bones.items()}
extent={side:bone.length for side,bone in bones.items()}
assert all(.105<extent[s]<.115 for s in extent)
assert all(.160<rig.data.bones["forearm."+s].length<.175 for s in extent)
affected={"L":0,"R":0}
maximum={}
for vertex in character.data.vertices:
    pt=vertex.co.copy()
    total_delta=Vector((0,0,0))
    for side in ("L","R"):
        weights=[x.weight for x in vertex.groups if x.group==group_ids[side]]
        if not weights: continue
        w=weights[0]
        # Keep wrist transition at rest; shorten primarily *distal* claws,
        # preserving skin weights and topology (no artificial detached gap).
        distance=min(extent[side]*1.8,max(0,(pt-head[side]).dot(axis[side])))
        movement=axis[side]*distance*FRACTION*w
        total_delta+=movement
        affected[side]+=1
        maximum[side]=max(maximum.get(side,0),movement.length)
    vertex.co=pt-total_delta
character.data.update()
assert len(character.data.vertices)==orig_vertices and len(character.data.polygons)==orig_faces
assert [layer.name for layer in character.data.uv_layers]==UV
assert affected["L"]>1000 and affected["R"]>1000
assert original_action is rig.animation_data.action
assert sum(maximum.values())>.02
DEST.mkdir(parents=True)
audit={
    "status":"UNAPPROVED real mesh/rig source geometry proportional correction",
    "preservedRig":str(source_blend.relative_to(ROOT)),
    "preservedRigSha256":hashlib.sha256(source_blend.read_bytes()).hexdigest(),
    "animationActionUnchanged":source_action_name,
    "faceCountPreserved":orig_faces,"vertexCountPreserved":orig_vertices,
    "uvLayersPreserved":UV,"preservesCapeDeletion":True,
    "originalHandBoneLength":extent,
    "originalForearmBoneLength":{s:rig.data.bones["forearm."+s].length for s in ("L","R")},
    "distalWeightedClawShorteningFraction":FRACTION,
    "affectedVertices":affected,
    "maxRestVertexDisplacement":maximum,
    "noProductionAtlasChange":True
}
(DEST/"hand-proportion-audit.json").write_text(json.dumps(audit,indent=2)+"\n")
for name in ("gait-diagnostics.json","retarget-provenance.json"):
    value=json.loads((SOURCE/name).read_text())
    if name=="retarget-provenance.json":
        value["status"]="UNAPPROVED short-claw geometry visual review; authored source/CMU pose unchanged"
        value["sourceEditableRig"]=str(source_blend.relative_to(ROOT))
        value["parentEditableBlendSha256"]=audit["preservedRigSha256"]
        value["handGeometryCorrection"]=audit["distalWeightedClawShorteningFraction"]
        value["artApproval"]=False
    (DEST/name).write_text(json.dumps(value,indent=2)+"\n")
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"hollow-rigged.blend"))
print("Shortened authored weighted hand geometry ONLY; new candidate:",DEST,flush=True)
