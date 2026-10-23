"""Localized, headless primary-form edits of the preserved original r04 source.

Explicit orbital/brow/cheek landmarks, not a dragon generator or manual sculpt
claim. Pre-union construction and every preceding native remain editable.
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
if source!=(base/'milestones/M1-r04/ashfang-primary-repaired.blend').resolve():
    raise SystemExit('Requires preserved original r04 repaired source')
out=base/'milestones/M1-r05'
if out.exists():raise SystemExit('Never overwrite a native revision')
out.mkdir(parents=True)
before=hashlib.sha256(source.read_bytes()).hexdigest()
scene=bpy.context.scene
collection=bpy.data.collections.new('R05 orbital and facial primary forms')
scene.collection.children.link(collection)
clay=bpy.data.materials['Neutral anatomy clay']
eye_mat=bpy.data.materials['Neutral recessed eye']

def path_form(name,stations,sides=16):
    # Individually placed cross-sections describe anatomy, with smooth interpolation.
    curve=[]
    for i in range(len(stations)-1):
        a,b,c,d=[stations[j] for j in (max(0,i-1),i,i+1,min(len(stations)-1,i+2))]
        for j in range(6):
            t=j/6
            curve.append(tuple(.5*(2*y+(-x+z)*t+(2*x-5*y+4*z-w)*t*t+
                (-x+3*y-3*z+w)*t*t*t) for x,y,z,w in zip(a,b,c,d)))
    curve.append(stations[-1]);vertices=[];faces=[]
    for i,v in enumerate(curve):
        center=Vector(v[:3])
        tangent=(Vector(curve[min(i+1,len(curve)-1)][:3])-Vector(curve[max(0,i-1)][:3])).normalized()
        side=tangent.cross(Vector((0,0,1)))
        if side.length<.01:side=tangent.cross(Vector((0,1,0)))
        side.normalize();up=side.cross(tangent).normalized()
        for j in range(sides):
            theta=j*math.tau/sides
            vertices.append(tuple(center+side*max(.003,v[3])*math.cos(theta)+up*max(.003,v[4])*math.sin(theta)))
    for i in range(len(curve)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(curve)-1)*sides+j for j in range(sides))])
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    ob=bpy.data.objects.new(name,data);collection.objects.link(ob);data.materials.append(clay)
    for f in data.polygons:f.use_smooth=True
    return ob

old=bpy.data.objects['R04 original cranial planes']
graph=bpy.context.evaluated_depsgraph_get()
data=bpy.data.meshes.new_from_object(old.evaluated_get(graph),depsgraph=graph)
skull=bpy.data.objects.new('R05 continuous cranial anatomy',data);collection.objects.link(skull)
old.hide_render=True;old.hide_set(True)
parts=[skull]
for sign,label in [(-1,'L'),(1,'R')]:
    def mirror(rows):return [(sign*x,y,z,w,h) for x,y,z,w,h in rows]
    # Arched supraorbital bridge over a narrow eye opening, continuous into temple.
    parts.append(path_form(label+' r05 supraorbital brow',mirror([
        (.54,-5.64,3.43,.15,.11),(.73,-5.40,3.56,.18,.13),
        (.91,-5.10,3.65,.19,.15),(1.00,-4.75,3.78,.25,.19),
        (.88,-4.38,3.78,.26,.22),(.63,-4.11,3.62,.20,.20)])))
    parts.append(path_form(label+' r05 infraorbital cheek arch',mirror([
        (.63,-5.56,3.28,.14,.12),(.80,-5.26,3.30,.14,.11),
        (.92,-4.94,3.38,.19,.14),(1.00,-4.61,3.43,.26,.25),
        (.85,-4.26,3.32,.30,.29),(.56,-4.10,3.18,.25,.22)])))
    parts.append(path_form(label+' r05 jaw closing mass',mirror([
        (.78,-4.71,3.40,.24,.27),(.96,-4.40,3.35,.31,.39),
        (.85,-4.10,3.19,.30,.35),(.55,-3.96,3.10,.23,.24)])))
    parts.append(path_form(label+' r05 nasal rim',mirror([
        (.24,-6.91,3.09,.12,.09),(.40,-6.73,3.23,.115,.09),
        (.47,-6.46,3.28,.11,.10),(.43,-6.18,3.25,.12,.10)])))
    # Larger proper eyeball fills the old pebble-like bar; sheltered by upper lid.
    for ob in bpy.data.objects:
        if ob.name==label+' r04 sheltered eye':ob.hide_render=True;ob.hide_set(True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=(sign*.83,-5.13,3.47))
    eyeball=bpy.context.object;eyeball.name=label+' r05 recessed eyeball'
    eyeball.scale=(.135,.245,.12);eyeball.data.materials.append(eye_mat)
    for c in list(eyeball.users_collection):c.objects.unlink(eyeball)
    collection.objects.link(eyeball)
    for f in eyeball.data.polygons:f.use_smooth=True

# Preserve editable component construction before irreversible union/remesh.
pre=out/'ashfang-facial-preunion.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(pre),compress=True)
# Union on duplicated construction only, retaining all authored section components.
copies=[]
for ob in parts:
    copy=ob.copy();copy.data=ob.data.copy();collection.objects.link(copy);copies.append(copy)
    ob.hide_render=True;ob.hide_set(True)
bpy.ops.object.select_all(action='DESELECT')
for ob in copies:ob.select_set(True)
bpy.context.view_layer.objects.active=copies[0]
bpy.ops.object.join();sculpt=bpy.context.object;sculpt.name='Ashfang r05 integrated cranial skin'
mod=sculpt.modifiers.new('Primary union voxel surface .028','REMESH');mod.mode='VOXEL';mod.voxel_size=.028;mod.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=mod.name)
mod=sculpt.modifiers.new('Primary union relaxation','SMOOTH');mod.factor=.55;mod.iterations=4
bpy.ops.object.modifier_apply(modifier=mod.name)
sculpt['authoring']='Explicit headless facial landmark modeling and voxel union; not manual sculpting'
sculpt['construction_source']='ashfang-facial-preunion.blend'
scene['stage']='M1-r05 headless orbital/facial primary correction; not accepted'
scene['operating_constraint']='Headless only. Pause before any necessary desktop control.'
scene['camera_head_target']=(0,-5.10,3.35)
target=out/'ashfang-primary.blend'
working=base/'working/ashfang-working-r05.blend'
if working.exists():raise SystemExit('Never overwrite working native')
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True);shutil.copy2(target,working)
report={'revision':'M1-r05','precedingSourceSha256':before,'headless':True,'manualSculpt':False,
        'ownerAccepted':False,'runtimeIntegrated':False,'intentionalOverlaps':'Primary teeth/horns/mandible remain separate; final topology not certified',
        'files':[{'path':str(f.relative_to(root)).replace('\\','/'),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in (pre,target,working)]}
if hashlib.sha256(source.read_bytes()).hexdigest()!=before:raise RuntimeError('Preceding source changed')
(out/'authoring-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
