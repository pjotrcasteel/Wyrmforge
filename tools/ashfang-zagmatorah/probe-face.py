import bpy,json
from mathutils import Vector
r=bpy.data.objects['Zahmatorah_Skeleton'];print('RIG_MATRIX',r.matrix_world)
for name in ['Ashfang recessed molten throat','Ashfang internal mouth illumination']:
 o=bpy.data.objects[name];e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());print('OBJECT',name,'location',list(o.location),'matrix',o.matrix_world)
 if o.type=='MESH':
  points=[e.matrix_world@v.co for v in e.data.vertices];print('BOUNDS',*[[(min(p[i] for p in points)),(max(p[i] for p in points))] for i in range(3)])
b=bpy.data.objects['Zagmatorah'];e=b.evaluated_get(bpy.context.evaluated_depsgraph_get());ids=set()
for p in e.data.polygons:
 if b.material_slots[p.material_index].material.name=='DragonEye':ids.update(p.vertices)
points=[e.matrix_world@e.data.vertices[i].co for i in ids];print('EYE_BOUNDS',*[[(min(p[i] for p in points)),(max(p[i] for p in points))] for i in range(3)])
for n in ['UpperHead','Eye_l','Eye_r']:print('BONE',n,r.pose.bones[n].matrix)
