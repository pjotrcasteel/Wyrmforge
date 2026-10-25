"""Inspect original Hollowed skin-weighted cape geometry, with no mesh edits."""
import json
from collections import Counter, defaultdict
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-mocap-feral-presentation-candidate"
OUT=ROOT/"artifacts/hollow-cape-geometry.json"
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(DIR/"hollow-rigged.blend"))
character=bpy.data.objects["Hollow skinned character"]
mesh=character.data
group={g.name:g.index for g in character.vertex_groups}
cloth={group[x] for x in ("cloth.L","cloth.R")}
legs={group[f"{x}.{s}"] for s in ("L","R") for x in ("thigh","shin","foot")}
hips={group[x] for x in ("pelvis","spine","chest")}
def wt(v,ids):
    return sum(g.weight for g in v.groups if g.group in ids)
def band(v):
    z=v.co.z
    return "below-.30" if z<-.30 else "-.30..-.10" if z<-.1 else "-.10..+.05" if z<.05 else "+.05..+.20" if z<.20 else "+.20..+.35" if z<.35 else "above+.35"
records=defaultdict(list)
vdata=[]
for v in mesh.vertices:
    d=dict(id=v.index,x=float(v.co.x),y=float(v.co.y),z=float(v.co.z),
           cloth=wt(v,cloth),leg=wt(v,legs),body=wt(v,hips))
    vdata.append(d)
    records[band(v)].append(d)
def summary(points):
    if not points:return {}
    n=len(points)
    return {"vertices":n,"coordMinMax":[[round(min(p[k] for p in points),3),round(max(p[k] for p in points),3)] for k in ("x","y","z")],
      "rearwardCounts":{str(th):sum(p["y"]>th for p in points) for th in (0,.04,.08,.12,.16,.20)},
      "cloth>0.5":sum(p["cloth"]>.5 for p in points),
      "body>0.5":sum(p["body"]>.5 for p in points),
      "leg>0.5":sum(p["leg"]>.5 for p in points),
      "rearClothish":sum(p["y"]>.08 and p["cloth"]>.3 for p in points),
      "rearNonleg":sum(p["y"]>.08 and p["leg"]<.3 for p in points)}
# Islands in the original disconnected textured mesh, ignoring UV duplicates
parent=list(range(len(mesh.vertices)))
def find(i):
    while parent[i]!=i:
        parent[i]=parent[parent[i]];i=parent[i]
    return i
def union(a,b):
    ra,rb=find(a),find(b)
    if ra!=rb:parent[rb]=ra
for face in mesh.polygons:
    verts=list(face.vertices)
    for v in verts[1:]:union(verts[0],v)
components=defaultdict(list)
for i, d in enumerate(vdata):components[find(i)].append(d)
islands=sorted(components.values(),key=len,reverse=True)
out={"status":"informational, no mesh mutation",
     "meshVertices":len(mesh.vertices),"meshFaces":len(mesh.polygons),
     "bands":{key:summary(data) for key,data in records.items()},
     "connectedIslands":len(islands),
     "largestIslands":[summary(points) for points in islands[:15]]}
OUT.write_text(json.dumps(out,indent=2)+"\n")
print("CAPEAUDIT",json.dumps(out))
