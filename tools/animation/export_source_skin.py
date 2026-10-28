"""Export the saved source skin and compact whole-body pose surface.

Actual UVs/weights/geometry, not inferred normals or deformed PNG cards. Optional
LOD remains a candidate until native image/skin/performance comparison passes.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True)
p.add_argument('--triangles',type=int,default=0);p.add_argument('--emission-attribute')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
m=json.loads((a.source/'source-manifest.json').read_text());blend=a.source/'hollow-foundation.blend'
bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
r=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];scene=bpy.context.scene
bones=list(r.data.bones);lookup={bone.name:i for i,bone in enumerate(bones)}
def column_major(matrix):return [round(matrix[row][col],8) for col in range(4) for row in range(4)]
def transform(matrix):
 loc,rot,scale=matrix.decompose()
 if not all(math.isfinite(v) and v>0 for v in scale):raise ValueError('Source skin pose has singular/reflected bone scaling')
 # Preserve the actual tiny bind-width scale rather than silently normalizing
 # it away. Fixed segment lengths remain independently checked on saved skin.
 return [*[round(v,8) for v in loc],*[round(v,8) for v in [rot.x,rot.y,rot.z,rot.w]],*[round(v,8) for v in scale]]
rig=[]
for bone in bones:
 local=bone.parent.matrix_local.inverted() @ bone.matrix_local if bone.parent else bone.matrix_local
 rig.append({'id':bone.name,'parent':lookup[bone.parent.name] if bone.parent else -1,'length':bone.length,'rest':column_major(bone.matrix_local),'local':transform(local)})
clips={}
for name,clip in m['clips'].items():
 r.animation_data.action=bpy.data.actions['AN1_'+name+'_supported_v1'];poses=[]
 for index in range(clip['frames']):
  scene.frame_set(index+1);bpy.context.view_layer.update();pose=[]
  for bone in bones:
   current=r.pose.bones[bone.name];local=current.parent.matrix.inverted() @ current.matrix if current.parent else current.matrix
   pose.extend(transform(local))
  poses.append(pose)
 clips[name]={'frames':clip['frames'],'fps':clip['fps'],'poseGrid':clip.get('poseGrid'),'poses':poses}
contacts=[]
for chain in m['contactChains']:
 patch=next(patch for patch in m['solePatches'].values() if patch['bone']==chain['end'])
 contacts.append({**chain,'restHull':patch['restHull'],'upperLength':r.data.bones[chain['upper']].length,'lowerLength':r.data.bones[chain['middle']].length})
surface={'version':1,'sourceSignature':m['skeletonSignature'],'sourceBlendSha256':hashlib.sha256(blend.read_bytes()).hexdigest(),
 'rootBone':'root','bodyBone':'pelvis','transformStride':10,'bones':rig,'massWeights':m['massWeights'],'contacts':contacts,'contactCycles':m.get('contactCycles',[]),
 'minimumSupportMarginMetres':m['minimumSupportMarginMetres'],'groundZMetres':m['groundZMetres'],'unitsPerPixel':m['unitsPerPixel'],
 'authoringEnvelope':{'maxContactExcursion':m['clips']['walk']['strideMetres'],'maxBodyTranslation':m['clips']['walk']['strideMetres']/2},
 'strideMetres':m['clips']['walk']['strideMetres'],'projectionByDirection':m['projectionByDirection'],'clips':clips,
 'candidateNotApproved':True,'runtimeAccepted':False}
(a.out/'poses.json').write_text(json.dumps(surface,separators=(',',':'))+'\n')
# Export the original rest skin, or an explicit independently reviewable LOD.
r.animation_data_clear();r.data.pose_position='REST';bpy.context.view_layer.update()
geometry=actor.copy();geometry.data=actor.data.copy();geometry.name='AN source skin candidate';scene.collection.objects.link(geometry)
actor.hide_render=True;bpy.context.view_layer.objects.active=geometry
if a.triangles:
 if a.triangles<64:raise ValueError('LOD target must be at least 64 triangles')
 geometry.data.calc_loop_triangles();original_count=len(geometry.data.loop_triangles)
 modifier=geometry.modifiers.new('AN explicit source LOD candidate','DECIMATE');modifier.ratio=min(1,a.triangles/original_count);modifier.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=modifier.name)
mesh=geometry.data;mesh.calc_loop_triangles();to_rig=r.matrix_world.inverted() @ geometry.matrix_world;normal_matrix=to_rig.to_3x3().inverted().transposed()
if len(mesh.materials)!=1:raise ValueError('This bounded exporter requires one source material surface')
material=mesh.materials[0];image_node=next(n for n in material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
image=image_node.image
texture=a.out/'albedo.png'
if image.packed_file and bytes(image.packed_file.data)[:8]==b'\x89PNG\r\n\x1a\n':texture.write_bytes(bytes(image.packed_file.data))
else:
 image.filepath_raw=str(texture.resolve());image.file_format='PNG';image.save()
emission=mesh.attributes.get(a.emission_attribute) if a.emission_attribute else None
if a.emission_attribute and (not emission or emission.domain!='POINT'):raise ValueError('Actual source point emission attribute required')
if not mesh.uv_layers.active:raise ValueError('Actual source UV coordinates required')
uv=mesh.uv_layers.active.data;vertices=[];normals=[];uvs=[];indices=[];skin_indices=[];skin_weights=[];skin_indices2=[];skin_weights2=[];emissions=[];dedup={};max_discarded=0
for triangle in mesh.loop_triangles:
 for loop_index in triangle.loops:
  vertex_index=mesh.loops[loop_index].vertex_index;vertex=mesh.vertices[vertex_index];normal=(normal_matrix @ mesh.corner_normals[loop_index].vector).normalized();texcoord=uv[loop_index].uv
  key=(vertex_index,*[round(v,8) for v in texcoord],*[round(v,8) for v in normal])
  if key not in dedup:
   weights=sorted([(lookup[geometry.vertex_groups[g.group].name],g.weight) for g in vertex.groups if geometry.vertex_groups[g.group].name in lookup and g.weight>0],key=lambda v:-v[1])
   discarded=sum(v for _,v in weights[8:]);max_discarded=max(max_discarded,discarded)
   if discarded>1e-6 or not weights:raise ValueError(f'Source skin has unsupported/missing deformation influences at {vertex_index}: discarded={discarded}, weights={weights}')
   weights=weights[:8];total=sum(v for _,v in weights);padded=weights+[(0,0)]*(8-len(weights))
   dedup[key]=len(vertices)//3;vertices.extend(to_rig @ vertex.co);normals.extend(normal);uvs.extend(texcoord)
   skin_indices.extend(i for i,_ in padded[:4]);skin_weights.extend(v/total for _,v in padded[:4]);skin_indices2.extend(i for i,_ in padded[4:]);skin_weights2.extend(v/total for _,v in padded[4:]);emissions.append(emission.data[vertex_index].value if emission else 0)
  indices.append(dedup[key])
binary=bytearray();attributes={}
for name,values,format,size in [('position',vertices,'f',3),('normal',normals,'f',3),('uv',uvs,'f',2),('skinIndex',skin_indices,'H',4),('skinWeight',skin_weights,'f',4),('skinIndex2',skin_indices2,'H',4),('skinWeight2',skin_weights2,'f',4),('sourceEmission',emissions,'f',1),('index',indices,'I',1)]:
 while len(binary)%4:binary.append(0)
 payload=struct.pack('<'+format*len(values),*values);attributes[name]={'offset':len(binary),'bytes':len(payload),'component':format,'itemSize':size,'count':len(values)//size};binary.extend(payload)
(a.out/'skin.bin').write_bytes(binary)
def srgb(n):return 12.92*n if n<=.0031308 else 1.055*n**(1/2.4)-.055
emitter=next((n for n in material.node_tree.nodes if n.type=='EMISSION'),None)
colour=emitter.inputs['Color'].default_value[:3] if emitter else [0,0,0]
strength=next((n.inputs[1].default_value for n in material.node_tree.nodes if n.type=='MATH' and n.operation=='MULTIPLY' and not n.inputs[1].is_linked),0)
manifest={'version':1,'sourceSignature':m['skeletonSignature'],'sourceBlendSha256':surface['sourceBlendSha256'],'buffer':'skin.bin','bufferSha256':hashlib.sha256(binary).hexdigest(),'attributes':attributes,
 'poses':'poses.json','posesSha256':hashlib.sha256((a.out/'poses.json').read_bytes()).hexdigest(),'albedo':'albedo.png','albedoSha256':hashlib.sha256(texture.read_bytes()).hexdigest(),'albedoSize':list(image.size),
 'vertices':len(vertices)//3,'triangles':len(indices)//3,'influenceSets':2,'flatShading':all(not poly.use_smooth for poly in mesh.polygons),'maxDiscardedSkinWeight':max_discarded,
 'emission':'#'+''.join(f'{round(max(0,min(1,srgb(v)))*255):02x}' for v in colour),'emissionIntensity':strength,'sourceUnits':'metres','candidateNotApproved':True,'runtimeAccepted':False}
(a.out/'skin.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str((a.out/'source-skin-lod.blend').resolve()))
print('SOURCE_SKIN_EXPORT',json.dumps(manifest),flush=True)
