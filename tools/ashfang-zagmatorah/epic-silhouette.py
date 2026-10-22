"""Anatomical silhouette revision: shared mesh/rig rest-space mapping, never uniform scaling."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Immutable output already exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);rig=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah']
wing_names=set()
for side in ('l','r'):
    b=rig.data.bones['Shoulder_'+side];wing_names.add(b.name);wing_names.update(c.name for c in b.children_recursive)
rig.data.pose_position='REST'
if rig.animation_data:rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
def mapping(p,wing=0):
    x,y,z=p
    # Broader skull and shoulder volume, independently shorter tail, extended wings.
    width=1.22+.15/(1+math.exp(max(-40,min(40,(x+2.7)*6))))
    yn=y*width
    yn+=math.copysign(max(0,abs(y)-.9)*.72*wing,y)
    chest=math.exp(-((x+.15)/1.6)**4)
    height=max(0,min(1,(z-1.05)/.9))
    zn=z+(z-2.4)*.26*chest*height
    xn=2.4+(x-2.4)*.65 if x>2.4 else (-3.1+(x+3.1)*1.12 if x< -3.1 else x)
    return Vector((xn,yn,zn))
for ob in [o for o in bpy.data.objects if o.type=='MESH']:
    groups={g.index:g.name for g in ob.vertex_groups}
    influence=[sum(g.weight for g in v.groups if groups[g.group] in wing_names) for v in ob.data.vertices]
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            for i,point in enumerate(key.data):point.co=mapping(point.co,influence[i])
    else:
        for i,v in enumerate(ob.data.vertices):v.co=mapping(v.co,influence[i])
# Rest bones follow the same feature mapping as the associated weighted vertices.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
    h,t=b.head.copy(),b.tail.copy();b.head=mapping(h,float(b.name in wing_names));b.tail=mapping(t,float(b.name in wing_names))
bpy.ops.object.mode_set(mode='OBJECT')
# Sink proximal limb skin into the widened shoulder; keep feet and claws grounded.
for side in ('l','r'):
    ob=bpy.data.objects['Ashfang provisional foreleg '+side]
    basis=ob.data.shape_keys.key_blocks[0];key=ob.shape_key_add(name='Ashfang integrated shoulder transition')
    keep=ob.vertex_groups['Foreleg source-topology isolation'].index
    for v in ob.data.vertices:
        point=basis.data[v.index].co.copy()
        if any(g.group==keep and g.weight>.5 for g in v.groups):
            blend=max(0,min(1,(point.z-1.6)/1.0));blend=blend*blend*(3-2*blend)
            point.y*=1-.28*blend;point.z+=.12*blend;point.x-=.08*blend
        key.data[v.index].co=point
    key.value=1
rig.data.pose_position='POSE'
def rotate(name,axis,angle):
    b=rig.pose.bones[name];q=b.bone.matrix_local.to_quaternion();b.rotation_mode='QUATERNION';b.rotation_quaternion=q.inverted()@Quaternion(Vector(axis),math.radians(angle))@q
for side,sign in [('l',-1),('r',1)]:rotate('UpperArm_'+side,(1,0,0),sign*58)
rotate('LowerHead',(0,1,0),-17)
rig['AshfangReviewPose']='Static monumental-silhouette study; not accepted motion'
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'silhouette-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'changes':['Independent tail shortening to 65 percent beyond pelvis','Broader cranium and torso','Wider articulated wing span','Chest radial mass','Reversible proximal foreleg shoulder correction','Static wing and jaw carriage'],'originalSourcePreserved':True,'ownerAccepted':False,'limits':['Nonlinear rest-space mapping requires deformation review','Proximal overlapping skin is not final welded topology','No animation or final visual acceptance']},indent=2))
