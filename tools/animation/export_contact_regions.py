"""Export source-skin semantic masks and true 3D/projected chains on CPU.

No colour sprites are redrawn. This extends the existing RLE region contract.
blender -b -t 2 --python tools/animation/export_contact_regions.py -- <source-folder> --out <folder>
A partial S/E study is deliberately labelled partial. Runtime contact retargeting
and material transforms are separate gates, not inferred from generated masks.
"""
import argparse,json,math,sys,hashlib
from pathlib import Path
import bpy,numpy as np
from bpy_extras.object_utils import world_to_camera_view
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--out',required=True);p.add_argument('--clip',default='walk');p.add_argument('--color-atlas');p.add_argument('--directions',default='S,E');p.add_argument('--chains',default='thigh.L,shin.L,foot.L;thigh.R,shin.R,foot.R');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=Path(a.source).resolve();manifest=json.loads((folder/'source-manifest.json').read_text());out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];view=bpy.data.objects['AN unanimated view']
chains=[c.split(',') for c in a.chains.split(';')];bones=[b for chain in chains for b in chain]
if any(len(c)!=3 for c in chains) or len(set(bones))!=len(bones):raise ValueError('Distinct three-bone chains required')
for chain in chains:
 for i,name in enumerate(chain):
  if name not in rig.data.bones or actor.vertex_groups.get(name) is None:raise ValueError('Missing actual source limb: '+name)
  if i and rig.data.bones[name].parent.name!=chain[i-1]:raise ValueError('Disconnected source chain: '+name)
weights=np.zeros((len(actor.data.vertices),len(bones)),dtype=np.float32)
for vertex in actor.data.vertices:
 for g in vertex.groups:
  name=actor.vertex_groups[g.group].name
  if name in bones:weights[vertex.index,bones.index(name)]+=g.weight
if np.any(weights.sum(axis=1)>1.001):raise ValueError('Source skin weights exceed unity')
materials=[];packs=math.ceil(len(bones)/3)
for pack in range(packs):
 name='AN contact weights '+str(pack);attr=actor.data.color_attributes.new(name=name,type='FLOAT_COLOR',domain='POINT')
 for i,value in enumerate(attr.data):
  v=list(weights[i,pack*3:pack*3+3]);value.color=(*v,*([0]*(3-len(v))),1)
 material=bpy.data.materials.new(name);material.use_nodes=True;tree=material.node_tree;tree.nodes.clear()
 output=tree.nodes.new('ShaderNodeOutputMaterial');shader=tree.nodes.new('ShaderNodeEmission');attribute=tree.nodes.new('ShaderNodeVertexColor');attribute.layer_name=name
 tree.links.new(attribute.outputs['Color'],shader.inputs['Color']);tree.links.new(shader.outputs[0],output.inputs['Surface']);materials.append(material)
