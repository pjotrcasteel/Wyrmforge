"""Targeted original mesh revision after r01 visual failure; preserves prior native.

Run against original M1-r01 only. This is an anatomy study, not final sculpting.
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
if source != (base/'milestones/M1-r01/ashfang-primary.blend').resolve():
    raise SystemExit('This authored revision requires the original r01 source')
out=base/'milestones/M1-r02'
if out.exists(): raise SystemExit('r02 exists; preserve it and author a new revision')
out.mkdir(parents=True)
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()

# Retain explicit preceding native snapshot before skull topology edits.
preceding=out/'ashfang-before-cranial-union.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(preceding),compress=True)

head_names=['Original elongated predatory cranium','Independent lower mandible',
            'Mouth floor and tongue study']
head=[o for o in bpy.data.objects if o.type=='MESH' and
      (o.name in head_names or any(s in o.name for s in
       ('orbital brow','cheek and jaw','recessed eye','original swept','upper tooth','lower tooth')))]
for ob in head:
    for v in ob.data.vertices:
        v.co.y=-4.2+(v.co.y+4.2)*1.24
        v.co.x*=1.10
        # Less blunt, broad upper jaw; stronger mandibular lever behind the muzzle.
        v.co.z=3.03+(v.co.z-3.03)*1.08
        if ob.name=='Original elongated predatory cranium':
            front=max(0,min(1,(-v.co.y-5.25)/1.1))
            if v.co.z>3.13:
                v.co.z-=front*max(0,v.co.z-3.16)*.72
            # Primary sagittal bony plane, not random scales.
            crest=math.exp(-((v.co.x/.30)**2+((v.co.y+4.75)/.68)**2))
            if v.co.z>3.32: v.co.z+=.16*crest
        if 'orbital brow' in ob.name:
            # Flatten the rounded brow tube into a sloped bone ridge.
            front=max(0,min(1,(-v.co.y-4.45)/1.0))
            v.co.z=3.56+(v.co.z-3.56)*.48-front*.10
            v.co.x*=1.06
        if 'cheek and jaw' in ob.name:
            v.co.x*=.90

# Integrate the brow, temple and cranium so the face is a coherent skin volume.
skull=bpy.data.objects['Original elongated predatory cranium']
bpy.ops.object.select_all(action='DESELECT')
for ob in head:
    if ob==skull or 'orbital brow' in ob.name or 'cheek and jaw' in ob.name:
        ob.select_set(True)
bpy.context.view_layer.objects.active=skull
bpy.ops.object.join()
skull.name='Original cranial planes - r02'
mod=skull.modifiers.new('Cranial union, preceding source preserved','REMESH')
mod.mode='VOXEL'
mod.voxel_size=.035
mod.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=mod.name)
for v in skull.data.vertices:
    # Planarize exposed lateral muzzle while preserving narrowing and jaw opening.
    front=max(0,min(1,(-v.co.y-5.3)/.9))
    if v.co.z>3.08:
        v.co.z-=front*max(0,v.co.z-3.19)*.55
for f in skull.data.polygons: f.use_smooth=True

# Broad primary muscle/bone planes edited on the connected body through an
# editable shape key. No pore/noise/armor decoration; foot contacts remain fixed.
body=bpy.data.objects['Ashfang original primary skin']
body.shape_key_add(name='Basis')
key=body.shape_key_add(name='r02 primary sternum scapula neck planes')
for point in key.data:
    x,y,z=point.co
    if z>.7:
        def falloff(cx,cy,cz,rx,ry,rz):
            return math.exp(-(((abs(x)-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2)*2)
        # Scapular crest and pectoral/upper-arm mass are separated by a broad groove.
        point.co.x+=(1 if x>=0 else -1)*(.15*falloff(1.15,-1.35,2.85,.6,.8,.9)
                            -.09*falloff(.93,-.72,2.3,.35,.55,.65))
        point.co.z+=.17*falloff(.85,-1.3,3.45,.65,.75,.55)
        # Neck broadens into shoulders but is not an unbroken cylindrical sausage.
        if -3.9<y<-2.3 and abs(x)<1.0:
            influence=math.sin((y+3.9)/1.6*math.pi)**2
            point.co.x*=1-.10*influence
            point.co.z+=.14*influence
key.value=1

# Provisional primary wing carriage: same cambered surface, digit geometry and
# root positions. Explicitly a static design pose, not a rig or motion clip.
wing=bpy.data.collections['03 Wing construction']
for ob in wing.objects:
    ob.shape_key_add(name='Basis - extended wing study')
    pose=ob.shape_key_add(name='Provisional relaxed digit carriage - no rig')
    sign=-1 if ob.name.startswith('L ') else 1
    origin=Vector((sign*3.55,-.48,5.55))
    for v in pose.data:
        delta=v.co-origin
        radial=math.hypot(delta.x,delta.y)
        v.co=origin+Vector((delta.x*.50,delta.y*.94+abs(delta.x)*.32,
                            delta.z*.75-radial*.18))
    pose.value=1
    ob['design_pose_only']=True

bpy.context.scene['stage']='M1 r02 primary skull and carriage revision; no owner acceptance'
final=out/'ashfang-primary.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(final),compress=True)
working=base/'working/ashfang-working-r02.blend'
if working.exists(): raise SystemExit('Refusing to replace a valuable working revision')
shutil.copy2(final,working)
files=[preceding,final,working]
report={'source':str(source.relative_to(root)).replace('\\','/'),'sourceSha256':source_hash,
        'revision':'M1-r02','geometryImported':False,'sculptComplete':False,'rigged':False,
        'ownerAccepted':False,'files':[{'path':str(f.relative_to(root)).replace('\\','/'),
        'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]}
native=list(base.rglob('*.blend'))
report['pilotNativeBytes']=sum(f.stat().st_size for f in native)
report['pilotStorageWithinLimit']=all(f.stat().st_size<8388608 for f in native) and report['pilotNativeBytes']<=20971520
if hashlib.sha256(source.read_bytes()).hexdigest()!=source_hash:
    raise RuntimeError('Original r01 changed')
(out/'authoring-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if not report['pilotStorageWithinLimit']: raise SystemExit('Preserved source exceeds pilot storage bound; do not upload')
print(json.dumps(report))
