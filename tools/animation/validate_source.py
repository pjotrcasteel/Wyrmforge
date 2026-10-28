"""Independent saved-source QC: actual skinned sole vertices, not target data.

Default acceptance requires real mesh patches. Historical landmark-only files
may be inspected with --allow-legacy-landmarks, never as mesh-contact acceptance.
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import support_margin
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve();m=json.loads((folder/'source-manifest.json').read_text())
patches=m.get('solePatches')
if not patches and '--allow-legacy-landmarks' not in sys.argv:raise ValueError('Actual source-mesh sole patches required; historical virtual landmarks are not an acceptance gate')
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
r=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];view=bpy.data.objects['AN unanimated view'];view.rotation_euler=(0,0,0)
scene=bpy.context.scene;results={};rest=r.data.bones;ground=m.get('groundZMetres',-.5)
if patches:
 for side,patch in patches.items():
  group=actor.vertex_groups[patch['bone']].index
  for index in patch['vertexIndices']:
   if index>=len(actor.data.vertices) or not any(g.group==group and g.weight>=1-1e-6 for g in actor.data.vertices[index].groups):raise ValueError('Invalid/absent real mesh contact vertex')
for name,clip in m['clips'].items():
 r.animation_data.action=bpy.data.actions['AN1_'+name+'_supported_v1'];anchors={};maxslip=0;maxlength=0;ranges={};minmargin=math.inf;maxgrounderror=0;maxband=0;sampledvertices=0
 tolerance=m['unitsPerPixel']*.25
 for f,s in enumerate(clip['samples']):
  if clip.get('poseGrid') and f%clip['poseGrid']['phaseFrames']==0:anchors={}
  scene.frame_set(f+1);bpy.context.view_layer.update();active={c['id'] for c in s['contacts']};support=[]
  travel=Vector(s.get('rootTravelVectorMetres',(0,-s.get('rootTravelMetres',clip['strideMetres']*f/16 if name=='walk' else 0),0)))
  evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
  if len(mesh.vertices)!=len(actor.data.vertices):raise ValueError('Unsupported topology-changing modifier')
  for side,sign in [('L',1),('R',-1)]:
   id='foot-'+side;bone=r.pose.bones['foot.'+side]
   if patches:
    patch=patches[side];points={index:evaluated.matrix_world @ mesh.vertices[index].co+travel for index in patch['vertexIndices']}
   else:
    point=r.matrix_world @ bone.matrix @ rest[bone.name].matrix_local.inverted() @ Vector((sign*.09,-.025,-.5))+travel;points={-1:point}
   if id in active:
    for index,point in points.items():
     key=(id,index)
     if key in anchors:
      slip=(point-anchors[key]).length;maxslip=max(maxslip,slip)
      assert slip<tolerance,('actual mesh sole skating',name,f,id,index,slip,tolerance)
     else:anchors[key]=point.copy()
     sampledvertices+=1
    if patches:
     lowest=min(point.z for point in points.values());highest=max(point.z for point in points.values())
     maxgrounderror=max(maxgrounderror,abs(lowest-ground));maxband=max(maxband,highest-ground)
     support.extend(points[index] for index in patch['hullVertexIndices'])
   else:
    for key in [key for key in anchors if key[0]==id]:del anchors[key]
   for upper,lower,label,limit in [('thigh.','shin.','knee',(8,145)),('upper_arm.','forearm.','elbow',(12,150))]:
    a,b=r.pose.bones[upper+side],r.pose.bones[lower+side]
    angle=(a.tail-a.head).angle(b.tail-b.head)*180/math.pi
    assert limit[0]-1e-3<=angle<=limit[1]+1e-3,(name,f,label,angle)
    ranges.setdefault(label+'-'+side,[]).append(angle)
  evaluated.to_mesh_clear()
  if patches:
   weights=m['massWeights'];com=sum((r.matrix_world @ ((r.pose.bones[b].head+r.pose.bones[b].tail)*.5)*weight for b,weight in weights.items()),Vector())/sum(weights.values())+travel
   margin=support_margin(com,support);minmargin=min(minmargin,margin)
   assert margin>=m.get('minimumSupportMarginMetres',0)-1e-6,('actual mesh support mass proxy',name,f,margin)
  for b in r.pose.bones:maxlength=max(maxlength,abs((b.tail-b.head).length-rest[b.name].length))
 tolerance=m['unitsPerPixel']*.25
 assert maxslip<tolerance,('actual mesh sole skating',name,maxslip,tolerance)
 assert maxlength<1e-5,('bone length',name,maxlength)
 if patches:
  assert maxgrounderror<tolerance,('actual mesh sole hover/penetration',name,maxgrounderror,tolerance)
  assert maxband<tolerance+1e-6,('contact patch exceeds pixel-derived ground band',name,maxband,tolerance)
 results[name]={'measurement':'evaluated skinned sole vertices' if patches else 'legacy virtual landmark only','maxSavedActionSlipMetres':maxslip,'toleranceMetres':tolerance,'maxBoneLengthErrorMetres':maxlength,'jointRanges':{k:[min(v),max(v)] for k,v in ranges.items()},'minimumIndependentMassMarginMetres':minmargin if patches else None,'maximumActualSoleGroundErrorMetres':maxgrounderror if patches else None,'maximumGroundPatchBandMetres':maxband if patches else None,'sampledStanceVertices':sampledvertices,'uniqueSoleVertices':sum(len(p['vertexIndices']) for p in patches.values()) if patches else 0}
# Verify declared full-body entry/exit surfaces against independently reopened
# evaluated skin, not just coincident foot markers or authoring target arrays.
for name,clip in m['clips'].items():
 reference=clip.get('transitionReference')
 if reference is None:continue
 grid=clip.get('poseGrid');base=m['clips'].get(reference)
 if not grid or not base or base['frames']!=grid['phaseFrames']:raise ValueError('Transition reference must match source gait phase samples')
 def skin(action,index):
  r.animation_data.action=bpy.data.actions['AN1_'+action+'_supported_v1'];scene.frame_set(index+1);bpy.context.view_layer.update()
  evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
  points=[evaluated.matrix_world @ v.co for v in mesh.vertices];evaluated.to_mesh_clear();return points
 maximum=0
 for phase in range(grid['phaseFrames']):
  baseline=skin(reference,phase)
  for row in [0,grid['actionFrames']-1]:
   endpoint=skin(name,row*grid['phaseFrames']+phase)
   if len(endpoint)!=len(baseline):raise ValueError('Transition changed source topology')
   maximum=max(maximum,max((a-b).length for a,b in zip(endpoint,baseline)))
 tolerance=m['unitsPerPixel']*.25
 if maximum>=tolerance:raise ValueError(f'Whole-body entry/exit skin discontinuity: {name} {maximum}m >= {tolerance}m')
 results[name]['transition']={'reference':reference,'phaseSamples':grid['phaseFrames'],'maximumEvaluatedSkinDiscontinuityMetres':maximum,'toleranceMetres':tolerance}
(folder/'independent-source-qc.json').write_text(json.dumps(results,indent=2)+'\n');print('AN_INDEPENDENT_QC',json.dumps(results),flush=True)
