"""Restore creator facial detail and localize furnace heat under cooled rock plates."""
import argparse,json,math,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--config',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();c=json.loads(Path(a.config).read_text())
if out.exists():raise SystemExit('Immutable output exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath)
eye=bpy.data.materials['DragonEye'];bs=eye.node_tree.nodes.get('Principled BSDF');albedo=next(n for n in eye.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith('DragonEye_Albedo'))
eye.node_tree.links.new(albedo.outputs['Color'],bs.inputs['Base Color']);eye.node_tree.links.new(albedo.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=c['eyeEmission'];bs.inputs['Roughness'].default_value=.24
wing=bpy.data.materials['DragonWing']
for node in wing.node_tree.nodes:
    if node.name.startswith('Ashfang charred source pigment'):node.inputs[2].default_value=c['membraneTint']
def furnace(point):return math.exp(-((point.x-c['furnaceCenter'][0])/c['furnaceExtent'][0])**2-((point.z-c['furnaceCenter'][1])/c['furnaceExtent'][1])**2)
for name in ('Zagmatorah','Ashfang layered anatomical plate hide'):
    ob=bpy.data.objects[name];attribute=ob.data.attributes.new('AshfangSternalFurnace','FLOAT','POINT')
    for vertex in ob.data.vertices:attribute.data[vertex.index].value=furnace(vertex.co)
bodymat=bpy.data.materials['DragonSkin'];nodes=bodymat.node_tree.nodes;links=bodymat.node_tree.links;shader=nodes.get('Principled BSDF');old=shader.inputs['Emission Strength'].links[0].from_socket
attr=nodes.new('ShaderNodeAttribute');attr.attribute_name='AshfangSternalFurnace';ramp=next(n for n in nodes if n.type=='VALTORGB')
mask=nodes.new('ShaderNodeMath');mask.operation='MULTIPLY';links.new(attr.outputs['Fac'],mask.inputs[0]);links.new(ramp.outputs[0],mask.inputs[1])
strength=nodes.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=c['bodyFurnaceStrength'];links.new(mask.outputs[0],strength.inputs[0])
add=nodes.new('ShaderNodeMath');add.operation='ADD';links.new(old,add.inputs[0]);links.new(strength.outputs[0],add.inputs[1]);links.new(add.outputs[0],shader.inputs['Emission Strength'])
# Only narrow exposed fracture sidewalls radiate; cooled top faces stay dark.
rock=bpy.data.materials['Ashfang fractured obsidian armor'];hot=rock.copy();hot.name='Ashfang recessed hot plate fractures';n=hot.node_tree.nodes;l=hot.node_tree.links;s=n.get('Principled BSDF')
s.inputs['Emission Color'].default_value=(1,.06,.002,1);a=n.new('ShaderNodeAttribute');a.attribute_name='AshfangSternalFurnace'
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=9;noise.inputs['Detail'].default_value=3
select=n.new('ShaderNodeMapRange');select.inputs['From Min'].default_value=.48;select.inputs['From Max'].default_value=.7;l.new(noise.outputs['Fac'],select.inputs['Value'])
mask=n.new('ShaderNodeMath');mask.operation='MULTIPLY';l.new(a.outputs['Fac'],mask.inputs[0]);l.new(select.outputs['Result'],mask.inputs[1])
power=n.new('ShaderNodeMath');power.operation='MULTIPLY';power.inputs[1].default_value=c['plateFissureStrength'];l.new(mask.outputs[0],power.inputs[0]);l.new(power.outputs[0],s.inputs['Emission Strength'])
armor=bpy.data.objects['Ashfang layered anatomical plate hide'];armor.data.materials.append(hot)
for polygon in armor.data.polygons:
    local=polygon.index%13
    if local<12 and local%2==1:polygon.material_index=1
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'identity-polish.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'parameters':c,'originalEyeTextureRestored':True,'ownerAccepted':False},indent=2))
