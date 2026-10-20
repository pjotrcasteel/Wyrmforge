"""Editable, planted-foot claw attack derived from the accepted Hollow rig."""
import bpy, math, json, sys
from pathlib import Path
import numpy as np
from mathutils import Vector, Quaternion

root=Path(sys.argv[sys.argv.index('--')+1])
model=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
out=model/(sys.argv[sys.argv.index('--')+2] if len(sys.argv)>sys.argv.index('--')+2 else 'rigged-attack-v1')
out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(model/'rigged-pixel-v3/hollow-rigged.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.frame_set(1)
character=bpy.data.objects['Hollow skinned character']
rig=bpy.data.objects['Hollow editable animation rig']
initial={p.name:p.matrix.copy() for p in rig.pose.bones}
heads={b.name:initial[b.name]@b.matrix_local.inverted()@b.head_local for b in rig.data.bones}
tails={b.name:initial[b.name]@b.matrix_local.inverted()@b.tail_local for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}
rig.animation_data.action.use_fake_user=True
action=bpy.data.actions.new('Hollow_Attack_Claw')
rig.animation_data.action=action

def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def track(frame,keys):
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if frame<=b:return va+(vb-va)*smooth((frame-a)/(b-a))
    return keys[-1][1]
def ik(a,b,l1,l2,pole):
    d=(b-a).normalized();distance=min((b-a).length,l1+l2-.0001)
    along=(l1*l1-l2*l2+distance*distance)/(2*distance)
    p=Vector(pole);p=(p-d*p.dot(d)).normalized()
    return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),a+d*distance
def segment(name,head,tail,blend,orientation=None):
    rotation=(orientation.to_matrix() if orientation else (tails[name]-heads[name]).rotation_difference(tail-head).to_matrix())@initial[name].to_3x3()
    matrix=rotation.to_4x4();matrix.translation=head
    rig.pose.bones[name].matrix=initial[name].lerp(matrix,blend)
    bpy.context.view_layer.update()

diagnostics=[]
for index in range(16):
    blend=smooth(index/2)*smooth((15-index)/3)
    yaw=track(index,[(0,0),(5,-25),(7,18),(9,32),(15,0)])
    pitch=track(index,[(0,0),(5,-14),(7,16),(9,20),(15,0)])
    advance=track(index,[(0,0),(5,.018),(7,-.065),(9,-.075),(15,0)])
    dip=track(index,[(0,0),(5,.012),(7,-.014),(9,-.018),(15,0)])
    rotation=Quaternion((0,0,1),math.radians(yaw))@Quaternion((1,0,0),math.radians(pitch))
    center=heads['pelvis'];offset=Vector((0,advance,dip))
    point=lambda p:center+rotation@(p-center)+offset
    segment('root',heads['root'],tails['root'],blend)
    for name in ['pelvis','spine','chest','neck']:
        segment(name,point(heads[name]),point(tails[name]),blend,rotation)
    head_rotation=Quaternion((0,0,1),math.radians(yaw*.3))@Quaternion((1,0,0),math.radians(pitch*.65))
    head=point(heads['head']);segment('head',head,head+head_rotation@(tails['head']-heads['head']),blend,head_rotation)
    for side,sign in [('L',1),('R',-1)]:
        hip=point(heads['thigh.'+side]);ankle=heads['foot.'+side]
        knee,unused=ik(hip,ankle,lengths['thigh.'+side],lengths['shin.'+side],(0,-1,0))
        segment('thigh.'+side,hip,knee,blend);segment('shin.'+side,knee,ankle,blend)
        rig.pose.bones['foot.'+side].matrix=initial['foot.'+side]
        bpy.context.view_layer.update()
        shoulder=point(heads['upper_arm.'+side])
        segment('clavicle.'+side,point(heads['clavicle.'+side]),shoulder,blend,rotation)
        if side=='R':
            wrist=track(index,[(0,heads['hand.R']),(3,Vector((-.26,.02,.19))),(5,Vector((-.29,.025,.46))),
                (7,Vector((-.09,-.34,.21))),(8,Vector((.11,-.33,.04))),(10,Vector((.22,-.16,-.05))),(15,heads['hand.R'])])
            finger=track(index,[(0,tails['hand.R']-heads['hand.R']),(5,Vector((-.04,-.07,.06))),
                (7,Vector((0,-.105,-.035))),(8,Vector((.075,-.065,-.025))),(10,Vector((.085,-.03,-.06))),
                (15,tails['hand.R']-heads['hand.R'])]).normalized()*lengths['hand.R']
        else:
            counter=track(index,[(0,0),(5,1),(8,-.5),(15,0)])
            wrist=point(heads['hand.L'])+Vector((.018*abs(counter),-.04*counter,.025*counter))
            finger=rotation@(tails['hand.L']-heads['hand.L'])
        elbow,wrist=ik(shoulder,wrist,lengths['upper_arm.'+side],lengths['forearm.'+side],(sign,.25,.2))
        segment('upper_arm.'+side,shoulder,elbow,blend);segment('forearm.'+side,elbow,wrist,blend)
        segment('hand.'+side,wrist,wrist+finger,blend)
        lag=max(0,index-1)
        cloth_rotation=Quaternion((0,0,1),math.radians(track(lag,[(0,0),(5,-18),(9,24),(15,0)])))@Quaternion((1,0,0),math.radians(pitch*.7))
        cloth_head=point(heads['cloth.'+side])
        segment('cloth.'+side,cloth_head,cloth_head+cloth_rotation@(tails['cloth.'+side]-heads['cloth.'+side]),blend,cloth_rotation)
    for bone in rig.pose.bones:
        bone.keyframe_insert('location',frame=index+1,group=bone.name)
        bone.keyframe_insert('rotation_quaternion',frame=index+1,group=bone.name)
        bone.keyframe_insert('scale',frame=index+1,group=bone.name)
    diagnostics.append(dict(frame=index,yaw=yaw,pitch=pitch,forwardOffset=advance))
