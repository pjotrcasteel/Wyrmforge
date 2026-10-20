"""Sample actual weighted geometry and three diagnostic cameras."""
import bpy,sys,json
import numpy as np
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(out/'ashling-rigged.blend'))
scene=bpy.context.scene;obj=bpy.data.objects['Ashling skinned character'];rig=bpy.data.objects['Ashling editable animation rig']
deps=bpy.context.evaluated_depsgraph_get();positions=[];skeleton=[]
colors=[]
for vertex in obj.data.vertices:
    weights={obj.vertex_groups[g.group].name:g.weight for g in vertex.groups}
    left=sum(w for n,w in weights.items() if n in ['thigh.L','shin.L','foot.L'])
    right=sum(w for n,w in weights.items() if n in ['thigh.R','shin.R','foot.R'])
    colors.append([.95,.39,.12] if left>.4 else ([.12,.72,.95] if right>.4 else [.43,.43,.46]))
for frame in range(1,18):
    scene.frame_set(frame);evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
    positions.append(np.array([v.co[:] for v in mesh.vertices],np.float32))
    if frame==1:
        mesh.calc_loop_triangles();faces=np.array([t.vertices[:] for t in mesh.loop_triangles],np.int32)
        uv=np.zeros((len(mesh.vertices),2),np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    evaluated.to_mesh_clear()
    skeleton.append([[list(rig.pose.bones[n+'.'+s].head) for n in ['thigh','shin','foot']]+[list(rig.pose.bones['foot.'+s].tail)] for s in ['L','R']])
camera=scene.camera;matrices=[]
for location in [(3.5,.22,.15),(.07,-3.5,.8),(2.2,-3.2,2.6)]:
    camera.location=location;camera.rotation_euler=(Vector((.07,.22,-.03))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=1.7
    bpy.context.view_layer.update()
    matrices.append(np.array(camera.calc_matrix_camera(deps,x=96,y=96,scale_x=1,scale_y=1)@camera.matrix_world.inverted()))
np.savez_compressed(out/'blocking-samples.npz',positions=positions,faces=faces,uv=uv,colors=colors,mvps=matrices,skeleton=skeleton)
print('Sampled actual skin, leg landmarks and side/front/game cameras')
