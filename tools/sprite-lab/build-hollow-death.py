"""Author a non-looping, jointed collapse in the existing textured Blender rig.

Blender evaluates editable bones and a small floor-contact corrective; the local
RTX renderer handles the actual pixel export. The accepted walk is preserved.
"""
import bpy
import math
import json
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector, Quaternion

root=Path(sys.argv[sys.argv.index('--')+1])
model=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
out=model/(sys.argv[sys.argv.index('--')+2] if len(sys.argv)>sys.argv.index('--')+2 else 'rigged-death-v1')
out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(model/'rigged-pixel-v3/hollow-rigged.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
character=bpy.data.objects['Hollow skinned character']
rig=bpy.data.objects['Hollow editable animation rig']
scene.frame_set(1)
initial={p.name:p.matrix.copy() for p in rig.pose.bones}
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:(b.tail_local-b.head_local).length for b in rig.data.bones}
walk=rig.animation_data.action
walk.use_fake_user=True
death=bpy.data.actions.new('Hollow_Death_Collapse')
rig.animation_data.action=death

def smooth(t):
    t=max(0,min(1,t))
    return t*t*(3-2*t)

def track(frame,keys):
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if frame<=b:
            t=smooth((frame-a)/(b-a))
            return va+(vb-va)*t
    return keys[-1][1]

def ik(a,b,l1,l2,pole):
    delta=b-a
    distance=max(1e-5,min(delta.length,l1+l2-.0001))
    direction=delta.normalized()
    along=(l1*l1-l2*l2+distance*distance)/(2*distance)
    perpendicular=Vector(pole)-direction*Vector(pole).dot(direction)
    perpendicular.normalize()
    joint=a+direction*along+perpendicular*math.sqrt(max(0,l1*l1-along*along))
    return joint,a+direction*distance

def knee_above_floor(hip,knee,ankle,sign,l1,l2):
    """Keep the knee center above the floor without changing either leg length."""
    if knee.z>=-.455:return knee
    direction=(ankle-hip).normalized()
    distance=(ankle-hip).length
    along=(l1*l1-l2*l2+distance*distance)/(2*distance)
    base=hip+direction*along
    radius=math.sqrt(max(0,l1*l1-along*along))
    down=Vector((0,0,-1));down=(down-direction*down.dot(direction)).normalized()
    lateral=direction.cross(down).normalized()
    if lateral.x*sign<0:lateral=-lateral
    c=max(-1,min(1,(-.455-base.z)/(radius*down.z)))
    return base+radius*(down*c+lateral*math.sqrt(max(0,1-c*c)))

def segment(name,head,tail,blend):
    rotation=(tails[name]-heads[name]).rotation_difference(tail-head).to_matrix() @ rest[name].to_3x3()
    matrix=rotation.to_4x4()
    matrix.translation=head
    # Bone-space translation and quaternion interpolation preserve bone lengths.
    matrix=initial[name].lerp(matrix,blend)
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

diagnostics=[]
for index in range(24):
    blend=smooth(index/2)
    pitch=track(index,[(0,10),(3,-12),(6,25),(9,62),(12,93),(14,87),(18,92),(23,92)])
    height=track(index,[(0,-.06),(3,-.08),(6,-.23),(9,-.34),(12,-.407),(14,-.39),(18,-.409),(23,-.409)])
    advance=track(index,[(0,0),(3,.015),(6,-.035),(9,-.10),(12,-.16),(18,-.18),(23,-.18)])
    rotation=Quaternion((1,0,0),math.radians(pitch))
    origin=Vector((0,advance,height))
    point=lambda p:origin+rotation@(p-heads['pelvis'])
    segment('root',heads['root'],tails['root'],blend)
    for name in ['pelvis','spine','chest','neck']:
        segment(name,point(heads[name]),point(tails[name]),blend)
    head_pitch=track(index,[(0,10),(3,-22),(7,16),(11,76),(13,105),(15,94),(19,99),(23,99)])
    head_rotation=Quaternion((0,0,1),math.radians(track(index,[(0,0),(8,-3),(18,-12),(23,-12)]))) @ Quaternion((1,0,0),math.radians(head_pitch))
    neck=point(heads['head'])
    segment('head',neck,neck+head_rotation@(tails['head']-heads['head']),blend)
    for side,sign in [('L',1),('R',-1)]:
        hip=point(heads['thigh.'+side])
        ankle=Vector((sign*track(index,[(0,.09),(6,.105),(18,.12),(23,.12)]),
                      track(index,[(0,-.08 if side=='L' else .07),(6,.015),(12,.22),(18,.245),(23,.245)]),-.445))
        pole=(Vector((0,-1,0)).lerp(Vector((sign*.2,-.2,-1)),smooth((index-6)/6)))
        knee,ankle=ik(hip,ankle,lengths['thigh.'+side],lengths['shin.'+side],pole)
        knee=knee_above_floor(hip,knee,ankle,sign,lengths['thigh.'+side],lengths['shin.'+side])
        segment('thigh.'+side,hip,knee,blend)
        segment('shin.'+side,knee,ankle,blend)
        foot_rotation=Quaternion((1,0,0),math.radians(track(index,[(0,0),(8,0),(14,-150),(18,-180),(23,-180)])))
        segment('foot.'+side,ankle,ankle+foot_rotation@(tails['foot.'+side]-heads['foot.'+side]),blend)
        shoulder=point(heads['upper_arm.'+side])
        segment('clavicle.'+side,point(heads['clavicle.'+side]),shoulder,blend)
        brace=smooth((index-(5 if side=='L' else 6))/7)
        hanging=point(heads['forearm.'+side]+(tails['forearm.'+side]-heads['forearm.'+side]))
        wrist=hanging.lerp(Vector((sign*(.30 if side=='L' else .27),-.61 if side=='L' else -.53,-.45)),brace)
        elbow,wrist=ik(shoulder,wrist,lengths['upper_arm.'+side],lengths['forearm.'+side],(sign,.6,.1))
        segment('upper_arm.'+side,shoulder,elbow,blend)
        segment('forearm.'+side,elbow,wrist,blend)
        hand_direction=(rotation@(tails['hand.'+side]-heads['hand.'+side])).lerp(Vector((sign*.045,-.095,-.012)),brace).normalized()*lengths['hand.'+side]
        segment('hand.'+side,wrist,wrist+hand_direction,blend)
        cloth_pitch=track(index,[(0,10),(3,-5),(6,45),(9,70),(12,85),(15,96),(19,92),(23,92)])
        cloth_rotation=Quaternion((1,0,0),math.radians(cloth_pitch))
        cloth_head=point(heads['cloth.'+side])
        segment('cloth.'+side,cloth_head,cloth_head+cloth_rotation@(tails['cloth.'+side]-heads['cloth.'+side]),blend)
    for bone in rig.pose.bones:
        bone.keyframe_insert('location',frame=index+1,group=bone.name)
        bone.keyframe_insert('rotation_quaternion',frame=index+1,group=bone.name)
        bone.keyframe_insert('scale',frame=index+1,group=bone.name)
    diagnostics.append(dict(frame=index,pelvisHeight=height,bodyPitch=pitch,headPitch=head_pitch,forwardTranslation=advance))

