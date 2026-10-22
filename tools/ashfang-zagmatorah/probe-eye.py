import bpy,json
m=bpy.data.materials['DragonEye']
for n in m.node_tree.nodes:
 print('NODE',n.name,n.type, n.image.name if n.type=='TEX_IMAGE' and n.image else '',[(s.name,s.default_value[: ] if hasattr(s.default_value,'__len__') else s.default_value) for s in n.inputs if hasattr(s,'default_value') and not s.is_linked][:5])
for l in m.node_tree.links:print('LINK',l.from_node.name,l.from_socket.name,'=>',l.to_node.name,l.to_socket.name)
body=bpy.data.objects['Zagmatorah'];uv=body.data.uv_layers.active.data
for slot in [i for i,s in enumerate(body.material_slots) if s.material.name=='DragonEye']:
 coords=[uv[li].uv[:] for p in body.data.polygons if p.material_index==slot for li in p.loop_indices];print('UV_BOUNDS',min(x[0] for x in coords),max(x[0] for x in coords),min(x[1] for x in coords),max(x[1] for x in coords))
