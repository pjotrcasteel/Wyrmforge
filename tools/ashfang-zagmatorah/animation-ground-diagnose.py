import bpy,numpy as np,json
r=bpy.data.objects['Zahmatorah_Skeleton'];o=bpy.data.objects['Zagmatorah'];scene=bpy.context.scene
keep=o.vertex_groups['Ashfang retain body and tapered tail'].index
indices=[v.index for v in o.data.vertices if any(g.group==keep and g.weight>.5 for g in v.groups)]
from mathutils.kdtree import KDTree
kd=KDTree(len(o.data.vertices))
for v in o.data.vertices:kd.insert(v.co,v.index)
kd.balance()
for name in ['stalk','run','pounce','takeoff','land','turn_right','death','death_alt']:
 a=bpy.data.actions['Ashfang|'+name];r.animation_data.action=a;r.animation_data.action_slot=a.slots[0];worst=(999,None)
 for f in range(1,int(a.frame_range[1])+1,2):
  scene.frame_set(f);bpy.context.view_layer.update();ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();v=min(me.vertices,key=lambda v:v.co.z)
  if v.co.z<worst[0]:
   idx=indices[v.index];orig=o.data.vertices[idx];rp=orig.co;groups=sorted([(o.vertex_groups[g.group].name,round(g.weight,2)) for g in orig.groups],key=lambda x:-x[1])[:3];worst=(v.co.z,{'frame':f,'point':list(v.co),'rest':list(rp),'weights':groups})
  ev.to_mesh_clear()
 print(name,worst,flush=True)
