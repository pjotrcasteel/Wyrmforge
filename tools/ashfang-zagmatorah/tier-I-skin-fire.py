"""Tier I skin and optional fire only. Approved professional anatomy is immutable."""
import argparse,hashlib,json,math,random,struct,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--config',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();c=json.loads(Path(a.config).read_text())
if out.exists():raise SystemExit('Immutable revision exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton']
def geometry_hash():
 h=hashlib.sha256()
 for v in body.data.vertices:h.update(struct.pack('<3f',*v.co))
 for p in body.data.polygons:h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
 return h.hexdigest()
before=geometry_hash();bones_before=len(rig.data.bones);rig.data.pose_position='REST';bpy.context.view_layer.update()
textures=out.parent/'M0-001/original/download/textures'
def image(name,noncolor=False):
 path=textures/name
 if not path.is_file():raise RuntimeError('Missing preserved texture '+str(path))
 im=bpy.data.images.load(str(path),check_existing=True)
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
vent_specs=[(-.90,-.24,'Spine01'),(1.25,.24,'Spine02')]
evalbody=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evalbody.to_mesh();bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[p.vertices for p in mesh.polygons]);vents=[]
for x,y,bone in vent_specs:
 hit,normal,index,dist=bvh.ray_cast(Vector((x,y,8)),Vector((0,0,-1)),10)
 if hit is None:raise RuntimeError('Vent anchor missed body')
 vents.append((hit,bone))
evalbody.to_mesh_clear()
attr=body.data.attributes.new('Ashfang Tier I vent heat','FLOAT','POINT')
for v in body.data.vertices:attr.data[v.index].value=max(math.exp(-((v.co-point).length/.32)**2) for point,bone in vents)
for slot in body.material_slots:
 old=slot.material
 if old.name not in ('DragonSkin','DragonWing'):continue
 old.use_fake_user=True;material=old.copy();kind='body' if old.name=='DragonSkin' else 'wing';material.name='Ashfang Tier I '+kind+' source scales';slot.material=material
 n=material.node_tree.nodes;l=material.node_tree.links;bs=next(node for node in n if node.type=='BSDF_PRINCIPLED');base=bs.inputs['Base Color'].links[0].from_socket
 hue=n.new('ShaderNodeHueSaturation');hue.label='Retain original painted scale variation';hue.inputs['Value'].default_value=c['bodyValue'] if kind=='body' else c['wingValue'];hue.inputs['Saturation'].default_value=c['bodySaturation'] if kind=='body' else c['wingSaturation'];l.new(base,hue.inputs['Color'])
 tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=c['bodyTint'] if kind=='body' else c['wingTint'];l.new(hue.outputs[0],tint.inputs[1])
 prefix='DragonSkin' if kind=='body' else 'DragonWing';ao=n.new('ShaderNodeTexImage');ao.image=image(prefix+'_AO.png',True)
 detail=n.new('ShaderNodeMixRGB');detail.blend_type='MULTIPLY';detail.inputs[0].default_value=c['aoInfluence'];l.new(tint.outputs[0],detail.inputs[1]);l.new(ao.outputs['Color'],detail.inputs[2]);l.new(detail.outputs[0],bs.inputs['Base Color'])
 metallic=n.new('ShaderNodeTexImage');metallic.image=image(prefix+'_Metalic.png',True);l.new(metallic.outputs['Color'],bs.inputs['Metallic'])
 for node in n:
  if node.type=='TEX_IMAGE' and node.image and any(word in node.image.name for word in ('Normal','Roughness','Opacity')):node.image.colorspace_settings.name='Non-Color'
 if kind=='body':
  invert=n.new('ShaderNodeMath');invert.operation='SUBTRACT';invert.inputs[0].default_value=1;l.new(ao.outputs['Color'],invert.inputs[1])
  contrast=n.new('ShaderNodeMath');contrast.operation='POWER';contrast.inputs[1].default_value=2.5;l.new(invert.outputs[0],contrast.inputs[0])
  local=n.new('ShaderNodeAttribute');local.attribute_name=attr.name
  mask=n.new('ShaderNodeMath');mask.operation='MULTIPLY';l.new(local.outputs['Fac'],mask.inputs[0]);l.new(contrast.outputs[0],mask.inputs[1])
  power=n.new('ShaderNodeMath');power.operation='MULTIPLY';power.inputs[1].default_value=c['localHeatStrength'];l.new(mask.outputs[0],power.inputs[0]);l.new(power.outputs[0],bs.inputs['Emission Strength']);bs.inputs['Emission Color'].default_value=(1,.075,.003,1)
# Optional effects occupy a separate collection and never replace anatomy.
fx=bpy.data.collections.new('Ashfang Tier I optional body fire');bpy.context.scene.collection.children.link(fx);fx.hide_render=not c['fireEnabled']
def move_to_fx(ob):
 for collection in list(ob.users_collection):collection.objects.unlink(ob)
 fx.objects.link(ob)
