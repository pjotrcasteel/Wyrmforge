"""Headless primary plane and silhouette edits; preserved r05 is the input.

Local mesh edits encode deliberate anatomical landmarks. No random scales,
materials, final sculpt or production rig is generated or certified here.
"""
import hashlib
import json
import math
from pathlib import Path
import shutil
import bpy
import bmesh
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=Path(bpy.data.filepath).resolve()
if source!=(base/'milestones/M1-r05/ashfang-primary.blend').resolve():raise SystemExit('Requires original r05')
out=base/'milestones/M1-r06'
if out.exists():raise SystemExit('Never replace native revision')
out.mkdir(parents=True)
before=hashlib.sha256(source.read_bytes()).hexdigest()
collection=bpy.data.collections.new('R06 primary anatomical plane corrections')
bpy.context.scene.collection.children.link(collection)

def duplicate(ob,name):
    graph=bpy.context.evaluated_depsgraph_get()
    data=bpy.data.meshes.new_from_object(ob.evaluated_get(graph),depsgraph=graph)
    new=bpy.data.objects.new(name,data);new.matrix_world=ob.matrix_world;collection.objects.link(new)
    ob.hide_render=True;ob.hide_set(True)
    return new

def gaussian(x,y,z,center,radius):
    return math.exp(-2*sum(((v-c)/r)**2 for v,c,r in zip((x,y,z),center,radius)))

head=duplicate(bpy.data.objects['Ashfang r05 integrated cranial skin'],'Ashfang r06 integrated cranial skin')
for v in head.data.vertices:
    x,y,z=v.co;sign=1 if x>=0 else -1
    # Narrow and flatten the inflated nasal rims into the muzzle planes.
    nasal=gaussian(abs(x),y,z,(.44,-6.62,3.24),(.30,.54,.35))
    v.co.x-=sign*.065*nasal;v.co.z-=.055*nasal
    # Broad longitudinal nasal crest; a single cranial landmark, not scale noise.
    roof=gaussian(x,y,z,(0,-5.91,3.40),(.25,.91,.32))
    v.co.z+=.16*roof
    # Flatten superior brow surfaces and establish a sharper orbital overhang.
    brow=gaussian(abs(x),y,z,(.87,-5.02,3.75),(.32,.65,.31))
    v.co.z-=.07*brow
    v.co.x+=sign*.055*brow
    # Recess the soft cheek below the arch while retaining closing-muscle bulk.
    cheek=gaussian(abs(x),y,z,(.96,-4.65,3.20),(.30,.49,.28))
    v.co.x-=sign*.105*cheek
    # Lower lateral skull plane follows a jaw hinge rather than a round swelling.
    if abs(x)>.74 and -4.65<y<-4.03 and 2.95<z<3.52:
        v.co.x=sign*(.74+(abs(v.co.x)-.74)*.78)

body=duplicate(bpy.data.objects['Ashfang r04 integrated primary skin'],'Ashfang r06 integrated primary skin')
for v in body.data.vertices:
    x,y,z=v.co;ax=abs(x);sign=1 if x>=0 else -1
    # Scapular spine and deltoid separated from the neck/rib cage by a broad hollow.
    scap=gaussian(ax,y,z,(1.10,-1.45,3.32),(.48,.68,.66))
    v.co.x+=sign*.24*scap;v.co.z+=.20*scap
    neck=gaussian(ax,y,z,(.70,-2.35,3.00),(.39,.40,.72))
    v.co.x-=sign*.10*neck
    # Pectoral keel deepens central sternum, preserving underbody clearance.
    keel=gaussian(x,y,z,(0,-1.70,1.65),(.69,.92,.53))
    v.co.z-=.18*keel
    # Clearer rib-to-waist transition, not an even cylindrical trunk.
    waist=gaussian(ax,y,z,(.98,1.25,2.53),(.41,.53,.85))
    v.co.x-=sign*.15*waist
    # Greater trochanter/haunch apex and hamstring separation.
    hip=gaussian(ax,y,z,(1.37,2.16,2.57),(.57,.70,.71))
    v.co.x+=sign*.20*hip;v.co.z+=.14*hip
    ham=gaussian(ax,y,z,(1.81,2.22,1.51),(.35,.35,.49))
    v.co.x-=sign*.08*ham
    # Ulnar and tibial crests give load-bearing limbs directional planes.
    ulna=gaussian(ax,y,z,(1.84,-.87,1.19),(.29,.44,.51))
    v.co.y-=.07*ulna
    shin=gaussian(ax,y,z,(1.91,2.36,.82),(.25,.44,.35))
    v.co.x+=sign*.07*shin

