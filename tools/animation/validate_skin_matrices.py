"""Independent saved-skin replay of complete runtime matrices and sole patches."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import support_margin
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('study',type=Path)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
m=json.loads((a.source/'source-manifest.json').read_text());study=json.loads(a.study.read_text())
bpy.ops.wm.open_mainfile(filepath=str((a.source/'hollow-foundation.blend').resolve()))
rig=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];rig.animation_data_clear()
bpy.data.objects['AN unanimated view'].rotation_euler=(0,0,0)
r={'sourceStudyOnly':True,'runtimeAccepted':False,'poses':0,'maximumBoneEndpointErrorMetres':0,'maximumBoneLengthErrorMetres':0,'maximumGroundErrorMetres':0,'maximumRetainedWorldSoleDriftMetres':0,'maximumMassErrorMetres':0,'minimumActualSupportMarginMetres':math.inf}
plants={};tolerance=m['unitsPerPixel']/4
for pose in study['poses']:
 for i,b in enumerate(study['bones']):
  values=pose['matrices'][i*16:i*16+16];rig.pose.bones[b['id']].matrix=Matrix([values[j::4] for j in range(4)]);bpy.context.view_layer.update()
 for name,d in pose['sourceBones'].items():
  b=rig.pose.bones[name];error=max((b.head-Vector(d['head'])).length,(b.tail-Vector(d['tail'])).length)
  r['maximumBoneEndpointErrorMetres']=max(r['maximumBoneEndpointErrorMetres'],error)
  length_error=abs(b.length-rig.data.bones[name].length);r['maximumBoneLengthErrorMetres']=max(r['maximumBoneLengthErrorMetres'],length_error)
  if error>1e-5 or length_error>1e-5:raise ValueError(f'Actual source bone differs: {pose["sequence"]}/{pose["timestamp"]}/{name}: {error}, length {length_error}')
 evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();support=[]
 for patch in m['solePatches'].values():
  c=next(c for c in m['contactChains'] if c['end']==patch['bone']);target=pose['sourceContacts'][c['id']];key=(pose['sequence'],c['id'])
  if not target['planted']:plants.pop(key,None);continue
  points={i:evaluated.matrix_world @ mesh.vertices[i].co for i in patch['vertexIndices']}
  ground=max(abs(point.z-m['groundZMetres']) for point in points.values());r['maximumGroundErrorMetres']=max(r['maximumGroundErrorMetres'],ground)
  if ground>tolerance:raise ValueError(f'Actual source sole left ground: {ground}')
  yaw=pose['yaw'];rotation=Matrix.Rotation(yaw,3,'Z');basis=study['profileSourceSupport']['groundBasis'];det=basis[0]*basis[3]-basis[1]*basis[2];x,y=pose['world']
  root=Vector([(basis[3]*x-basis[1]*y)/det,(-basis[2]*x+basis[0]*y)/det,0]);world={i:rotation @ point+root for i,point in points.items()}
  if key in plants:
   drift=max((point-plants[key][i]).length for i,point in world.items());r['maximumRetainedWorldSoleDriftMetres']=max(r['maximumRetainedWorldSoleDriftMetres'],drift)
   if drift>tolerance:raise ValueError(f'Actual source sole skates: {pose["sequence"]}/{pose["timestamp"]}/{c["id"]}: {drift}')
  plants[key]=world
  support.extend(points[i] for i in patch['hullVertexIndices'])
 evaluated.to_mesh_clear()
 weights=m['massWeights'];center=sum(((rig.pose.bones[name].head+rig.pose.bones[name].tail)*.5*weight for name,weight in weights.items()),Vector())/sum(weights.values())
 error=(center-Vector(pose['massCenter'])).length;r['maximumMassErrorMetres']=max(r['maximumMassErrorMetres'],error)
 margin=support_margin(center,support);r['minimumActualSupportMarginMetres']=min(r['minimumActualSupportMarginMetres'],margin)
 if error>1e-5 or margin<m['minimumSupportMarginMetres']-1e-6:raise ValueError(f'Actual source mass/support failed: {error}/{margin}')
 r['poses']+=1
a.study.with_suffix('.skin-qc.json').write_text(json.dumps(r,indent=2)+'\n');print('COMPLETE_RUNTIME_MATRIX_SKIN_QC',json.dumps(r))
