"""Anatomy-locked Tier I Ashfang: clean PBR volcanic skin, no flame/smoke geometry."""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise RuntimeError('Revision already exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton'];rig.data.pose_position='REST'
def geometry_hash():
 h=hashlib.sha256()
 for v in body.data.vertices:h.update(struct.pack('<3f',*v.co))
 for p in body.data.polygons:h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
 return h.hexdigest()
before=geometry_hash();assert before=='9b9d87decdf1034d5e72e06114fdde7d7e1995e8c64a360549bc34f44d046ed3'
textures=out.parent/'M0-001/original/download/textures'
rest=body.data.attributes.new('Ashfang rest position','FLOAT_VECTOR','POINT');heat=body.data.attributes.new('Ashfang subscale heat','FLOAT','POINT')
for v in body.data.vertices:
 rest.data[v.index].vector=v.co;x,y,z=v.co
 # Broad, uneven warmth under the throat, shoulder and rib cage. No new geometry.
 neck=math.exp(-((x+2.25)/1.35)**2-((z-2.75)/.62)**2-(y/.62)**2)
 ribs=math.exp(-((x-.1)/1.8)**2-((z-2.5)/.95)**2-(y/1.0)**2)
 cheek=math.exp(-((x+3.75)/.55)**2-((z-2.95)/.3)**2-(y/.5)**2)
 heat.data[v.index].value=min(1,max(neck*.9,ribs,cheek*.65))
for slot in body.material_slots:
 old=slot.material
 if old.name not in ('DragonSkin','DragonWing'):continue
 old.use_fake_user=True;wing=old.name=='DragonWing';prefix='DragonWing' if wing else 'DragonSkin'
 mat=bpy.data.materials.new('Ashfang '+('scorched oxblood membrane' if wing else 'volcanic charcoal scales'));mat.use_nodes=True;slot.material=mat;n=mat.node_tree.nodes;n.clear();l=mat.node_tree.links
 def node(t,name):
  v=n.new(t);v.label=name;return v
 def link(a,b):l.new(a,b)
 def tex(s,noncolor=False):
  v=node('ShaderNodeTexImage',s);v.image=bpy.data.images.load(str(textures/(prefix+'_'+s+'.png')),check_existing=True)
  v.image.colorspace_settings.name='Non-Color' if noncolor else 'sRGB';return v.outputs['Color']
 def mathnode(op,a,b=None):
  v=node('ShaderNodeMath',op);v.operation=op
  if isinstance(a,(float,int)):v.inputs[0].default_value=a
  else:link(a,v.inputs[0])
  if b is not None:
   if isinstance(b,(float,int)):v.inputs[1].default_value=b
   else:link(b,v.inputs[1])
  return v.outputs[0]
 def ramp(inp,stops):
  v=node('ShaderNodeValToRGB','Authored volcanic palette');r=v.color_ramp
  r.elements.remove(r.elements[1]);r.elements[0].position=stops[0][0];r.elements[0].color=stops[0][1]
  for pos,color in stops[1:]:e=r.elements.new(pos);e.color=color
  link(inp,v.inputs[0]);return v.outputs['Color']
 output=node('ShaderNodeOutputMaterial','Character surface only');bs=node('ShaderNodeBsdfPrincipled','Clean dielectric skin');link(bs.outputs[0],output.inputs['Surface']);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.66;bs.inputs['Specular IOR Level'].default_value=.16
 albedo=tex('Albedo');grey=node('ShaderNodeRGBToBW','Original painted variation');link(albedo,grey.inputs[0]);ao=tex('AO',True)
 if wing:
  color=ramp(grey.outputs[0],[(.025,(.012,.001,.0005,1)),(.18,(.09,.008,.002,1)),(.45,(.24,.04,.009,1)),(.8,(.32,.075,.025,1))])
 else:
  color=ramp(grey.outputs[0],[(.02,(.004,.005,.006,1)),(.18,(.012,.014,.016,1)),(.4,(.04,.036,.03,1)),(.75,(.09,.075,.055,1))])
 multiply=node('ShaderNodeMixRGB','Source cavity shading');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=.65;link(color,multiply.inputs[1]);link(ao,multiply.inputs[2]);link(multiply.outputs[0],bs.inputs['Base Color'])
 normal=node('ShaderNodeNormalMap','Preserved sculpted scales and creases');normal.inputs['Strength'].default_value=1;link(tex('Normal',True),normal.inputs['Color'])
 rough=tex('Roughness',True);link(mathnode('MAXIMUM',rough,.58 if wing else .62),bs.inputs['Roughness'])
 if wing:
  link(tex('Opacity',True),bs.inputs['Alpha']);link(normal.outputs['Normal'],bs.inputs['Normal'])
 else:
  coord=node('ShaderNodeAttribute','Stable rest coordinates');coord.attribute_name=rest.name
  noise=node('ShaderNodeTexNoise','Uneven scale field');noise.inputs['Scale'].default_value=3.1;noise.inputs['Detail'].default_value=3.5;link(coord.outputs['Vector'],noise.inputs['Vector'])
  warp=node('ShaderNodeVectorMath','Warp fine scales');warp.operation='SCALE';warp.inputs['Scale'].default_value=.16;link(noise.outputs['Color'],warp.inputs[0])
  add=node('ShaderNodeVectorMath','Organic scale coordinates');add.operation='ADD';link(coord.outputs['Vector'],add.inputs[0]);link(warp.outputs['Vector'],add.inputs[1])
  cells=node('ShaderNodeTexVoronoi','Fine fractured scales');cells.feature='DISTANCE_TO_EDGE';cells.inputs['Scale'].default_value=8.5;link(add.outputs[0],cells.inputs['Vector'])
  bump=node('ShaderNodeBump','Subtle scale relief');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.025;link(cells.outputs['Distance'],bump.inputs['Height']);link(normal.outputs['Normal'],bump.inputs['Normal']);link(bump.outputs['Normal'],bs.inputs['Normal'])
  cracks=ramp(cells.outputs['Distance'],[(.008,(1,1,1,1)),(.035,(0,0,0,1))])
  patch=ramp(noise.outputs['Fac'],[(.43,(0,0,0,1)),(.68,(1,1,1,1))])
  region=node('ShaderNodeAttribute','Heat under existing neck and chest');region.attribute_name=heat.name
  edgeheat=mathnode('MULTIPLY',cracks,patch);edgeheat=mathnode('MULTIPLY',edgeheat,region.outputs['Fac'])
  cavity=mathnode('POWER',mathnode('SUBTRACT',1,ao),2.2);cavity=mathnode('MULTIPLY',cavity,region.outputs['Fac'])
  strength=mathnode('MAXIMUM',edgeheat,mathnode('MULTIPLY',cavity,.55));link(mathnode('MULTIPLY',strength,3.5),bs.inputs['Emission Strength']);bs.inputs['Emission Color'].default_value=(1,.065,.002,1)
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if not (textures/name).is_file():raise RuntimeError('Missing source '+name)
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
bpy.context.view_layer.material_override=None
assert geometry_hash()==before and len(rig.data.bones)==112
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-tier-I-working.blend'),compress=True,relative_remap=False)
(out/'production.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-tier-I-working.blend'),'approvedBodyGeometrySha256':before,'resultBodyGeometrySha256':geometry_hash(),'anatomyUnchanged':True,'bones':112,'originalUVsUnchanged':True,'fireAndSmoke':'Runtime VFX only; no character effects objects','ownerAcceptedAnatomy':True,'ownerAcceptedMaterials':False,'materialIntent':'Dielectric charcoal scales, scorched oxblood membranes, selective subscale ember fissures'},indent=2))
