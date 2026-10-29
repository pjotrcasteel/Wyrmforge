import bpy
ob=bpy.data.objects['Zagmatorah']
for slot in ob.material_slots:
 m=slot.material;print('MATERIAL',m.name,m.use_nodes)
 for n in m.node_tree.nodes:
  if n.type=='BSDF_PRINCIPLED':
   for s in n.inputs:
    if hasattr(s,'default_value') and s.name in ['Base Color','Metallic','Roughness','Weight','Alpha','Specular IOR Level','Emission Color','Emission Strength','Coat Weight','Transmission Weight']:
     print('INPUT',s.name,str(s.default_value),[(l.from_node.name,l.from_socket.name) for l in s.links])
 for l in m.node_tree.links:
  if l.to_node.type=='OUTPUT_MATERIAL':print('OUTPUT',l.from_node.name,l.to_socket.name)

print('OVERRIDE',bpy.context.view_layer.material_override)
for m in ob.data.materials:
 for l in m.node_tree.links:print('LINK',m.name,l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name)