def bind(ob,bone):
 group=ob.vertex_groups.new(name=bone);group.add(list(range(len(ob.data.vertices))),1,'REPLACE');modifier=ob.modifiers.new('Follow preserved skeleton','ARMATURE');modifier.object=rig
flame=bpy.data.materials.new('Ashfang Tier I wispy fire volume');flame.use_nodes=True;n=flame.node_tree.nodes;n.clear();l=flame.node_tree.links
output=n.new('ShaderNodeOutputMaterial');volume=n.new('ShaderNodeVolumePrincipled');volume.inputs['Color'].default_value=(.15,.025,.005,1);volume.inputs['Blackbody Intensity'].default_value=0
tex=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.noise_dimensions='4D';noise.inputs['Scale'].default_value=4.5;noise.inputs['Detail'].default_value=3;l.new(tex.outputs['Generated'],noise.inputs['Vector']);noise.inputs['W'].driver_add('default_value').driver.expression='frame * 0.035'
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.42;ramp.color_ramp.elements[1].position=.67;l.new(noise.outputs['Fac'],ramp.inputs[0])
separate=n.new('ShaderNodeSeparateXYZ');l.new(tex.outputs['Generated'],separate.inputs[0]);fade=n.new('ShaderNodeMath');fade.operation='SUBTRACT';fade.inputs[0].default_value=1;l.new(separate.outputs['Z'],fade.inputs[1])
field=n.new('ShaderNodeMath');field.operation='MULTIPLY';l.new(ramp.outputs[0],field.inputs[0]);l.new(fade.outputs[0],field.inputs[1])
density=n.new('ShaderNodeMath');density.operation='MULTIPLY';density.inputs[1].default_value=4;l.new(field.outputs[0],density.inputs[0]);l.new(density.outputs[0],volume.inputs['Density'])
emission=n.new('ShaderNodeMath');emission.operation='MULTIPLY';emission.inputs[1].default_value=c['flameEmission'];l.new(field.outputs[0],emission.inputs[0]);l.new(emission.outputs[0],volume.inputs['Emission Strength'])
blackbody=n.new('ShaderNodeBlackbody');blackbody.inputs[0].default_value=1950;l.new(blackbody.outputs[0],volume.inputs['Emission Color']);l.new(volume.outputs[0],output.inputs['Volume'])
for number,(point,bone) in enumerate(vents):
 vs=[];fs=[];sides=16;rings=7
 for i in range(rings):
  t=i/(rings-1);center=point+Vector((.14*t*t,.03*math.sin(t*4),c['flameHeight']*t-.03));radius=c['flameWidth']*(1-t)**.8+.002
  for j in range(sides):angle=j*math.tau/sides;vs.append(center+Vector((math.cos(angle)*radius,math.sin(angle)*radius,0)))
 for i in range(rings-1):
  for j in range(sides):k=(j+1)%sides;fs.append((i*sides+j,i*sides+k,(i+1)*sides+k,(i+1)*sides+j))
 fs.extend([tuple(reversed(range(sides))),tuple((rings-1)*sides+j for j in range(sides))]);me=bpy.data.meshes.new('Small flame volume domain');me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new('Tier I small vent flame '+str(number+1),me);fx.objects.link(ob);me.materials.append(flame);bind(ob,bone)
ember=bpy.data.materials.new('Small cinder emission');ember.use_nodes=True;shader=ember.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.3,.025,.002,1);shader.inputs['Emission Color'].default_value=(1,.12,.003,1);shader.inputs['Emission Strength'].default_value=3
random.seed(741)
for i in range(c['emberCount']):
 point,bone=vents[i%len(vents)];position=point+Vector((random.uniform(-.13,.22),random.uniform(-.14,.14),random.uniform(.18,.85)))
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.006,.013),location=position);ob=bpy.context.object;ob.name='Tier I drifting cinder '+str(i+1);bpy.ops.object.transform_apply(location=True,rotation=False,scale=True);move_to_fx(ob);ob.data.materials.append(ember);bind(ob,bone)
# Store portable references to the existing preserved archive instead of repacking it.
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if not (textures/name).is_file():raise RuntimeError('Cannot preserve image '+name)
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
if geometry_hash()!=before or len(rig.data.bones)!=bones_before:raise RuntimeError('Approved anatomy changed')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-tier-I-working.blend'),compress=True,relative_remap=False)
(out/'production.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-tier-I-working.blend'),'approvedBodyGeometrySha256':before,'resultBodyGeometrySha256':geometry_hash(),'anatomyUnchanged':True,'bones':bones_before,'originalUVsUnchanged':True,'fireCollection':fx.name,'ventAnchors':[{'point':list(p),'bone':b} for p,b in vents],'parameters':c,'ownerAcceptedAnatomy':True,'ownerAcceptedMaterials':False,'effectsMotion':'Procedural volume noise only; no creature motion claimed'},indent=2))
print('TIER_I_SOURCE_PRESERVED',before)
