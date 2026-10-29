"""Export the saved source skin and compact whole-body pose surface.

Actual UVs/weights/geometry, not inferred normals or deformed PNG cards. Optional
LOD remains a candidate until native image/skin/performance comparison passes.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from runtime_profile import build_runtime_profile

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True)
p.add_argument('--triangles',type=int,default=0);p.add_argument('--emission-attribute');p.add_argument('--protect-groups',default='',help='Explicit source anatomy to exclude from edge collapse; may exceed triangle target.')
p.add_argument('--load-ramp-fraction',type=float,default=0,help='Authored contact load-transfer ramp, in gait cycles; 0 retains unweighted support.')
p.add_argument('--lateral-stride-metres',type=float,default=0,help='Authored side-step distance per cycle; 0 uses the forward source stride.')
p.add_argument('--guide-poses',action='store_true',help='Export the saved pre-balance guide actions; runtime full-body support solve is mandatory.')
p.add_argument('--orientation-warp-degrees',type=float,default=0,help='Authored pelvis/upper-chain orientation allowance; 0 disables the shared whole-body orientation warp.')
p.add_argument('--balance-joint-degrees',type=float,default=0,help='Authored spine balance allowance after leg/body projection; 0 disables it.')
p.add_argument('--middle-ground-clearance-metres',type=float,default=0,help='Authored finite knee/elbow skin-envelope clearance over the ground, without changing lengths or planted soles.')
p.add_argument('--protect-contact-surfaces',action='store_true',help='Exclude actual source contact patches and their one-native-pixel guard band from LOD edge collapse.')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
if not math.isfinite(a.middle_ground_clearance_metres) or not 0<=a.middle_ground_clearance_metres<=.25:p.error('Middle clearance must be within 0..0.25 metres')
if not math.isfinite(a.load_ramp_fraction) or not 0<=a.load_ramp_fraction<=.5:p.error('load ramp must be finite and within 0..0.5 cycles')
if not math.isfinite(a.lateral_stride_metres) or a.lateral_stride_metres<0:p.error('lateral stride must be finite and nonnegative')
if not math.isfinite(a.orientation_warp_degrees) or not 0<=a.orientation_warp_degrees<=90:p.error('orientation allowance must be within 0..90 degrees')
if a.orientation_warp_degrees and not a.guide_poses:p.error('orientation warp requires explicit editable guide actions')
if not math.isfinite(a.balance_joint_degrees) or not 0<=a.balance_joint_degrees<=15:p.error('balance allowance must be within 0..15 degrees')
m=json.loads((a.source/'source-manifest.json').read_text());blend=a.source/'hollow-foundation.blend'
bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
r=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];scene=bpy.context.scene
modifiers=[modifier for modifier in actor.modifiers if modifier.type=='ARMATURE']
if len(modifiers)!=1 or modifiers[0].object!=r or not modifiers[0].use_vertex_groups or modifiers[0].use_bone_envelopes or modifiers[0].use_multi_modifier or modifiers[0].vertex_group:raise ValueError('One unmasked vertex-group source armature modifier required')
skinning_mode='dual-quaternion' if modifiers[0].use_deform_preserve_volume else 'linear'
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
 r.animation_data.action=bpy.data.actions[clip['guideAction'] if a.guide_poses else 'AN1_'+name+'_supported_v1'];poses=[];yaws={c['id']:[] for c in m['contactChains']}
 for index in range(clip['frames']):
  scene.frame_set(index+1);bpy.context.view_layer.update();pose=[]
  for bone in bones:
   current=r.pose.bones[bone.name];local=current.parent.matrix.inverted() @ current.matrix if current.parent else current.matrix
   pose.extend(transform(local))
  poses.append(pose)
  for c in m['contactChains']:
   rotation=r.pose.bones[c['end']].matrix @ r.data.bones[c['end']].matrix_local.inverted()
   if max(abs(rotation[2][0]),abs(rotation[2][1]),abs(rotation[0][2]),abs(rotation[1][2]),abs(rotation[2][2]-1))>1e-5:raise ValueError('Ground-yaw support export requires flat source contact orientation')
   yaws[c['id']].append(round(math.atan2(rotation[1][0],rotation[0][0]),8))
 clips[name]={'frames':clip['frames'],'fps':clip['fps'],'poseGrid':clip.get('poseGrid'),'poses':poses,'contactYaws':yaws}
contacts=[]
for chain in m['contactChains']:
 patch=next(patch for patch in m['solePatches'].values() if patch['bone']==chain['end'])
 contacts.append({**chain,**({'minimumMiddleGroundClearance':a.middle_ground_clearance_metres} if a.middle_ground_clearance_metres else {}),'orientationMode':'ground-yaw','restHull':patch['restHull'],'upperLength':r.data.bones[chain['upper']].length,'lowerLength':r.data.bones[chain['middle']].length})
surface={'version':1,'skinningMode':skinning_mode,'sourceSignature':m['skeletonSignature'],'sourceBlendSha256':hashlib.sha256(blend.read_bytes()).hexdigest(),
 'rootBone':'root','bodyBone':'pelvis','transformStride':10,'bones':rig,'massWeights':m['massWeights'],'contacts':contacts,'contactCycles':m.get('contactCycles',[]),
 'minimumSupportMarginMetres':m['minimumSupportMarginMetres'],'groundZMetres':m['groundZMetres'],'unitsPerPixel':m['unitsPerPixel'],
 'authoringEnvelope':{'maxContactExcursion':m['clips']['walk']['strideMetres'],'maxBodyTranslation':m['clips']['walk']['strideMetres']/2},
 'strideMetres':m['clips']['walk']['strideMetres'],'projectionByDirection':m['projectionByDirection'],'clips':clips,
 'candidateNotApproved':True,'runtimeAccepted':False}
if a.load_ramp_fraction:
 for c in surface['contactCycles']:c['loadRampFraction']=a.load_ramp_fraction
if a.lateral_stride_metres:surface['strideMetresByAxis']=[a.lateral_stride_metres,surface['strideMetres']]
surface['guidePoses']=a.guide_poses
surface['worldUnitsPerMetre']=93/1.55
if a.orientation_warp_degrees:surface['orientationWarp']={'lowerRoot':'pelvis','upperChain':[{'bone':'spine','weight':.5},{'bone':'chest','weight':.5}],'maxYawRadians':math.radians(a.orientation_warp_degrees),'maxRadiansPerCycle':2*math.pi}
if a.balance_joint_degrees:surface['balanceJoint']={'bone':'spine','maxRadians':math.radians(a.balance_joint_degrees)}
(a.out/'poses.json').write_text(json.dumps(surface,separators=(',',':'))+'\n')
# Export the original rest skin, or an explicit independently reviewable LOD.
r.animation_data_clear();r.data.pose_position='REST';bpy.context.view_layer.update()
geometry=actor.copy();geometry.data=actor.data.copy();geometry.name='AN source skin candidate';scene.collection.objects.link(geometry)
actor.hide_render=True;bpy.context.view_layer.objects.active=geometry
if a.triangles:
 if a.triangles<64:raise ValueError('LOD target must be at least 64 triangles')
 geometry.data.calc_loop_triangles();original_count=len(geometry.data.loop_triangles)
 modifier=geometry.modifiers.new('AN explicit source LOD candidate','DECIMATE');modifier.ratio=min(1,a.triangles/original_count);modifier.use_collapse_triangulate=True
 if a.protect_groups or a.protect_contact_surfaces:
  protected=a.protect_groups.split(',') if a.protect_groups else []
  if any(geometry.vertex_groups.get(name) is None for name in protected):raise ValueError('Protected anatomy group is absent')
  group=geometry.vertex_groups.new(name='AN permitted LOD reduction');group.add(list(range(len(geometry.data.vertices))),1,'REPLACE')
  vertices=[vertex.index for vertex in geometry.data.vertices if any(geometry.vertex_groups[g.group].name in protected and g.weight>=.5 for g in vertex.groups)]
  if a.protect_contact_surfaces:
   to_rig=r.matrix_world.inverted() @ geometry.matrix_world
   limits={patch['bone']:patch['minimumRestZ']+m['unitsPerPixel'] for patch in m['solePatches'].values()}
   vertices.extend(vertex.index for vertex in geometry.data.vertices if any(geometry.vertex_groups[g.group].name in limits and g.weight>=.5 and (to_rig @ vertex.co).z<=limits[geometry.vertex_groups[g.group].name] for g in vertex.groups))
   vertices.extend(index for patch in m['solePatches'].values() for index in patch['vertexIndices'])
  vertices=sorted(set(vertices))
  group.add(vertices,0,'REPLACE');modifier.vertex_group=group.name;modifier.vertex_group_factor=1
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
weights_by_vertex=[sorted([(lookup[geometry.vertex_groups[g.group].name],g.weight) for g in vertex.groups if geometry.vertex_groups[g.group].name in lookup and g.weight>0],key=lambda v:-v[1]) for vertex in mesh.vertices]
influence_sets=math.ceil(max(map(len,weights_by_vertex))/4)
if not 1<=influence_sets<=4:raise ValueError('Source skin requires more than the bounded sixteen influence channels')
uv=mesh.uv_layers.active.data;vertices=[];normals=[];uvs=[];indices=[];skin_indices=[[] for _ in range(influence_sets)];skin_weights=[[] for _ in range(influence_sets)];emissions=[];dedup={};max_discarded=0
for triangle in mesh.loop_triangles:
 for loop_index in triangle.loops:
  vertex_index=mesh.loops[loop_index].vertex_index;vertex=mesh.vertices[vertex_index];normal=(normal_matrix @ mesh.corner_normals[loop_index].vector).normalized();texcoord=uv[loop_index].uv
  key=(vertex_index,*[round(v,8) for v in texcoord],*[round(v,8) for v in normal])
  if key not in dedup:
   weights=weights_by_vertex[vertex_index]
   if not weights:raise ValueError(f'Source skin has missing deformation influences at {vertex_index}')
   total=sum(v for _,v in weights);padded=weights+[(0,0)]*(4*influence_sets-len(weights))
   dedup[key]=len(vertices)//3;vertices.extend(to_rig @ vertex.co);normals.extend(normal);uvs.extend(texcoord)
   for group in range(influence_sets):
    skin_indices[group].extend(i for i,_ in padded[group*4:group*4+4]);skin_weights[group].extend(v/total for _,v in padded[group*4:group*4+4])
   emissions.append(emission.data[vertex_index].value if emission else 0)
  indices.append(dedup[key])
binary=bytearray();attributes={}
channels=[('position',vertices,'f',3),('normal',normals,'f',3),('uv',uvs,'f',2)]
for group in range(influence_sets):
 suffix=str(group+1) if group else '';channels.extend([('skinIndex'+suffix,skin_indices[group],'H',4),('skinWeight'+suffix,skin_weights[group],'f',4)])
channels.extend([('sourceEmission',emissions,'f',1),('index',indices,'I',1)])
for name,values,format,size in channels:
 while len(binary)%4:binary.append(0)
 payload=struct.pack('<'+format*len(values),*values);attributes[name]={'offset':len(binary),'bytes':len(payload),'component':format,'itemSize':size,'count':len(values)//size};binary.extend(payload)
(a.out/'skin.bin').write_bytes(binary)
def srgb(n):return 12.92*n if n<=.0031308 else 1.055*n**(1/2.4)-.055
emitter=next((n for n in material.node_tree.nodes if n.type=='EMISSION'),None)
colour=emitter.inputs['Color'].default_value[:3] if emitter else [0,0,0]
strength=next((n.inputs[1].default_value for n in material.node_tree.nodes if n.type=='MATH' and n.operation=='MULTIPLY' and not n.inputs[1].is_linked),0)
manifest={'version':1,'skinningMode':skinning_mode,'sourceSignature':m['skeletonSignature'],'sourceBlendSha256':surface['sourceBlendSha256'],'buffer':'skin.bin','bufferSha256':hashlib.sha256(binary).hexdigest(),'attributes':attributes,
 'poses':'poses.json','posesSha256':hashlib.sha256((a.out/'poses.json').read_bytes()).hexdigest(),'albedo':'albedo.png','albedoSha256':hashlib.sha256(texture.read_bytes()).hexdigest(),'albedoSize':list(image.size),
 'vertices':len(vertices)//3,'triangles':len(indices)//3,'influenceSets':influence_sets,'flatShading':all(not poly.use_smooth for poly in mesh.polygons),'doubleSided':not material.use_backface_culling,'maxDiscardedSkinWeight':max_discarded,
 'emission':'#'+''.join(f'{round(max(0,min(1,srgb(v)))*255):02x}' for v in colour),'emissionIntensity':strength,'sourceUnits':'metres','candidateNotApproved':True,'runtimeAccepted':False}
manifest['protectedContactSurfaces']=a.protect_contact_surfaces
manifest['protectedAnatomyGroups']=a.protect_groups.split(',') if a.protect_groups else []
(a.out/'skin.json').write_text(json.dumps(manifest,indent=2)+'\n')
# The same public profile/lifecycle is used by raster and source-skin backends.
profile=build_runtime_profile(m);projection=m['projectionByDirection']['S'];pixel_scale=93/96
turn=m.get('turnSupport',{'radians':math.pi/4,'durationSeconds':16/12,'phaseCycles':1})
profile['sourceSupport']={'version':1,'facingZero':'S','groundBasis':[projection[i]*pixel_scale for i in [0,1,4,5]],'heightProjection':[projection[i]*pixel_scale for i in [2,6]],'groundZ':m['groundZMetres'],'strideMetres':m['clips']['walk']['strideMetres'],'turnRadiansPerSecond':turn['radians']/turn['durationSeconds'],'turnCyclesPerRadian':turn['phaseCycles']/turn['radians'],'contactCycles':m['contactCycles'],'seededPhase':True}
if 'strideMetresByAxis' in surface:profile['sourceSupport']['strideMetresByAxis']=surface['strideMetresByAxis']
if 'orientationWarp' in surface:profile['sourceSupport']['orientationWarp']=surface['orientationWarp']
if 'balanceJoint' in surface:profile['sourceSupport']['balanceJoint']=surface['balanceJoint']
profile['sourceSupport']['worldUnitsPerMetre']=surface['worldUnitsPerMetre']
(a.out/'profile.json').write_text(json.dumps(profile,separators=(',',':'))+'\n')
runtime_manifest={'schemaVersion':2,'sourceSignature':m['skeletonSignature'],'directions':m['directions'],'profileSha256':hashlib.sha256((a.out/'profile.json').read_bytes()).hexdigest(),
 'skin':{'manifest':'skin.json','sha256':hashlib.sha256((a.out/'skin.json').read_bytes()).hexdigest()},
 'clips':{name:{'frames':clip['frames'],'cell':96,'anchor':[48,72],'worldSize':93} for name,clip in m['clips'].items()},'productionReady':False,'candidateNotApproved':True,'runtimeIntegrated':False}
(a.out/'manifest.json').write_text(json.dumps(runtime_manifest,indent=2)+'\n')
r.data.pose_position='POSE';r.animation_data_create();r.animation_data.action=bpy.data.actions['AN1_walk_supported_v1'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str((a.out/'source-skin-lod.blend').resolve()))
print('SOURCE_SKIN_EXPORT',json.dumps(manifest),flush=True)