for curve in death.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1
scene.frame_end=24
scene.render.fps=12
scene.frame_set(1)
# Preserve identical camera pixel density, adding 16px padding on each side for
# the prone body. 96px walk anchor (48,72) becomes 128px death anchor (64,88).
scene.camera.data.ortho_scale=1.55*128/96
scene.render.resolution_x=scene.render.resolution_y=128
deps=bpy.context.evaluated_depsgraph_get()
samples=[];pre_ground=[]
for frame in range(1,25):
    scene.frame_set(frame)
    mesh=character.evaluated_get(deps).to_mesh()
    coords=np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get('co',coords)
    coords=coords.reshape(-1,3)
    pre_ground.append(float(coords[:,2].min()))
    samples.append(coords.copy())
    if frame==1:
        mesh.calc_loop_triangles()
        faces=np.array([tuple(tri.vertices) for tri in mesh.loop_triangles],dtype=np.int32)
        uv=np.zeros((len(mesh.vertices),2),dtype=np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    character.evaluated_get(deps).to_mesh_clear()

# Store any necessary floor correction as an editable, per-pose mesh shape key
# would precede skinning. Instead use a standard post-skin Geometry Nodes floor
# contact modifier, also evaluated below, so the saved source and PNGs agree.
group=bpy.data.node_groups.new('Hollow floor contact after skinning','GeometryNodeTree')
group.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry')
group.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
nodes=group.nodes;links=group.links
inp=nodes.new('NodeGroupInput');outp=nodes.new('NodeGroupOutput')
position=nodes.new('GeometryNodeInputPosition');split=nodes.new('ShaderNodeSeparateXYZ')
maximum=nodes.new('ShaderNodeMath');maximum.operation='MAXIMUM';maximum.inputs[1].default_value=-.5
combine=nodes.new('ShaderNodeCombineXYZ');setpos=nodes.new('GeometryNodeSetPosition')
links.new(inp.outputs['Geometry'],setpos.inputs['Geometry'])
links.new(position.outputs['Position'],split.inputs[0])
links.new(split.outputs['X'],combine.inputs['X']);links.new(split.outputs['Y'],combine.inputs['Y'])
links.new(split.outputs['Z'],maximum.inputs[0]);links.new(maximum.outputs[0],combine.inputs['Z'])
links.new(combine.outputs[0],setpos.inputs['Position']);links.new(setpos.outputs['Geometry'],outp.inputs['Geometry'])
modifier=character.modifiers.new('Floor contact corrective after skinning','NODES');modifier.node_group=group
samples=np.array(samples)
samples[:,:,2]=np.maximum(samples[:,:,2],-.5)
projection=scene.camera.calc_matrix_camera(deps,x=128,y=128,scale_x=1,scale_y=1)
mvp=projection @ scene.camera.matrix_world.inverted()
np.savez_compressed(out/'sampled-death.npz',positions=samples,faces=faces,uv=uv,mvp=np.array(mvp))
diagnostic=dict(frames=24,fps=12,loop=False,finalPoseHold=True,phases=dict(recoil=[0,3],buckle=[4,7],fall=[8,11],impact=12,settle=[13,19],hold=[20,23]),
    floor=-.5,preCorrectiveMinimumZ=pre_ground,maximumFloorCorrection=max(0,-.5-min(pre_ground)),poses=diagnostics)
(out/'death-profile.json').write_text(json.dumps(diagnostic,indent=2)+'\n')
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'hollow-death.blend'))
print(json.dumps({k:v for k,v in diagnostic.items() if k not in ['poses','preCorrectiveMinimumZ']}),flush=True)
