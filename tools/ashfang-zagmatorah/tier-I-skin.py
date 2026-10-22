"""Skin-only Ashfang. Approved professional anatomy is immutable; effects belong in game."""
import argparse,hashlib,json,math,random,struct,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--config',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();c=json.loads(Path(a.config).read_text())
if out.exists():raise SystemExit('Immutable revision exists')
out.mkdir(parents=True);bpy.context.view_layer.material_override=None;source=Path(bpy.data.filepath);body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton']
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
 bs.inputs['Weight'].default_value=1.0
 hue=n.new('ShaderNodeHueSaturation');hue.label='Retain original painted scale variation';hue.inputs['Value'].default_value=c['bodyValue'] if kind=='body' else c['wingValue'];hue.inputs['Saturation'].default_value=c['bodySaturation'] if kind=='body' else c['wingSaturation'];l.new(base,hue.inputs['Color'])
 tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=c['bodyTint'] if kind=='body' else c['wingTint'];l.new(hue.outputs[0],tint.inputs[1])
 prefix='DragonSkin' if kind=='body' else 'DragonWing';ao=n.new('ShaderNodeTexImage');ao.image=image(prefix+'_AO.png',True)
 if kind=='body' and 'bodySpecular' in c:
  bs.inputs['Specular IOR Level'].default_value=c['bodySpecular']
  rough=bs.inputs['Roughness'].links[0].from_socket
  floor=n.new('ShaderNodeMath');floor.operation='MAXIMUM';floor.inputs[1].default_value=c['bodyRoughnessFloor'];l.new(rough,floor.inputs[0]);l.new(floor.outputs[0],bs.inputs['Roughness'])
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
# Store portable references to the existing preserved archive instead of repacking it.
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if not (textures/name).is_file():raise RuntimeError('Cannot preserve image '+name)
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
if geometry_hash()!=before or len(rig.data.bones)!=bones_before:raise RuntimeError('Approved anatomy changed')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-tier-I-working.blend'),compress=True,relative_remap=False)
(out/'production.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-tier-I-working.blend'),'approvedBodyGeometrySha256':before,'resultBodyGeometrySha256':geometry_hash(),'anatomyUnchanged':True,'bones':bones_before,'originalUVsUnchanged':True,'fireCollection':None,'fireAndSmoke':'Runtime VFX only; absent from character','ventAnchors':[{'point':list(p),'bone':b} for p,b in vents],'parameters':c,'ownerAcceptedAnatomy':True,'ownerAcceptedMaterials':False,'effectsMotion':'No effects or creature motion authored'},indent=2))
print('TIER_I_SOURCE_PRESERVED',before)