for curve in action.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1;scene.frame_end=16;scene.render.fps=12
scene.camera.data.ortho_scale=1.55*128/96
scene.render.resolution_x=scene.render.resolution_y=128
deps=bpy.context.evaluated_depsgraph_get();samples=[];markers=[];bone_errors=[]
for frame in range(1,17):
    scene.frame_set(frame)
    evaluated=character.evaluated_get(deps);mesh=evaluated.to_mesh()
    coords=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',coords)
    samples.append(coords.reshape(-1,3))
    if frame==1:
        mesh.calc_loop_triangles();faces=np.array([tuple(t.vertices) for t in mesh.loop_triangles],dtype=np.int32)
        uv=np.zeros((len(mesh.vertices),2),dtype=np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    evaluated.to_mesh_clear()
    for side in ['L','R']:markers.append(dict(frame=frame-1,side=side,footMatrix=[list(row) for row in rig.pose.bones['foot.'+side].matrix]))
    bone_errors.extend(abs(p.length-p.bone.length) for p in rig.pose.bones)
projection=scene.camera.calc_matrix_camera(deps,x=128,y=128,scale_x=1,scale_y=1)
samples=np.array(samples)
np.savez_compressed(out/'sampled-attack.npz',positions=samples,faces=faces,uv=uv,mvp=np.array(projection@scene.camera.matrix_world.inverted()))
profile=dict(frames=16,fps=12,loop=False,onComplete='walk',phases=dict(anticipation=[0,5],strike=[6,8],recovery=[9,15]),
    visualContactFrames=[7,8],visualTimingOnly=True,simulationDamageUnchanged=True,
    fixedGroundAnchor=[64,88],drawCellWorldSize=124,maxBoneLengthError=max(bone_errors),
    minimumVertexZ=float(samples[:,:,2].min()),returnPoseError=float(np.abs(samples[-1]-samples[0]).max()),poses=diagnostics,footMarkers=markers)
(out/'attack-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'hollow-attack.blend'))
print(json.dumps({k:v for k,v in profile.items() if k not in ['poses','footMarkers']}),flush=True)