scene.cycles.samples=4;scene.view_settings.view_transform='Raw';scene.render.image_settings.color_depth='16'
rig.animation_data.action=bpy.data.actions['AN1_'+a.clip+'_supported_v1']
directions=manifest['directions'];color_pixels=None
if a.color_atlas:
 color=bpy.data.images.load(str(Path(a.color_atlas).resolve()),check_existing=False);color.colorspace_settings.name='Non-Color'
 width,height=color.size
 packed=np.asarray(color.pixels[:],dtype=np.float32).reshape((height,width,4))[::-1].copy();bpy.data.images.remove(color)
 count=manifest['clips'][a.clip]['frames'];atlas_manifest=Path(a.color_atlas).resolve().parent/'manifest.json'
 atlas_spec=json.loads(atlas_manifest.read_text())['clips'][a.clip] if atlas_manifest.exists() else {'frames':count,'cell':96}
 crop=atlas_spec.get('crop',[0,0,96,96]);columns=atlas_spec.get('columns',count);rows=math.ceil(count/columns);tile_w,tile_h=crop[2]-crop[0],crop[3]-crop[1]
 if atlas_spec['frames']!=count or atlas_spec['cell']!=96 or width!=columns*tile_w or height!=rows*len(directions)*tile_h:raise ValueError('Color atlas dimensions do not match source frames')
 # Restore original source-cell coordinates without resampling cropped pixels.
 color_pixels=np.zeros((96*len(directions),96*count,4),dtype=np.float32)
 for row in range(len(directions)):
  for index in range(count):
   x=(index%columns)*tile_w;y=(row*rows+index//columns)*tile_h
   color_pixels[row*96+crop[1]:row*96+crop[3],index*96+crop[0]:index*96+crop[2]]=packed[y:y+tile_h,x:x+tile_w]
result={'schemaVersion':2,'canvasSize':128,'anchor':[64,88],'directions':directions,'exportedDirections':a.directions.split(','),'colorAlphaValidated':color_pixels is not None,'sourceQCOnly':True,'runtimeIntegrated':False,'sourceSignature':manifest['skeletonSignature'],'massWeights':manifest.get('massWeights',{}),'groundZMetres':manifest.get('groundZMetres',-.5),'chainBones':chains,'clips':{a.clip:{}},'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
if a.color_atlas:result['colorAtlasSha256']={a.clip:hashlib.sha256(Path(a.color_atlas).read_bytes()).hexdigest()}
result['sourceBlendSha256']=hashlib.sha256((folder/'hollow-foundation.blend').read_bytes()).hexdigest()
def runs(mask):
 r=[]
 for y,row in enumerate(mask):
  edge=np.diff(np.pad(row.astype(np.int8),(1,1)))
  r.extend([[int(y),int(x),int(end-x)] for x,end in zip(np.where(edge==1)[0],np.where(edge==-1)[0])])
 return r
for direction in result['exportedDirections']:
 if direction not in directions:raise ValueError('Unknown source facing '+direction)
 row=directions.index(direction);view.rotation_euler.z=math.atan2(-3.2,2.2)+math.pi/2+math.pi-row*math.pi/4
 frames=[]
 for frame in range(manifest['clips'][a.clip]['frames']):
  scene.frame_set(frame+1);bpy.context.view_layer.update();channels=[];alpha=None
  for pack,material in enumerate(materials):
   for slot in actor.material_slots:slot.material=material
   scene.render.filepath=str(out/f'weights-{direction}-{frame:03d}-{pack}.png');bpy.ops.render.render(write_still=True)
   image=bpy.data.images.load(scene.render.filepath,check_existing=False);image.colorspace_settings.name='Non-Color'
   values=np.asarray(image.pixels[:],dtype=np.float32).reshape((96,96,4))[::-1].copy();bpy.data.images.remove(image)
   channels.extend([values[:,:,k] for k in range(3) if pack*3+k<len(bones)]);alpha=values[:,:,3]>0
  if color_pixels is not None:
   actual_alpha=color_pixels[row*96:(row+1)*96,frame*96:(frame+1)*96,3]>0
   missing_alpha=actual_alpha&~alpha
   if np.any(missing_alpha):raise ValueError(f'Ownership sampling misses {int(missing_alpha.sum())} actual alpha pixels in {direction}/{frame}; not a complete runtime region export')
   alpha=actual_alpha
  body=np.maximum(0,1-np.sum(channels,axis=0));all_weights=np.stack([body,*channels]);masks=all_weights>=.15
  missing=alpha&(~masks.any(axis=0));dominant=all_weights.argmax(axis=0)
  for k in range(len(masks)):masks[k]|=missing&(dominant==k)
  regions={name:runs(np.pad(mask&alpha,16)) for name,mask in zip(['body',*bones],masks)}
  projected={};source={}
  for name in bones:
   b=rig.pose.bones[name];points=[]
   for point in [b.head,b.tail]:
    point=rig.matrix_world @ point;screen=world_to_camera_view(scene,scene.camera,point);points.append([screen.x*96+16,(1-screen.y)*96+16])
   projected[name]=points;source[name]={'head':list(b.head),'tail':list(b.tail),'matrix':[v for row in b.matrix for v in row]}
  def pixel(point):
   screen=world_to_camera_view(scene,scene.camera,rig.matrix_world @ point);return [screen.x*96+16,(1-screen.y)*96+16]
  from mathutils import Vector
  origin=pixel(Vector((0,0,0)));axes=[pixel(Vector(axis)) for axis in [(1,0,0),(0,1,0),(0,0,1)]]
  projection=[axes[k][0]-origin[0] for k in range(3)]+[origin[0]]+[axes[k][1]-origin[1] for k in range(3)]+[origin[1]]
  source_contacts={}
  for c in manifest.get('contactChains',[]):
   if c['end'] not in bones:continue
   pose=rig.pose.bones[c['end']];rest=rig.data.bones[c['end']]
   point=pose.matrix @ rest.matrix_local.inverted() @ Vector(c['restContactPoint'])
   patch=next((p for p in manifest.get('solePatches',{}).values() if p['bone']==c['end']),None)
   footprint=[list(pose.matrix @ rest.matrix_local.inverted() @ Vector(v)) for v in patch['restHull']] if patch else []
   planted=any(q['id']==c['id'] for q in manifest['clips'][a.clip]['samples'][frame]['contacts'])
   source_contacts[c['id']]={**c,'planted':planted,'sourceContact':list(point),'footprint':footprint,'upperLength':rig.data.bones[c['upper']].length,'lowerLength':rig.data.bones[c['middle']].length}
  mass_weights=manifest.get('massWeights',{})
  mass_center=sum(((rig.pose.bones[name].head+rig.pose.bones[name].tail)*.5*weight for name,weight in mass_weights.items()),Vector())/sum(mass_weights.values()) if mass_weights else None
  frames.append({'balance':manifest['clips'][a.clip]['samples'][frame]['balance'],'massCenter':list(mass_center) if mass_center is not None else None,'completeRegions':['body',*bones],'sourceContacts':source_contacts,'projection':projection,'regions':regions,'projectedBones':projected,'sourceBones':source,'ownershipCoverage':1.0 if np.all(masks.any(axis=0)[alpha]) else 0.0})
 result['clips'][a.clip][direction]=frames;print('CONTACT_REGIONS',direction,len(frames),flush=True)
(out/'contact-regions.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('CONTACT_REGION_OUTPUT',str(out),flush=True)
