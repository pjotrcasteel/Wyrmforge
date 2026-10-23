"""Validate actual deformed geometry, loop/transition seams, stride contact and export framing."""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy,numpy as np
p=argparse.ArgumentParser();p.add_argument('--motions',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);specs=json.loads(Path(a.motions).read_text());rig=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah'];scene=bpy.context.scene;scene.render.fps=24;rig.data.pose_position='POSE';report={'source':bpy.data.filepath,'sourceSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'clips':{},'transitions':{},'rigBones':len(rig.data.bones),'meshVertices':len(body.data.vertices),'temporaryConstraints':sum(len(b.constraints) for b in rig.pose.bones),'runtimeIntegrated':False};endpoints={};center=np.array([3.8,0,2.4]);el=math.atan(1/math.sqrt(2));basis=[]
for deg in range(0,360,45):
 az=math.radians(90+deg);basis.append((np.array([-math.sin(az),math.cos(az),0]),np.array([-math.cos(az)*math.sin(el),-math.sin(az)*math.sin(el),math.cos(el)])))
def mesh_coords():
 ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();coords=np.empty(len(me.vertices)*3,np.float32);me.vertices.foreach_get('co',coords);ev.to_mesh_clear();return coords.reshape(-1,3)
for name,spec in specs['clips'].items():
 action=bpy.data.actions[spec['action']];rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];frames=range(1,spec['intervals']+2);boxes=[512,512,0,0];minz=999;hashes=set();contacts={};hold=[];first=None;last=None;maxmotion=0
 for frame in frames:
  scene.frame_set(frame);bpy.context.view_layer.update();v=mesh_coords();assert np.isfinite(v).all();minz=min(minz,float(v[:,2].min()));hashes.add(hashlib.sha256(v.tobytes()).hexdigest());first=v.copy() if first is None else first;last=v.copy();maxmotion=max(maxmotion,float(np.linalg.norm(v-first,axis=1).max()));q=v-center
  for right,up in basis:
   px=256+q@right*512/22;py=256-q@up*512/22;boxes=[min(boxes[0],float(px.min())),min(boxes[1],float(py.min())),max(boxes[2],float(px.max())),max(boxes[3],float(py.max()))]
  t=(frame-1)/spec['intervals']
  if name in ('walk','stalk','run'):
   duty=.55 if name=='run' else .7;offsets={('fore','l'):0,('fore','r'):.12,('hind','l'):.5,('hind','r'):.62} if name=='run' else {('fore','l'):0,('hind','r'):.25,('fore','r'):.5,('hind','l'):.75}
   for key,offset in offsets.items():
    phase=(t+offset)%1
    if phase<duty-1e-6:
     bone=rig.pose.bones[('Arm_' if key[0]=='fore' else 'Feet_')+key[1]];pos=(bone.tail if key[0]=='fore' else bone.head).copy();pos.x-=spec['travelPerCycle']*t;contacts.setdefault(str(key)+str(math.floor(t+offset)),[]).append(list(pos))
  if name.startswith('death') and t>=.87:hold.append(v)
 seam=float(np.linalg.norm(last-first,axis=1).max());slide=max([float(np.linalg.norm(np.array(points)-np.array(points)[0],axis=1).max()) for points in contacts.values()],default=0);hold_error=max([float(np.linalg.norm(v-hold[0],axis=1).max()) for v in hold],default=0)
 endpoints[name]=(first,last);report['clips'][name]={'sourceFrames':spec['sourceFrames'],'uniquePoses':len(hashes),'maxVertexMovement':maxmotion,'loop':spec['loop'],'loopSeamMaxVertexError':seam if spec['loop'] else None,'stanceWorldDrift':slide if contacts else None,'heldDeathVertexDrift':hold_error if hold else None,'minimumGroundZ':minz,'allDirectionBounds':boxes,'clipping':min(boxes[:2])<4 or max(boxes[2:])>508,'finite':True}
 print('VALIDATED',name,'minZ',round(minz,4),'loop',round(seam,6),'stance',round(slide,7),flush=True)
for start,end in [('idle','walk_start'),('walk_start','walk'),('walk','walk_stop'),('walk_stop','idle'),('idle','run_start'),('run_start','run'),('run','run_stop'),('run_stop','idle'),('idle','alert_start'),('alert_start','alert'),('alert','alert_end'),('alert_end','idle'),('idle','breath_start'),('breath_start','breath_loop'),('breath_loop','breath_end'),('breath_end','idle'),('idle','takeoff'),('takeoff','fly'),('fly','land'),('land','idle')]:
 # Loop handoffs occur at the source's phase-zero pose, not the final exported sample.
 x=endpoints[start][0] if specs['clips'][start]['loop'] else endpoints[start][1];y=endpoints[end][0];error=float(np.linalg.norm(x-y,axis=1).max());report['transitions'][start+' -> '+end]=error
report['pass']=report['rigBones']==112 and report['meshVertices']==19841 and report['temporaryConstraints']==0 and all(not c['clipping'] and c['minimumGroundZ']>=-.075 and c['maxVertexMovement']>.01 and (c['loopSeamMaxVertexError'] is None or c['loopSeamMaxVertexError']<.001) and (c['stanceWorldDrift'] is None or c['stanceWorldDrift']<.001) and (c['heldDeathVertexDrift'] is None or c['heldDeathVertexDrift']<.001) for c in report['clips'].values()) and max(report['transitions'].values())<.005
Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(report,indent=2));print('ALL_TRANSITIONS',report['transitions'],flush=True);print('MOTION_VALIDATION_PASS',report['pass'],flush=True)
if not report['pass']:raise RuntimeError('Motion validation failed; inspect report')
