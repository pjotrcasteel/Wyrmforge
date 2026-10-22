"""Original primary silhouette revision, retaining r01/r02 immutable sources.

The cervical/cranial processes are major silhouette landmarks from the card,
not detailed armor/scales or a substitute for the later accepted sculpt stage.
"""
import hashlib
import json
import math
from pathlib import Path
import shutil

import bpy
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=Path(bpy.data.filepath).resolve()
if source!=(base/'milestones/M1-r02/ashfang-primary.blend').resolve():
    raise SystemExit('Requires original r02 project, never the rejected legacy body')
out=base/'milestones/M1-r03'
if out.exists(): raise SystemExit('Revision exists; preserve and use a new revision')
out.mkdir(parents=True)
before=hashlib.sha256(source.read_bytes()).hexdigest()
collection=bpy.data.collections.new('04 Primary bony silhouette landmarks')
bpy.context.scene.collection.children.link(collection)
clay=bpy.data.materials['Neutral anatomy clay']

def process(name, stations):
    # Explicit curved diamond sections: broad anatomical root to swept bony tip.
    # Width/depth vary per landmark; no random placement or uniform spike field.
    verts=[]
    sides=8
    for i,(x,y,z,width,depth) in enumerate(stations):
        center=Vector((x,y,z))
        prev=Vector(stations[max(0,i-1)][:3])
        nxt=Vector(stations[min(len(stations)-1,i+1)][:3])
        tangent=(nxt-prev).normalized()
        side=Vector((1,0,0))
        up=tangent.cross(side).normalized()
        for j in range(sides):
            angle=j*math.tau/sides
            v=center+side*width*math.cos(angle)+up*depth*math.sin(angle)
            verts.append(tuple(v))
    faces=[]
    for i in range(len(stations)-1):
        for j in range(sides):
            n=(j+1)%sides
            faces.append((i*sides+j,i*sides+n,(i+1)*sides+n,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(stations)-1)*sides+j for j in range(sides))])
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    collection.objects.link(ob)
    mesh.materials.append(clay)
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    # Keep the primary bone planes legible rather than smoothing them into cones.
    bevel=ob.modifiers.new('Primary bone edge softness','BEVEL')
    bevel.width=.035
    bevel.segments=2
    ob['status']='primary bony landmark only; no tertiary armor/detail'
    ob['intentional_root_overlap']=True
    return ob

# Ordered neural/osteoderm landmarks follow the skull-to-shoulder silhouette.
for name,stations in [
    ('Occipital midline process',[(0,-4.05,3.60,.19,.30),(0,-3.89,4.02,.16,.23),(0,-3.48,4.42,.055,.12),(0,-3.13,4.57,.003,.005)]),
    ('Upper cervical process',[(0,-3.42,3.93,.22,.37),(0,-3.18,4.43,.16,.27),(0,-2.72,4.89,.07,.14),(0,-2.44,5.02,.003,.004)]),
    ('Cervical shoulder transition process',[(0,-2.40,4.05,.24,.42),(0,-2.10,4.48,.19,.31),(0,-1.75,4.91,.075,.14),(0,-1.45,5.13,.003,.004)]),
    ('Thoracic process',[(0,-1.09,4.05,.25,.43),(0,-.83,4.33,.18,.30),(0,-.40,4.62,.06,.14),(0,-.09,4.70,.003,.004)]),
    ('Lumbar process',[(0,.55,3.63,.21,.35),(0,.79,3.92,.16,.25),(0,1.12,4.10,.06,.12),(0,1.41,4.17,.003,.004)]),
    ('Pelvic crest transition',[(0,2.20,3.12,.19,.32),(0,2.39,3.39,.15,.21),(0,2.72,3.57,.06,.11),(0,2.95,3.58,.003,.004)])]:
    process(name,stations)

for sign,label in [(-1,'L'),(1,'R')]:
    def mirror(stations): return [(sign*x,y,z,w,d) for x,y,z,w,d in stations]
    process(label+' temporal crest',mirror([
        (.70,-4.49,3.57,.17,.24),(.87,-4.18,3.92,.13,.23),
        (1.04,-3.79,4.17,.055,.13),(1.10,-3.46,4.19,.003,.004)]))
    process(label+' scapular bony landmark',mirror([
        (.97,-1.63,3.42,.22,.42),(1.19,-1.38,3.90,.17,.35),
        (1.46,-.97,4.18,.065,.17),(1.67,-.57,4.25,.003,.004)]))

# Nasal, orbital and jaw-closing primary planes on the original cranial skin.
skull=bpy.data.objects['Original cranial planes - r02']
skull.shape_key_add(name='Basis - r02 cranial source')
key=skull.shape_key_add(name='r03 nasofacial and orbital primary planes')
for point in key.data:
    x,y,z=point.co
    # Flatten lateral snout, narrow its end, and carve two broad nasal recesses.
    tip=max(0,min(1,(-y-6.0)/.65))
    point.co.x*=1-.13*tip
    for sign in (-1,1):
        nasal=math.exp(-(((x-sign*.36)/.13)**2+((y+6.52)/.23)**2+((z-3.15)/.15)**2)*2)
        point.co.x-=sign*.14*nasal
        point.co.z-=.055*nasal
    # Broad plane under the brow reduces rounded temple/cheek ballooning.
    lateral=math.exp(-(((abs(x)-.78)/.28)**2+((y+4.72)/.56)**2+((z-3.1)/.46)**2)*2)
    point.co.x-=(1 if x>0 else -1)*.055*lateral
key.value=1
skull.name='Original cranial primary planes - r03'

body=bpy.data.objects['Ashfang original primary skin']
key=body.shape_key_add(name='r03 wing-root and cervical primary mass',from_mix=False)
for point in key.data:
    x,y,z=point.co
    if z>2.8:
        root_bulge=math.exp(-(((abs(x)-1.18)/.65)**2+((y+.10)/.70)**2+((z-3.83)/.70)**2)*2)
        point.co.x+=(1 if x>=0 else -1)*.16*root_bulge
        point.co.z+=.20*root_bulge
        if -3.7<y<-2.0 and abs(x)<.8:
            point.co.z+=.11*math.sin((y+3.7)/1.7*math.pi)**2
key.value=1

# Save both editable working and immutable milestone sources. The preceding
# fully editable r02 project is already remote/retrieval verified; never alter it.
bpy.context.scene['stage']='M1-r03 original primary silhouette, not accepted sculpt'
final=out/'ashfang-primary.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(final),compress=True)
working=base/'working/ashfang-working-r03.blend'
if working.exists(): raise SystemExit('Never replace an unpreserved working revision')
shutil.copy2(final,working)
report={'revision':'M1-r03','sourceSha256':before,'precedingNative':str(source.relative_to(root)).replace('\\','/'),
        'sculptComplete':False,'rigged':False,'ownerAccepted':False,'geometryImported':False,
        'files':[{'path':str(f.relative_to(root)).replace('\\','/'),'bytes':f.stat().st_size,
                  'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in (final,working)],
        'sourceArchive':'New path-scoped Git LFS; prior Git binaries/history untouched',
        'rootOverlapNotice':'Primary bony landmarks intentionally penetrate skin; not final retopology'}
if hashlib.sha256(source.read_bytes()).hexdigest()!=before: raise RuntimeError('Preceding r02 changed')
(out/'authoring-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
