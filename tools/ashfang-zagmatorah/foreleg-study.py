"""Preserved-topology foreleg block-in with independent rig chains; not final anatomy."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output).resolve()
if out.exists():raise SystemExit('Refusing to replace an immutable revision')
out.mkdir(parents=True)
source=Path(bpy.data.filepath);body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton']
source_groups={g.index:g.name for g in body.vertex_groups}
weights=[[(source_groups[g.group],g.weight) for g in v.groups] for v in body.data.vertices]
chains={s:['UpperLeg_'+s]+[b.name for b in rig.data.bones['UpperLeg_'+s].children_recursive] for s in ('l','r')}
def transform(co):return Vector((co.x*.9-2.65,co.y*1.2,co.z*1.06-.01))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for side,names in chains.items():
    root=rig.data.edit_bones.new('AshfangForeRoot_'+side);src=rig.data.edit_bones['Spine03'];root.head=transform(src.head);root.tail=transform(src.tail);root.parent=rig.data.edit_bones['Spine01']
    for name in names:
        old=rig.data.edit_bones[name];new=rig.data.edit_bones.new('AshfangFore_'+name);new.head=transform(old.head);new.tail=transform(old.tail);new.roll=old.roll;new.use_deform=old.use_deform
    for name in names:
        old=rig.data.edit_bones[name];new=rig.data.edit_bones['AshfangFore_'+name]
        new.parent=rig.data.edit_bones['AshfangFore_'+old.parent.name] if old.parent and old.parent.name in names else root
        new.use_connect=old.use_connect and old.parent.name in names
bpy.ops.object.mode_set(mode='OBJECT')
counts={}
for side,names in chains.items():
    limb=body.copy();limb.data=body.data.copy();limb.name='Ashfang provisional foreleg '+side;bpy.context.collection.objects.link(limb)
    for modifier in list(limb.modifiers):limb.modifiers.remove(modifier)
    # Shared creator UVs, polygon structure, source material and articulation weights.
    if limb.data.shape_keys:
        for key in limb.data.shape_keys.key_blocks:
            for point in key.data:point.co=transform(point.co)
    else:
        for v in limb.data.vertices:v.co=transform(v.co)
    limb.vertex_groups.clear()
    root=limb.vertex_groups.new(name='AshfangForeRoot_'+side)
    groups={name:limb.vertex_groups.new(name='AshfangFore_'+name) for name in names}
    keep=limb.vertex_groups.new(name='Foreleg source-topology isolation')
    retained=[]
    for i,entries in enumerate(weights):
        legweight=sum(w for n,w in entries if n in groups)
        if legweight<=.32:continue
        retained.append(i)
        residual=sum(w for n,w in entries if n not in groups)
        if residual:root.add([i],residual,'REPLACE')
        for name,w in entries:
            if name in groups:groups[name].add([i],w,'REPLACE')
    keep.add(retained,1,'REPLACE');mask=limb.modifiers.new('Isolate reusable limb topology','MASK');mask.vertex_group=keep.name;mask.threshold=.5
    arm=limb.modifiers.new('Independent forelimb articulation','ARMATURE');arm.object=rig
    limb['reviewStatus']='Provisional adaptation of hindleg topology; shoulder seam and forelimb proportions require authored correction'
    counts[side]=len(retained)
# New milestones reference the already preserved texture archive, avoiding repeated
# 137MB packed copies. Original import and earlier packed sources remain untouched.
for image in bpy.data.images:
    if image.source!='FILE':continue
    name=Path(image.filepath.replace('\\','/')).name
    texture=out.parent/'M0-001/original/download/textures'/name
    if not texture.is_file():raise RuntimeError('Missing preserved texture '+str(texture))
    if image.packed_file:image.unpack(method='REMOVE')
    image.filepath='//../M0-001/original/download/textures/'+name
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True)
(out/'foreleg-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'retainedLimbVertices':counts,'newBones':sum(len(n)+1 for n in chains.values()),'sourceTopologyPreserved':True,'sharedRelativeTextures':'../M0-001/original/download/textures/','ownerAccepted':False,'limitations':['Adapted hindleg topology is provisional foreleg anatomy','Open shoulder transition needs integration','No authored gait or accepted deformation test','Original wing carriage still overlaps front body']},indent=2))
