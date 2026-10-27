"""Inspect the ACTUAL no-cape Blender body before authoring legless crawlers."""
from pathlib import Path
import bpy, json, collections, sys

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend"
OUT=ROOT/"artifacts/hollow-crawler-inspection"
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
rig=bpy.data.objects["Hollow editable animation rig"]
actor=bpy.data.objects["Hollow skinned character"]
bones={b.name:dict(head=list(b.head_local),tail=list(b.tail_local),length=b.length) for b in rig.data.bones}
groups={g.index:g.name for g in actor.vertex_groups}
counts=collections.Counter()
mass=collections.Counter()
stats={}
for v in actor.data.vertices:
    dominant=max(v.groups,key=lambda g:g.weight) if v.groups else None
    if dominant is not None:
        counts[groups[dominant.group]]+=1
        mass[groups[dominant.group]]+=round(dominant.weight,2)
for key in sorted(set(groups.values())):
    allverts=[v for v in actor.data.vertices if any(groups[g.group]==key and g.weight>.2 for g in v.groups)]
    if allverts:
        stats[key]={
          "count":len(allverts),
          "z":[round(min(v.co.z for v in allverts),3),round(max(v.co.z for v in allverts),3)],
          "y":[round(min(v.co.y for v in allverts),3),round(max(v.co.y for v in allverts),3)],
          "x":[round(min(v.co.x for v in allverts),3),round(max(v.co.x for v in allverts),3)],
        }
v=actor.data.vertices
result={
  "mesh":dict(name=actor.name,vertices=len(v),polygons=len(actor.data.polygons),
              dimensions=list(actor.dimensions),
              coordinateMin=[min(a.co[i] for a in v) for i in range(3)],
              coordinateMax=[max(a.co[i] for a in v) for i in range(3)]),
  "rig":dict(name=rig.name,location=list(rig.location),rotation=list(rig.rotation_euler),
             sourceAction=rig.animation_data.action.name if rig.animation_data else None),
  "bones":bones,"groups":stats,"dominantGroups":dict(counts),
  "objects":[dict(name=o.name,type=o.type) for o in scene.objects],
}
(OUT/"anatomy.json").write_text(json.dumps(result,indent=2)+"\n")
print("Source anatomy captured",len(v),len(actor.data.polygons),flush=True)
