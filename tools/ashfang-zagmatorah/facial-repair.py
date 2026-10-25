"""Explicit original-iris atlas repair and anatomical furnace gating."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Immutable revision exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);ob=bpy.data.objects['Zagmatorah'];mesh=ob.data;names={g.index:g.name for g in ob.vertex_groups}
eye_ids={side:[v.index for v in mesh.vertices if any(names[g.group]=='Eye_'+side and g.weight>.4 for g in v.groups)] for side in ('l','r')}
centers={side:sum((mesh.vertices[i].co for i in ids),Vector())/len(ids) for side,ids in eye_ids.items()}
bounds={side:(max(abs(mesh.vertices[i].co.x-centers[side].x) for i in ids),max(abs(mesh.vertices[i].co.z-centers[side].z) for i in ids)) for side,ids in eye_ids.items()}
base=mesh.uv_layers.active;repair=mesh.uv_layers.new(name='Ashfang eye iris atlas repair',do_init=True)
# Explicit chart projected onto lateral globe: preserve the original creator UVs.
repaired=0
for poly in mesh.polygons:
    if ob.material_slots[poly.material_index].material.name!='DragonEye':continue
    for li in poly.loop_indices:
        v=mesh.vertices[mesh.loops[li].vertex_index];side='l' if v.co.y<0 else 'r';center=centers[side];rx,rz=bounds[side]
        repair.data[li].uv=(.205+(v.co.x-center.x)/rx*.15,.765+(v.co.z-center.z)/rz*.15);repaired+=1
mesh.uv_layers.active=base
material=bpy.data.materials['DragonEye'];uv=material.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map=repair.name
for node in material.node_tree.nodes:
    if node.type=='TEX_IMAGE':material.node_tree.links.new(uv.outputs['UV'],node.inputs['Vector'])
    if node.type=='NORMAL_MAP':node.uv_map=repair.name
material.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.75
basis=mesh.shape_keys.key_blocks[0];key=ob.shape_key_add(name='Ashfang recessed eye globes')
for vertex in mesh.vertices:
    point=basis.data[vertex.index].co.copy();entries=[(names[g.group],g.weight) for g in vertex.groups if names[g.group] in ('Eye_l','Eye_r')]
    for name,weight in entries:
        side=name[-1];center=centers[side];sign=-1 if side=='l' else 1;target=center+(point-center)*.82+Vector((0,-sign*.045,0));point=point.lerp(target,weight)
    key.data[vertex.index].co=point
key.value=1
attr=mesh.attributes['AshfangSternalFurnace']
for vertex in mesh.vertices:
    anatomy=sum(g.weight for g in vertex.groups if names[g.group] in ('Spine01','Spine02','Neck03'))
    attr.data[vertex.index].value*=min(1,anatomy)
mat=bpy.data.materials['DragonSkin'];nodes=mat.node_tree.nodes;links=mat.node_tree.links
add=next(n for n in nodes if n.type=='VECT_MATH' and n.operation=='ADD');source_noise=add.inputs[1].links[0].from_socket
scale=nodes.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs['Scale'].default_value=.22;links.new(source_noise,scale.inputs[0]);links.new(scale.outputs[0],add.inputs[1])
for node in nodes:
    if node.type=='MATH' and node.operation=='MULTIPLY' and not node.inputs[1].is_linked and abs(node.inputs[1].default_value-9)<.01:node.inputs[1].default_value=5
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'facial-repair.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'originalUVPreserved':base.name,'eyeRepairUV':repair.name,'eyeLoopsRemapped':repaired,'eyeCenters':{s:list(c) for s,c in centers.items()},'furnaceAnatomyGate':['Spine01','Spine02','Neck03'],'ownerAccepted':False},indent=2))
