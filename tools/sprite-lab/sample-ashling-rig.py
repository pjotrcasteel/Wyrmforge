"""Evaluate the saved Blender skin, including actual planted-foot markers."""
import bpy, sys, json
import numpy as np
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(out/'ashling-rigged.blend'))
scene=bpy.context.scene;character=bpy.data.objects['Ashling skinned character'];rig=bpy.data.objects['Ashling editable animation rig']
deps=bpy.context.evaluated_depsgraph_get();positions=[];markers=[]
for frame in range(1,18):
    scene.frame_set(frame);evaluated=character.evaluated_get(deps);mesh=evaluated.to_mesh()
    coords=np.empty(len(mesh.vertices)*3,np.float32);mesh.vertices.foreach_get('co',coords);positions.append(coords.reshape(-1,3))
    if frame==1:
        mesh.calc_loop_triangles();faces=np.array([tuple(t.vertices) for t in mesh.loop_triangles],np.int32)
        uv=np.zeros((len(mesh.vertices),2),np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    evaluated.to_mesh_clear()
    for side in ['L','R']:
        name='foot.'+side;rest=rig.data.bones[name]
        contact=rig.pose.bones[name].matrix@rest.matrix_local.inverted()@(rest.head_local+Vector((0,-.08,-.065)))
        markers.append(dict(frame=frame,side=side,contact=list(contact)))
camera=scene.camera;mvp=camera.calc_matrix_camera(deps,x=96,y=96,scale_x=1,scale_y=1)@camera.matrix_world.inverted()
np.savez_compressed(out/'sampled-walk.npz',positions=np.array(positions),faces=faces,uv=uv,mvp=np.array(mvp))
(out/'actual-foot-markers.json').write_text(json.dumps(markers,indent=2)+'\n')
print('Sampled seventeen skinned poses and contact markers',flush=True)
