import bpy,json
b=bpy.data.objects['Zagmatorah'];m=b.data;uv=m.uv_layers['Ashfang eye iris atlas repair'].data
polys=[p for p in m.polygons if b.material_slots[p.material_index].material.name=='DragonEye' and p.center.y<0]
for p in sorted(polys,key=lambda p:p.center.y)[:5]:
 print('FRONT_EYE',tuple(p.center),[tuple(uv[i].uv) for i in p.loop_indices])
im=bpy.data.images['DragonEye_Albedo.png'];w,h=im.size;print('PIXEL',im.filepath,im.size)
for u,v in [(.205,.765),(.215,.755),(.18,.7),(.25,.8)]:
 i=(int(v*h)*w+int(u*w))*4;print(u,v,im.pixels[i:i+4])
