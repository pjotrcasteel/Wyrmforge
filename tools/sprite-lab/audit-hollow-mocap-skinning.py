"""Diagnose the ACTUAL editable Hollowed mesh/weights across 16 CMU run poses.

Data-only audit: no mesh/bone editing and no false assertion of artistic approval.
Runs in Blender 4.5 against the independent biomechanics candidate.
"""
import json
from pathlib import Path
from collections import defaultdict
import bpy

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-mocap-biomechanics-candidate/hollow-rigged.blend"
OUTPUT=ROOT/"docs/art/evidence/hollowed-mocap-biomechanics-2026-10-24/skin-and-rig-audit.json"
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
rig=bpy.data.objects["Hollow editable animation rig"]
mesh_objects=[o for o in bpy.data.objects if o.type=="MESH" and
              any(m.type=="ARMATURE" and m.object==rig for m in o.modifiers)]
assert mesh_objects,"No original skinned Hollowed mesh available"
regions=("upper_arm.L","forearm.L","hand.L","upper_arm.R","forearm.R","hand.R",
         "thigh.L","shin.L","foot.L","thigh.R","shin.R","foot.R",
         "clavicle.L","clavicle.R","cloth.L","cloth.R")
def bounds(points):
    if not points:return None
    return [[round(min(p[k] for p in points),5),round(max(p[k] for p in points),5)]
            for k in range(3)]
def centroid(points):
    if not points:return None
    n=len(points)
    return [round(sum(p[k] for p in points)/n,5) for k in range(3)]
audit={"status":"MECHANICAL AUDIT ONLY: no visual approval",
       "source":str(SOURCE.relative_to(ROOT)),
       "armature":rig.name,
       "meshes":[],"bones":[],"frames":[]}
for b in rig.data.bones:
    audit["bones"].append({"name":b.name,"parent":b.parent.name if b.parent else None,
                           "length":round(b.length,5),
                           "head":[round(x,5) for x in b.head_local],
                           "tail":[round(x,5) for x in b.tail_local]})
for ob in mesh_objects:
    names={g.index:g.name for g in ob.vertex_groups}
    group_weights=defaultdict(list)
    unmapped=0
    unweighted=0
    sums=[]
    for vert in ob.data.vertices:
        weights=[(names[g.group],g.weight) for g in vert.groups
                 if g.group in names and g.weight>0.0001]
        if not weights:unweighted+=1
        sums.append(sum(w for _,w in weights))
        for name,weight in weights:
            group_weights[name].append(weight)
            if name not in rig.data.bones:unmapped+=1
    audit["meshes"].append({
        "name":ob.name,"vertices":len(ob.data.vertices),"unweighted":unweighted,
        "weightsNotNormalized":sum(abs(s-1)>0.03 for s in sums if s>0),
        "missingRigBoneWeightAssignments":unmapped,
        "namedRegionVertexCounts":{region:len(group_weights[region]) for region in regions},
        "maximumWeights":{region:round(max(group_weights[region],default=0),3)
                          for region in regions}
    })
for f in range(1,17):
    scene.frame_set(f)
    dg=bpy.context.evaluated_depsgraph_get()
    pose={"frame":f,"bones":{},"regions":{}}
    for name in regions:
        if name not in rig.pose.bones:continue
        b=rig.pose.bones[name]
        w_head=rig.matrix_world @ b.head
        w_tail=rig.matrix_world @ b.tail
        pose["bones"][name]={"head":[round(x,5) for x in w_head],
                              "tail":[round(x,5) for x in w_tail]}
    for ob in mesh_objects:
        evaluated=ob.evaluated_get(dg)
        evaluated_mesh=evaluated.to_mesh()
        assert len(evaluated_mesh.vertices)==len(ob.data.vertices),(ob.name,"topology changed")
        coords={region:[] for region in regions}
        for vertex,source_vertex in zip(evaluated_mesh.vertices,ob.data.vertices):
            dominant=[(ob.vertex_groups[g.group].name,g.weight)
                      for g in source_vertex.groups if g.weight>=0.45 and
                      g.group<len(ob.vertex_groups)]
            for name,weight in dominant:
                if name in coords:
                    coords[name].append(tuple(evaluated.matrix_world @ vertex.co))
        for name,pts in coords.items():
            if not pts:continue
            key=ob.name+":"+name
            pose["regions"][key]={"count":len(pts),"centroid":centroid(pts),
                                   "bounds":bounds(pts)}
        evaluated.to_mesh_clear()
    audit["frames"].append(pose)
OUTPUT.write_text(json.dumps(audit,indent=2)+"\n")
print("Wrote source mesh weight, bone parenting and 16-frame deformation audit:",OUTPUT)
