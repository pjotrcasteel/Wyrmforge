"""Anatomically directed molten channels beneath editable volcanic plates."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Output exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);rig=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah'];rig.data.pose_position='REST';bpy.context.view_layer.update()
e=body.evaluated_get(bpy.context.evaluated_depsgraph_get());surface=e.to_mesh();bvh=BVHTree.FromPolygons([v.co for v in surface.vertices],[p.vertices for p in surface.polygons])
axis=sorted([(rig.data.bones[n].head_local.x,rig.data.bones[n].head_local.z,n) for n in ['UpperHead','Head','Neck01','Neck02','Neck03','Spine01','Spine02','Spine03']])
def axis_at(x):
    for i in range(len(axis)-1):
        if axis[i][0]<=x<=axis[i+1][0]:
            t=(x-axis[i][0])/(axis[i+1][0]-axis[i][0]);return axis[i][1]*(1-t)+axis[i+1][1]*t,[(axis[i][2],1-t),(axis[i+1][2],t)]
    p=min(axis,key=lambda p:abs(p[0]-x));return p[1],[(p[2],1)]
mat=bpy.data.materials.new('Ashfang deep molten fracture core');mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.3,.015,.001,1);shader.inputs['Emission Color'].default_value=(1,.045,.001,1);shader.inputs['Emission Strength'].default_value=3
vs=[];fs=[];assign=[];paths=0
def channel(samples,width):
    global paths
    previous=None;previous_center=None;count=0
    for x,angle in samples:
        z,weights=axis_at(x);d=Vector((0,math.sin(angle),math.cos(angle)));hit,norm,index,dist=bvh.ray_cast(Vector((x,0,z)),d,1.8)
        if hit is None:previous=None;previous_center=None;continue
        center=hit+d*.008
        if previous_center is not None and (center-previous_center).length>.16:previous=None
        start=len(vs);radius=width*.40*(.7+.3*math.sin(x*11)**2)
        u=Vector((1,0,0));v=d.cross(u).normalized()
        for j in range(6):
            phi=j*math.tau/6;vs.append(center+(u*math.cos(phi)+v*math.sin(phi))*radius)
        assign.append((list(range(start,start+6)),weights))
        if previous is not None:
            for j in range(6):k=(j+1)%6;fs.append((previous+j,previous+k,start+k,start+j))
        else:fs.append(tuple(start+j for j in reversed(range(6))))
        previous=start;previous_center=center;count+=1
    if previous is not None:fs.append(tuple(previous+j for j in range(6)));paths+=1
for side in (-1,1):
    for base in (.8,1.65,2.3):
        channel([(-2.85+i*.075,side*(base+.13*math.sin(i*.79)+.04*math.sin(i*2.1))) for i in range(54)],.019 if base<2 else .027)
    for start in (-1.8,-.8,.1):
        channel([(start+i*.027,side*(.48+i*.036+.035*math.sin(i*1.8))) for i in range(40)],.013)
mesh=bpy.data.meshes.new('Directed anatomical heat channels');mesh.from_pydata(vs,[],fs);mesh.update();ob=bpy.data.objects.new('Ashfang recessed anatomical molten fissures',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(mat)
for indices,weights in assign:
    for name,weight in weights:
        group=ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name);group.add(indices,weight,'REPLACE')
mod=ob.modifiers.new('Deforming heat channels','ARMATURE');mod.object=rig;e.to_mesh_clear()
for material in bpy.data.materials:
    if not material.use_nodes:continue
    if material.name in ('DragonSkin','DragonWing'):
        for node in material.node_tree.nodes:
            if node.type=='MATH' and node.operation=='MULTIPLY' and not node.inputs[1].is_linked and node.inputs[1].default_value>1:node.inputs[1].default_value=.32 if material.name=='DragonSkin' else .12
            if node.name.startswith('Ashfang charred source pigment'):node.inputs[2].default_value=(.04,.028,.023,1) if material.name=='DragonSkin' else (.17,.035,.012,1)
    if material.name=='Ashfang fractured obsidian armor':material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.018,.014,.011,1)
core=bpy.data.objects['Ashfang recessed molten throat'];core.location=(-3.72,0,2.64);core.scale=(.38,.48,.48)
# Internal light gives hot mouth surfaces rather than a visible glowing ball.
lamp=bpy.data.lights.new('Internal oral heat','POINT');lamp.energy=28;lamp.color=(1,.095,.008);lamp.shadow_soft_size=.13
oral=bpy.data.objects.new('Ashfang internal mouth illumination',lamp);bpy.context.collection.objects.link(oral);oral.location=(-4.25,0,2.60)
oral.parent=rig;oral.parent_type='BONE';oral.parent_bone='UpperHead';oral.matrix_world.translation=(-4.25,0,2.60)
for side in ('l','r'):
    horn=bpy.data.objects['Ashfang swept crown horn '+side];s=1 if side=='r' else -1;base=Vector((-3.66,s*.42,3.63))
    for vertex in horn.data.vertices:
        delta=vertex.co-base;vertex.co=base+Vector((delta.x*.90,delta.y*.80,delta.z*.80))
# Modest editable skull/jaw mass, preserving original facial controls.
basis=body.data.shape_keys.key_blocks[0];key=body.shape_key_add(name='Ashfang heavy cranial planes');names={g.index:g.name for g in body.vertex_groups}
for vertex in body.data.vertices:
    weight=sum(g.weight*(.12 if names[g.group] in ('Head','UpperHead') else .08) for g in vertex.groups if names[g.group] in ('Head','UpperHead','LowerHead'))
    key.data[vertex.index].co=basis.data[vertex.index].co+vertex.normal*weight
key.value=1
rock=bpy.data.materials['Ashfang fractured obsidian armor'];nodes=rock.node_tree.nodes;links=rock.node_tree.links
variation=nodes.new('ShaderNodeTexNoise');variation.inputs['Scale'].default_value=7;variation.inputs['Detail'].default_value=3
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.003,.003,.003,1);ramp.color_ramp.elements[1].color=(.028,.020,.014,1)
links.new(variation.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
rig.data.pose_position='POSE';bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'heat-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'anatomicalHeatPaths':paths,'geometryVertices':len(vs),'ownerAccepted':False,'limits':['Heat tubes sit beneath/among surface plates; close review required','No fire-breath simulation or animation','Material/presentation approval pending']},indent=2))