# Replace smooth, round horns with deliberately swept, planar skull processes.
# Old horns remain in the native project, hidden rather than deleted.
for ob in list(bpy.data.objects):
    if 'original swept' in ob.name and 'horn' in ob.name:
        ob.hide_render=True;ob.hide_set(True)

def blade(name,stations):
    vertices=[];faces=[]
    for i,(x,y,z,w,h) in enumerate(stations):
        tangent=(Vector(stations[min(i+1,len(stations)-1)][:3])-Vector(stations[max(0,i-1)][:3])).normalized()
        side=Vector((1,0,0));up=tangent.cross(side).normalized()
        # Broad ridged dorsal face, narrow ventral plane; asymmetric section.
        for a,b in [(-1,0),(-.55,.75),(0,1),(.55,.75),(1,0),(.45,-.48),(-.45,-.48)]:
            vertices.append(tuple(Vector((x,y,z))+side*w*a+up*h*b))
    n=7
    for i in range(len(stations)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(stations)-1)*n+j for j in range(n))])
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    ob=bpy.data.objects.new(name,data);collection.objects.link(ob)
    data.materials.append(bpy.data.materials['Neutral anatomy clay'])
    bevel=ob.modifiers.new('Primary bone edge radius','BEVEL');bevel.width=.025;bevel.segments=2
    ob['intentional_root_overlap']=True
    return ob

for sign,label in [(-1,'L'),(1,'R')]:
    def mirror(rows):return [(sign*x,y,z,w,h) for x,y,z,w,h in rows]
    blade(label+' r06 swept supraorbital process',mirror([
        (.69,-4.82,3.76,.23,.16),(.83,-4.43,3.99,.27,.22),
        (.96,-3.97,4.22,.19,.23),(1.04,-3.53,4.37,.10,.14),
        (1.00,-3.05,4.43,.003,.004)]))
    blade(label+' r06 temporal jaw shield',mirror([
        (.86,-4.49,3.32,.22,.27),(1.04,-4.14,3.46,.24,.31),
        (1.29,-3.78,3.65,.15,.23),(1.44,-3.41,3.72,.003,.004)]))
    blade(label+' r06 lateral occipital process',mirror([
        (.69,-4.12,3.62,.20,.22),(.94,-3.81,3.86,.20,.22),
        (1.24,-3.36,4.00,.11,.13),(1.39,-2.91,4.01,.003,.004)]))

# Curve tooth tips backwards and reduce uniformly tall lower cones on new copies.
for ob in list(bpy.data.objects):
    if 'r04' not in ob.name or 'rooted tooth' not in ob.name or ob.hide_render:continue
    tooth=ob.copy();tooth.data=ob.data.copy();tooth.name=ob.name.replace('r04','r06')
    collection.objects.link(tooth);ob.hide_render=True;ob.hide_set(True)
    zs=[v.co.z for v in tooth.data.vertices];low,high=min(zs),max(zs)
    groups=[tooth.data.vertices]
    if tooth.data.shape_keys:groups.extend(k.data for k in tooth.data.shape_keys.key_blocks)
    for points in groups:
        for v in points:
            t=(high-v.co.z)/(high-low) if 'upper' in ob.name else (v.co.z-low)/(high-low)
            v.co.y+=.11*t*t
            if 'lower' in ob.name:v.co.z=low+(v.co.z-low)*.76

scene=bpy.context.scene
scene['stage']='M1-r06 headless primary planes; artistic review pending'
target=out/'ashfang-primary.blend';working=base/'working/ashfang-working-r06.blend'
if working.exists():raise SystemExit('Never replace working native')
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True);shutil.copy2(target,working)
report={'revision':'M1-r06','precedingSourceSha256':before,'headless':True,'ownerAccepted':False,
        'manualSculpt':False,'runtimeIntegrated':False,'intentionalOverlaps':'Primary skull processes, teeth and membrane roots; not final deformation topology',
        'files':[{'path':str(f.relative_to(root)).replace('\\','/'),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in (target,working)]}
if hashlib.sha256(source.read_bytes()).hexdigest()!=before:raise RuntimeError('Previous native changed')
(out/'authoring-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
