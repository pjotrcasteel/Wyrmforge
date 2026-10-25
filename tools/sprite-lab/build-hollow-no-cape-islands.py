"""Author a separate, editable NO-CAPE Hollowed mesh, not a fake alpha mask.

The existing Feral CMU rig and every approved production clip/normal remain
untouched. Delete actual long garment polygons, preserving original anatomy,
bone controls, skinning, textures, UVs, and all 17 run keys. This is a candidate
until all eight directional animations have been visually accepted.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
import bmesh

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
PARENT = MODEL / "rigged-mocap-feral-presentation-candidate"
DEST = MODEL / "rigged-mocap-no-cape-islands-candidate"
INPUT = PARENT / "hollow-rigged.blend"

if DEST.exists():
    raise FileExistsError(f"Refusing to overwrite an editable no-cape candidate: {DEST}")
assert INPUT.is_file()
bpy.ops.wm.open_mainfile(filepath=str(INPUT))
bpy.context.preferences.filepaths.save_version = 0
rig = bpy.data.objects["Hollow editable animation rig"]
character = bpy.data.objects["Hollow skinned character"]
mesh = character.data
assert any(mod.type == "ARMATURE" and mod.object == rig for mod in character.modifiers)

# The original rig assigned the two cloth groups to the long hanging rear
# panels and central below-waist fabric. Keep the upper torso/ragged shoulders
# and the real thigh/shin/foot geometry. No image masking or renderer changes.
name_to_index = {g.name: g.index for g in character.vertex_groups}
assert "cloth.L" in name_to_index and "cloth.R" in name_to_index
cloth_ids = {name_to_index["cloth.L"], name_to_index["cloth.R"]}
leg_ids = {name_to_index[f"{part}.{side}"] for side in ("L", "R")
           for part in ("thigh", "shin", "foot")}

def weight(vertex, groups):
    return sum(g.weight for g in vertex.groups if g.group in groups)

old_count = len(mesh.polygons)
old_vertices = len(mesh.vertices)
groups = {}
for vertex in mesh.vertices:
    groups[vertex.index] = {
        "cloth": weight(vertex, cloth_ids),
        "leg": weight(vertex, leg_ids),
        "z": float(vertex.co.z),
        "y": float(vertex.co.y),
    }

# Original Trellis textured mesh has ~1,244 separate UV-split connected
# islands. A per-face cloth threshold leaves tatters behind. Remove the
# *entire* hanging garment islands, not just triangles halfway down a panel.
parent = list(range(len(mesh.vertices)))
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
def union(a,b):
    a,b=find(a),find(b)
    if a != b:
        parent[b]=a
for face in mesh.polygons:
    vertices=list(face.vertices)
    for vertex in vertices[1:]:
        union(vertices[0],vertex)
islands={}
for vert in mesh.vertices:
    islands.setdefault(find(vert.index),[]).append(vert.index)

cape_islands=set()
for identifier, vertex_ids in islands.items():
    if len(vertex_ids) < 4:
        continue
    points=[groups[i] for i in vertex_ids]
    count=len(points)
    cloth_fraction=sum(p["cloth"]>=.50 for p in points)/count
    leg_fraction=sum(p["leg"]>=.50 for p in points)/count
    rear_fraction=sum(p["y"]>.06 for p in points)/count
    bottom=min(p["z"] for p in points)
    top=max(p["z"] for p in points)
    # A cape island is long, behind the spine, and majority cloth weighted.
    # Exclude actual legs, torso, head and shoulder silhouettes.
    if (cloth_fraction>=.43 and leg_fraction<=.26 and
        rear_fraction>=.65 and bottom<-.22 and top<.15):
        cape_islands.add(identifier)

remove={face.index for face in mesh.polygons
        if find(face.vertices[0]) in cape_islands}
if len(cape_islands)<3:
    raise RuntimeError(f"Expected multiple disconnected cape cloth panels; got {len(cape_islands)}")
if len(remove)<250:
    raise RuntimeError(f"No significant cape islands found; triangles={len(remove)}")
if len(remove)>old_count*.35:
    raise RuntimeError(f"Refusing to delete >35% of creature faces: {len(remove)}/{old_count}")


bm = bmesh.new()
bm.from_mesh(mesh)
bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.faces[i] for i in sorted(remove)], context="FACES")
# Removing orphan vertices/edges does not touch the remaining UVs or deform weights.
bmesh.ops.delete(bm, geom=[edge for edge in bm.edges if not edge.link_faces], context="EDGES")
bmesh.ops.delete(bm, geom=[vert for vert in bm.verts if not vert.link_faces], context="VERTS")
bm.to_mesh(mesh)
bm.free()
mesh.update()

assert len(mesh.polygons) == old_count - len(remove)
assert mesh.uv_layers.active is not None
assert len(mesh.vertices) >= old_vertices * .55

# Ensure no source running pose or joint action is modified by mesh editing.
assert rig.animation_data and rig.animation_data.action
scene = bpy.context.scene
for frame in (1, 4, 8, 12, 16, 17):
    scene.frame_set(frame)
    evaluated = character.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    assert len(evaluated.vertices) == len(mesh.vertices)
    character.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()

DEST.mkdir(parents=True)
audit = {
    "approval": "UNAPPROVED candidate; no production atlas or material replacement",
    "originalSource": str(INPUT.relative_to(ROOT)),
    "originalSourceSha256": hashlib.sha256(INPUT.read_bytes()).hexdigest(),
    "sourceAsset": "Hollow skinned character",
    "criterion": "Whole disconnected rear hanging cloth islands, cloth-weight majority, minimal leg skinning, below waist",
    "capeIslandsDeleted":len(cape_islands),
    "meshConnectedIslands":len(islands),
    "facesOriginal": old_count,
    "facesDeleted": len(remove),
    "facesRetained": len(mesh.polygons),
    "verticesOriginal": old_vertices,
    "verticesRetained": len(mesh.vertices),
    "UVsRetained": True,
    "sourceAnimationsRetained": True,
    "capeRemovalMethod": "deleted original triangles and unused vertices in an editable Blender mesh",
}
(DEST / "no-cape-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
for meta in ("gait-diagnostics.json", "retarget-provenance.json"):
    data = json.loads((PARENT / meta).read_text())
    if meta == "retarget-provenance.json":
        data["status"] = "UNAPPROVED no-cape editable geometry candidate"
        data["capeRemoved"] = True
        data["sourceEditableRig"] = str(INPUT.relative_to(ROOT))
        data["noRecoloring"] = True
        data["artApproval"] = False
    (DEST / meta).write_text(json.dumps(data, indent=2) + "\n")

bpy.ops.wm.save_as_mainfile(filepath=str(DEST / "hollow-rigged.blend"))
print(f"No-cape islands Hollowed: removed {len(remove)}/{old_count} faces, "
      f"retained {len(mesh.vertices)}/{old_vertices} vertices", flush=True)
