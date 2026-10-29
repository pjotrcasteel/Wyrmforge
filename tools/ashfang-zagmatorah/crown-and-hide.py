"""Ashfang crown, layered anatomical hide, wing spread and recessed throat heat."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector,Quaternion
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Immutable output exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);rig=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah']
rig.data.pose_position='REST';bpy.context.view_layer.update()
evalbody=body.evaluated_get(bpy.context.evaluated_depsgraph_get());surface=evalbody.to_mesh();bvh=BVHTree.FromPolygons([v.co for v in surface.vertices],[p.vertices for p in surface.polygons])
material=bpy.data.materials['Ashfang fractured obsidian armor']
verts=[];faces=[];weights=[];plate_count=0
axis_bones=['UpperHead','Head','Neck01','Neck02','Neck03','Spine01','Spine02','Spine03']
axis=sorted([(b.head_local.x,b.head_local.z,b.name) for b in [rig.data.bones[n] for n in axis_bones]])
def center(x):
    for i in range(len(axis)-1):
        if axis[i][0]<=x<=axis[i+1][0]:
            t=(x-axis[i][0])/(axis[i+1][0]-axis[i][0]);return axis[i][1]*(1-t)+axis[i+1][1]*t
    return min(axis,key=lambda p:abs(p[0]-x))[1]
def bone_at(x):return min(axis,key=lambda p:abs(p[0]-x))[2]
def project(x,angle,offset):
    d=Vector((0,math.sin(angle),math.cos(angle)));hit,normal,index,dist=bvh.ray_cast(Vector((x,0,center(x))),d,1.8)
    return hit+d*offset if hit is not None else None
# Staggered rows form overlapping anatomical plates; no randomized spikes.
for row in range(17):
    x=-2.92+row*.34
    for col in range(-6,7):
        angle=col*.43+(row%2)*.13
        footprint=[(-.23,-.12),(-.11,-.28),(.22,-.24),(.30,0),(.22,.24),(-.11,.28)]
        ring=[project(x+dx,angle+da,.025) for dx,da in footprint]
        apex=project(x+.13,angle,.095+(.09 if abs(angle)<.2 else 0))
        if apex is None or any(p is None for p in ring):continue
        # Reject discontinuous projection jumps across a limb-root surface.
        if max((p-ring[0]).length for p in ring)>.95:continue
        start=len(verts);direction=Vector((0,math.sin(angle),math.cos(angle)))
        verts.extend(ring);verts.append(apex);verts.extend([p-direction*.055 for p in ring])
        for i in range(6):
            j=(i+1)%6;faces.extend([(start+i,start+j,start+6),(start+i,start+7+i,start+7+j,start+j)])
        faces.append(tuple(start+7+i for i in reversed(range(6))));weights.append((list(range(start,len(verts))),bone_at(x)));plate_count+=1
me=bpy.data.meshes.new('Ashfang layered volcanic plate hide');me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
armor=bpy.data.objects.new('Ashfang layered anatomical plate hide',me);bpy.context.collection.objects.link(armor);me.materials.append(material)
for indices,name in weights:
    g=armor.vertex_groups.get(name) or armor.vertex_groups.new(name=name);g.add(indices,1,'REPLACE')
mod=armor.modifiers.new('Shared articulated skeleton','ARMATURE');mod.object=rig
bevel=armor.modifiers.new('Weathered scale lips','BEVEL');bevel.width=.012;bevel.segments=2
# Two deliberately authored crown arcs, rooted in skull and swept backward.
def horn(side):
    s=1 if side=='r' else -1
    points=[Vector(p) for p in [(-3.66,s*.42,3.63),(-3.52,s*.53,3.98),(-3.20,s*.70,4.36),(-2.78,s*.84,4.72),(-2.35,s*.83,5.02),(-2.08,s*.70,5.24)]]
    radii=[.26,.25,.20,.14,.075,.005];vs=[];fs=[];segments=12
    for i,(point,radius) in enumerate(zip(points,radii)):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
        for j in range(segments):
            angle=j*math.tau/segments;vs.append(point+(u*math.cos(angle)+v*math.sin(angle))*radius)
    for i in range(len(points)-1):
        for j in range(segments):k=i*segments+j;l=i*segments+(j+1)%segments;fs.append((k,l,l+segments,k+segments))
    fs.extend([tuple(reversed(range(segments))),tuple((len(points)-1)*segments+j for j in range(segments))])
    mesh=bpy.data.meshes.new('Crown arc '+side);mesh.from_pydata(vs,[],fs);mesh.update();ob=bpy.data.objects.new('Ashfang swept crown horn '+side,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for p in mesh.polygons:p.use_smooth=True
    group=ob.vertex_groups.new(name='UpperHead');group.add(list(range(len(vs))),1,'REPLACE');modifier=ob.modifiers.new('Cranial attachment','ARMATURE');modifier.object=rig
for side in ('l','r'):horn(side)
evalbody.to_mesh_clear()
# Recessed hot throat volume, hidden by skin except through the open mouth.
heat=bpy.data.materials.new('Ashfang internal throat heat');heat.use_nodes=True;bs=heat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.12,.005,.001,1);bs.inputs['Emission Color'].default_value=(1,.17,.008,1);bs.inputs['Emission Strength'].default_value=16
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(-4.04,0,2.97));core=bpy.context.object;core.name='Ashfang recessed molten throat';core.scale=(.42,.19,.14);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# World-space shape remains editable; armature uses matching local transforms.
group=core.vertex_groups.new(name='UpperHead');group.add(list(range(len(core.data.vertices))),1,'REPLACE');mod=core.modifiers.new('Throat follows skull','ARMATURE');mod.object=rig;core.data.materials.append(heat)
rig.data.pose_position='POSE';bpy.context.view_layer.update()
def world_delta(name,axis,angle):
    b=rig.pose.bones[name];q=b.matrix.to_quaternion();delta=q.inverted()@Quaternion(Vector(axis),math.radians(angle))@q;b.rotation_mode='QUATERNION';b.rotation_quaternion=b.rotation_quaternion@delta
for side,sign in [('l',1),('r',-1)]:
    for name,angle in [('Wing0101_',16),('Wing0201_',-10),('Wing0301_',-34)]:
        world_delta(name+side,(0,0,1),angle*sign);bpy.context.view_layer.update()
world_delta('LowerHead',(0,1,0),-10);bpy.context.view_layer.update()
# Recess the generic cellular shader: anatomy and plate boundaries lead the read.
for mat in bpy.data.materials:
    if mat.name not in ('DragonSkin','DragonWing'):continue
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type=='MATH' and node.operation=='MULTIPLY' and not node.inputs[1].is_linked and node.inputs[1].default_value>1:node.inputs[1].default_value*=.55
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'crown-hide-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'newConformingScales':plate_count,'crownHorns':2,'wingFingerSpread':'16/-10/-34 degrees mirrored, articulated pose','recessedThroatHeat':True,'ownerAccepted':False,'limits':['Surface projection and plate overlap need close visual review','Horn attachment and mouth cavity require inspection','No animation or final rig acceptance']},indent=2))
