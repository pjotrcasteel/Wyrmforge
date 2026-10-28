"""Replay shared-JS full-body solutions on the actual saved Blender skin.

Independent of its target arrays: checks real sole vertices, all resulting bone
endpoints, lengths, joint limits and recomputed source mass/support. Source-only.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import segment_matrix,support_margin
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('study',type=Path);p.add_argument('--raster-every',type=int,default=0,help='Measure projected source-region geometry approximation every N poses; diagnostic only.')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
m=json.loads((a.source/'source-manifest.json').read_text());study=json.loads(a.study.read_text())
bpy.ops.wm.open_mainfile(filepath=str((a.source/'hollow-foundation.blend').resolve()))
rig=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];scene=bpy.context.scene
view=bpy.data.objects['AN unanimated view'];view.rotation_euler=(0,0,0)
tolerance=m['unitsPerPixel']/4;results={'sourceStudyOnly':True,'runtimeAccepted':False,'poses':0,'maximumActualSoleTargetErrorMetres':0,'maximumGroundErrorMetres':0,'maximumGroundPatchBandMetres':0,'maximumBoneEndpointErrorMetres':0,'maximumBoneLengthErrorMetres':0,'maximumMassDiscrepancyMetres':0,'minimumActualSupportMarginMetres':math.inf}
results['maximumRetainedWorldSoleDriftMetres']=0;world_plants={}
raster={'measurement':'dominant-weight source-skin vertex projection, not visible raster acceptance','sourceStudyOnly':True,'runtimeAccepted':False,'sampledPoses':0,'views':{}}
if a.raster_every:
 import numpy as np
 region_names=['body',*[c[k] for c in m['contactChains'] for k in ['upper','middle','end']]]
 weights=np.zeros((len(actor.data.vertices),len(region_names)))
 for vertex in actor.data.vertices:
  for g in vertex.groups:
   name=actor.vertex_groups[g.group].name
   if name in region_names:weights[vertex.index,region_names.index(name)]+=g.weight
 weights[:,0]=np.maximum(0,1-weights[:,1:].sum(axis=1));dominant=weights.argmax(axis=1)
 def mesh_points(evaluated,mesh):
  points=np.empty(len(mesh.vertices)*3,dtype=np.float64);mesh.vertices.foreach_get('co',points)
  matrix=np.array(evaluated.matrix_world);return points.reshape((-1,3)) @ matrix[:3,:3].T+matrix[:3,3]
for pose_number,pose in enumerate(study['poses']):
 check_raster=a.raster_every and pose_number%a.raster_every==0
 rig.animation_data.action=bpy.data.actions['AN1_'+pose['clip']+'_supported_v1'];scene.frame_set(pose['index']+1);bpy.context.view_layer.update()
 old_feet={c['end']:rig.pose.bones[c['end']].matrix.copy() for c in m['contactChains']}
 old_contacts={c['id']:rig.pose.bones[c['end']].matrix @ rig.data.bones[c['end']].matrix_local.inverted() @ Vector(c['restContactPoint']) for c in m['contactChains']}
 evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
 old_vertices={index:evaluated.matrix_world @ mesh.vertices[index].co for patch in m['solePatches'].values() for index in patch['vertexIndices']}
 if check_raster:old_surface=mesh_points(evaluated,mesh)
 evaluated.to_mesh_clear()
 pelvis=rig.pose.bones['pelvis'];matrix=pelvis.matrix.copy();matrix.translation+=Vector(pose['bodyShift']);pelvis.matrix=matrix;bpy.context.view_layer.update()
 for c in m['contactChains']:
  for name in [c['upper'],c['middle']]:
   desired=pose['sourceBones'][name];rig.pose.bones[name].matrix=segment_matrix(rig.data.bones[name],desired['head'],desired['tail']);bpy.context.view_layer.update()
  delta=Vector(pose['sourceContacts'][c['id']]['sourceContact'])-old_contacts[c['id']]
  foot=old_feet[c['end']].copy();foot.translation+=delta;rig.pose.bones[c['end']].matrix=foot;bpy.context.view_layer.update()
 for name,desired in pose['sourceBones'].items():
  bone=rig.pose.bones[name]
  error=max((bone.head-Vector(desired['head'])).length,(bone.tail-Vector(desired['tail'])).length)
  results['maximumBoneEndpointErrorMetres']=max(results['maximumBoneEndpointErrorMetres'],error)
  if error>1e-5:raise ValueError(f'JS/Blender whole-body disagreement {pose["heading"]}/{pose["clip"]}/{pose["index"]}/{name}: {error}')
  length_error=abs(bone.length-rig.data.bones[name].length);results['maximumBoneLengthErrorMetres']=max(results['maximumBoneLengthErrorMetres'],length_error)
  if length_error>1e-5:raise ValueError('Reposed source bone length changed')
 evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();support=[]
 for patch in m['solePatches'].values():
  c=next(c for c in m['contactChains'] if c['end']==patch['bone']);target=pose['sourceContacts'][c['id']]
  key=(pose.get('sequence'),c['id'])
  if not target['planted']:
   world_plants.pop(key,None);continue
  delta=Vector(target['sourceContact'])-old_contacts[c['id']]
  points={index:evaluated.matrix_world @ mesh.vertices[index].co for index in patch['vertexIndices']}
  error=max((point-old_vertices[index]-delta).length for index,point in points.items())
  ground=abs(min(point.z for point in points.values())-m['groundZMetres']);band=max(point.z for point in points.values())-m['groundZMetres']
  results['maximumActualSoleTargetErrorMetres']=max(results['maximumActualSoleTargetErrorMetres'],error)
  results['maximumGroundErrorMetres']=max(results['maximumGroundErrorMetres'],ground);results['maximumGroundPatchBandMetres']=max(results['maximumGroundPatchBandMetres'],band)
  if error>=tolerance or ground>=tolerance or band>tolerance+1e-6:raise ValueError('Actual reposed skin lost source sole contact')
  if pose.get('sequence') is not None:
   offset=Vector([*pose['world'],0]);world_points={index:point+offset for index,point in points.items()}
   if key in world_plants:
    slip=max((point-world_plants[key][index]).length for index,point in world_points.items())
    results['maximumRetainedWorldSoleDriftMetres']=max(results['maximumRetainedWorldSoleDriftMetres'],slip)
    if slip>=tolerance:raise ValueError(f'Actual world-space source sole skating: {pose["sequence"]}/{pose["timestamp"]}/{c["id"]}: {slip}')
   else:world_plants[key]=world_points
  support.extend(points[index] for index in patch['hullVertexIndices'])
 if check_raster:
  actual_surface=mesh_points(evaluated,mesh);raster['sampledPoses']+=1
  for direction,projection in m['projectionByDirection'].items():
   matrix=np.array(projection).reshape((2,4));before=old_surface @ matrix[:,:3].T+matrix[:,3];after=actual_surface @ matrix[:,:3].T+matrix[:,3]
   entries=raster['views'].setdefault(direction,{})
   for region_index,name in enumerate(region_names):
    mask=dominant==region_index;transform=pose['rasterTransformsByDirection'][direction][name];aa,b,c,d,e,f=transform
    approximate=before[mask] @ np.array([[aa,b],[c,d]])+np.array([e,f]);error=np.linalg.norm(approximate-after[mask],axis=1)
    entry=entries.setdefault(name,{'maximumNativePixelError':0,'vertexSamples':0,'samplesAboveQuarterPixel':0})
    entry['maximumNativePixelError']=max(entry['maximumNativePixelError'],float(error.max()) if len(error) else 0);entry['vertexSamples']+=len(error);entry['samplesAboveQuarterPixel']+=int((error>.25).sum())
 evaluated.to_mesh_clear()
 weights=m['massWeights'];center=sum(((rig.pose.bones[name].head+rig.pose.bones[name].tail)*.5*weight for name,weight in weights.items()),Vector())/sum(weights.values())
 mass_error=(center-Vector(pose['massCenter'])).length;results['maximumMassDiscrepancyMetres']=max(results['maximumMassDiscrepancyMetres'],mass_error)
 if mass_error>1e-5:raise ValueError('Reposed mass was not derived from actual whole-body bones')
 margin=support_margin(center,support);results['minimumActualSupportMarginMetres']=min(results['minimumActualSupportMarginMetres'],margin)
 if margin<m['minimumSupportMarginMetres']-1e-6:raise ValueError('Actual reposed skin mass unsupported')
 for c in m['contactChains']:
  upper,middle=(rig.pose.bones[c[key]] for key in ['upper','middle']);flex=(upper.tail-upper.head).angle(middle.tail-middle.head)*180/math.pi
  if not c['limits'][0]-1e-3<=flex<=c['limits'][1]+1e-3:raise ValueError('Actual reposed skin joint limit')
 results['poses']+=1
a.study.with_suffix('.skin-qc.json').write_text(json.dumps(results,indent=2)+'\n');print('REPOSED_ACTUAL_SKIN_QC',json.dumps(results))
if a.raster_every:
 a.study.with_suffix('.raster-geometry-qc.json').write_text(json.dumps(raster,indent=2)+'\n')
 print('SOURCE_REGION_GEOMETRY_ERROR',max(e['maximumNativePixelError'] for entries in raster['views'].values() for e in entries.values()))
