"""Prove the unchanged actions against the preserved foundation-002 native actions."""
import bpy,numpy as np,json,argparse,sys,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--previous',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);rig=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah'];scene=bpy.context.scene
changed={'roar','takeoff','fly','hover','glide','bank_left','bank_right','air_breath','land','death','death_alt'};current={x.name.split('|')[1]:x for x in bpy.data.actions if x.name.startswith('Ashfang|')};names=[n for n in current if n not in changed]
with bpy.data.libraries.load(str(Path(a.previous).resolve()),link=False) as (src,dst):dst.actions=['Ashfang|'+n for n in names]
previous=dict(zip(names,dst.actions));report={'previousSha256':hashlib.sha256(Path(a.previous).read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'clips':{},'tolerance':.0001}
def pose(action,f):
 rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];rig['magmaLife']=1.;scene.frame_set(f);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();v=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',v);ev.to_mesh_clear();return v,np.array([list(row) for b in rig.pose.bones for row in b.matrix])
for name in names:
 err=bone=0.;end=int(current[name].frame_range[1]);assert end==int(previous[name].frame_range[1])
 for f in range(1,end+1):
  x,b=pose(current[name],f);y,c=pose(previous[name],f);err=max(err,float(np.max(np.abs(x-y))));bone=max(bone,float(np.max(np.abs(b-c))))
 report['clips'][name]={'sourceFrames':end,'maximumVertexComponentError':err,'maximumBoneMatrixComponentError':bone,'pass':max(err,bone)<.0001};print(name,err,bone,flush=True)
report['pass']=len(names)==30 and all(c['pass'] for c in report['clips'].values());Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(report,indent=2));assert report['pass']

