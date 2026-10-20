"""Blender evaluates the saved skin/animation; RTX renderer consumes 3D samples."""
import bpy
import numpy as np
import json
from pathlib import Path
import sys
from mathutils import Vector

out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(out/'hollow-rigged.blend'))
scene=bpy.context.scene
character=bpy.data.objects['Hollow skinned character']
rig=bpy.data.objects['Hollow editable animation rig']
deps=bpy.context.evaluated_depsgraph_get()
samples=[]
markers=[]
for frame in range(1,18):
    scene.frame_set(frame)
    evaluated=character.evaluated_get(deps)
    mesh=evaluated.to_mesh()
    coords=np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get('co',coords)
    samples.append(coords.reshape(-1,3))
    if frame==1:
        mesh.calc_loop_triangles()
        faces=np.array([tuple(tri.vertices) for tri in mesh.loop_triangles],dtype=np.int32)
        uv=np.zeros((len(mesh.vertices),2),dtype=np.float32)
        for loop in mesh.loops:
            uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    evaluated.to_mesh_clear()
    for side,sign in [('L',1),('R',-1)]:
        bone=rig.pose.bones['foot.'+side]
        contact=bone.matrix @ rig.data.bones[bone.name].matrix_local.inverted() @ Vector((sign*.09,-.025,-.5))
        markers.append(dict(frame=frame,side=side,contact=list(contact)))
camera=scene.camera
projection=camera.calc_matrix_camera(deps,x=96,y=96,scale_x=1,scale_y=1)
mvp=projection @ camera.matrix_world.inverted()
np.savez_compressed(out/'sampled-walk.npz',positions=np.array(samples),faces=faces,uv=uv,mvp=np.array(mvp))
(out/'actual-foot-markers.json').write_text(json.dumps(markers,indent=2)+'\n')
print('sampled',len(samples),'skeletal poses',flush=True)
