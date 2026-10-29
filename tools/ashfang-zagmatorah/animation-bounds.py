import bpy,numpy as np,json,math,sys
from pathlib import Path
r=bpy.data.objects['Zahmatorah_Skeleton'];ob=bpy.data.objects['Zagmatorah'];scene=bpy.context.scene;report={};center=np.array([3.8,0,2.4]);size=512;scale=22;el=math.atan(1/math.sqrt(2))
for action in [a for a in bpy.data.actions if a.name.startswith('Ashfang|')]:
 r.animation_data.action=action;r.animation_data.action_slot=action.slots[0];worst=[size,size,0,0];minz=1e6;maxz=-1e6
 for frame in range(int(action.frame_range[0]),int(action.frame_range[1])+1,4):
  scene.frame_set(frame);bpy.context.view_layer.update();ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();v=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',v);v=v.reshape(-1,3);assert np.isfinite(v).all();minz=min(minz,float(v[:,2].min()));maxz=max(maxz,float(v[:,2].max()));q=v-center
  for degree in range(0,360,45):
   az=math.radians(90+degree);right=np.array([-math.sin(az),math.cos(az),0]);up=np.array([-math.cos(az)*math.sin(el),-math.sin(az)*math.sin(el),math.cos(el)]);px=256+q@right*size/scale;py=256-q@up*size/scale;box=[float(px.min()),float(py.min()),float(px.max()),float(py.max())];worst=[min(worst[0],box[0]),min(worst[1],box[1]),max(worst[2],box[2]),max(worst[3],box[3])]
  ev.to_mesh_clear()
 report[action.name]={'minZ':minz,'maxZ':maxz,'allDirectionBounds':worst,'clipped':min(worst[:2])<4 or max(worst[2:])>508};print(action.name,report[action.name],flush=True)
Path('artifacts/ashfang/motion-library001-bounds.json').write_text(json.dumps(report,indent=2))
