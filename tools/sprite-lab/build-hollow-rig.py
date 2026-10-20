"""Blender source authoring: deformable textured Hollow, planted-foot shamble.

The original 3D mesh is skinned; frames are camera renders of this one source.
"""
import bpy
import math
import json
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector, Matrix, Quaternion

folder = Path(sys.argv[sys.argv.index('--')+1])
out = folder / (sys.argv[sys.argv.index('--')+2] if len(sys.argv)>sys.argv.index('--')+2 else 'rigged-pixel-v1')
out.mkdir(exist_ok=False)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
source = np.load(folder / 'textured-rgb-v2/textured-mesh.npz')
v, faces, uv = source['vertices'], source['faces'], source['uv']
data = bpy.data.meshes.new('Hollow persistent textured surface')
data.from_pydata(v.tolist(), [], faces.tolist())
data.update()
character = bpy.data.objects.new('Hollow skinned character', data)
bpy.context.collection.objects.link(character)
layer = data.uv_layers.new(name='AppearanceUV')
for polygon in data.polygons:
    polygon.use_smooth = True
    for loop_index in polygon.loop_indices:
        layer.data[loop_index].uv = uv[data.loops[loop_index].vertex_index]
material = bpy.data.materials.new('Baked bone and ragged brown cloth')
material.use_nodes = True
nodes = material.node_tree.nodes
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(folder / 'textured-rgb-v2/hollow-albedo.png'))
texture.image.pack()
texture.interpolation = 'Closest'
shader = nodes.get('Principled BSDF')
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
shader.inputs['Roughness'].default_value = 0.95
# The appearance source already contains light/shadow cues. A restrained
# emission contribution preserves pixel readability beneath the game-view light.
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Emission Color'])
shader.inputs['Emission Strength'].default_value = 0.35
character.data.materials.append(material)

bones = {}
def bone(name, head, tail, parent=None, deform=True):
    bones[name] = dict(head=np.array(head, dtype=float), tail=np.array(tail, dtype=float), parent=parent, deform=deform)

bone('root', (0,0,-.5), (0,0,-.4), deform=False)
bone('pelvis', (0,.015,-.025), (0,.005,.07), 'root')
bone('spine', (0,.005,.07), (0,-.01,.19), 'pelvis')
bone('chest', (0,-.01,.19), (0,-.028,.31), 'spine')
bone('neck', (0,-.028,.31), (0,-.045,.37), 'chest')
bone('head', (0,-.045,.37), (0,-.04,.49), 'neck')
for side, sign in [('L',1), ('R',-1)]:
    shoulder=(sign*.102,-.018,.282)
    elbow=(sign*.174,-.035,.105)
    wrist=(sign*.235,-.075,-.045)
    hand=(sign*.267,-.108,-.145)
    bone('clavicle.'+side, (0,-.025,.28), shoulder, 'chest')
    bone('upper_arm.'+side, shoulder, elbow, 'clavicle.'+side)
    bone('forearm.'+side, elbow, wrist, 'upper_arm.'+side)
    bone('hand.'+side, wrist, hand, 'forearm.'+side)
    bone('thigh.'+side, (sign*.069,.015,-.025), (sign*.086,-.035,-.235), 'pelvis')
    bone('shin.'+side, (sign*.086,-.035,-.235), (sign*.09,.015,-.445), 'thigh.'+side)
    bone('foot.'+side, (sign*.09,.015,-.445), (sign*.095,-.115,-.48), 'shin.'+side)
    bone('cloth.'+side, (sign*.055,.06,-.025), (sign*.08,.085,-.34), 'pelvis')

armature = bpy.data.armatures.new('Hollow deformation skeleton')
rig = bpy.data.objects.new('Hollow editable animation rig', armature)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, spec in bones.items():
    b = armature.edit_bones.new(name)
    b.head, b.tail, b.use_deform = spec['head'], spec['tail'], spec['deform']
    if spec['parent']:
        b.parent = armature.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front = True
modifier = character.modifiers.new('True weighted skeletal deformation', 'ARMATURE')
modifier.object = rig
modifier.use_deform_preserve_volume = True
character.parent = rig

# Anatomical regional weight painting. UV-seam duplicates receive identical
# weights from position. Cloth has dedicated secondary controls, not leg weights.
names = [name for name in bones if bones[name]['deform']]
for name in names:
    character.vertex_groups.new(name=name)
def distance_to_segment(points, a, b):
    direction=b-a
    fraction=np.clip(((points-a)*direction).sum(1)/(direction@direction),0,1)
    return np.linalg.norm(points-(a+fraction[:,None]*direction),axis=1)
distances=np.stack([distance_to_segment(v,bones[n]['head'],bones[n]['tail']) for n in names],axis=1)
allowed=np.ones_like(distances,dtype=bool)
for index, p in enumerate(v):
    x,y,z=p
    side='L' if x>=0 else 'R'
    if z>.345:
        permitted=['head','neck','chest']
    elif abs(x)>.115+max(0,.12-z)*.22 and z<.29 and z>-.22:
        permitted=['clavicle.'+side,'upper_arm.'+side,'forearm.'+side,'hand.'+side]
        if z>.20: permitted+=['chest']
    elif z<-.065:
        cloth=(y>.085 and z>-.38) or (abs(x)<.047 and z>-.41)
        permitted=['cloth.'+side,'pelvis'] if cloth else ['thigh.'+side,'shin.'+side,'foot.'+side]
        if z<-.45: permitted=['foot.'+side]
    elif z<.04:
        permitted=['pelvis','spine','thigh.'+side,'cloth.'+side]
    else:
        permitted=['pelvis','spine','chest','neck','head','clavicle.'+side,'upper_arm.'+side]
    allowed[index]=[n in permitted for n in names]
scores=np.where(allowed,1/np.maximum(distances,.008)**4,0)
strongest=np.argsort(scores,axis=1)[:,-3:]
weights=np.zeros_like(scores)
np.put_along_axis(weights,strongest,np.take_along_axis(scores,strongest,axis=1),axis=1)
weights/=weights.sum(1,keepdims=True)
for i,row in enumerate(weights):
    for j in np.where(row>.001)[0]:
        character.vertex_groups[names[j]].add([i],float(row[j]),'REPLACE')

rest={name: armature.bones[name].matrix_local.copy() for name in bones}
for pose in rig.pose.bones:
    pose.rotation_mode='QUATERNION'

def set_segment(name, head, tail):
    head,tail=Vector(head),Vector(tail)
    rest_direction=Vector(bones[name]['tail']-bones[name]['head'])
    rotation=rest_direction.rotation_difference(tail-head).to_matrix() @ rest[name].to_3x3()
    matrix=rotation.to_4x4()
    matrix.translation=head
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def transform(point, origin, rotation, offset):
    return Vector(origin)+rotation@(Vector(point)-Vector(origin))+Vector(offset)

def foot_path(phase):
    stance=.62
    sweep=.19
    if phase<stance:
        return -.5*sweep+sweep*phase/stance, 0., True
    t=(phase-stance)/(1-stance)
    eased=t*t*(3-2*t)
    return .5*sweep-sweep*eased,.034*math.sin(math.pi*t)**1.3,False

def ik(hip,ankle,l1,l2):
    direction=ankle-hip
    length=direction.length
    direction.normalize()
    along=(l1*l1-l2*l2+length*length)/(2*length)
    pole=Vector((0,-1,0))
    pole-=direction*pole.dot(direction)
    pole.normalize()
    return hip+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))

diagnostics=[]
def pose_walk(phase, frame):
    angle=2*math.pi*phase
    offset=Vector((.012*math.cos(angle),0,-.035+.007*math.cos(2*angle)))
    body_rotation=Quaternion((0,0,1),.055*math.sin(angle)) @ Quaternion((1,0,0),math.radians(10)+.018*math.sin(2*angle))
    pelvis_origin=Vector(bones['pelvis']['head'])
    point=lambda p: transform(p,pelvis_origin,body_rotation,offset)
    set_segment('root',bones['root']['head'],bones['root']['tail'])
    for name in ['pelvis','spine','chest','neck','head']:
        set_segment(name,point(bones[name]['head']),point(bones[name]['tail']))
    for side,sign,shift in [('L',1,0),('R',-1,.5)]:
        p=(phase+shift)%1
        swing=math.sin(2*math.pi*p)
        shoulder=point(bones['upper_arm.'+side]['head'])
        set_segment('clavicle.'+side,point(bones['clavicle.'+side]['head']),shoulder)
        upper_vector=Vector(bones['upper_arm.'+side]['tail']-bones['upper_arm.'+side]['head'])
        upper_rotation=Quaternion((0,1,0),sign*math.radians(10)) @ Quaternion((1,0,0),.12*swing)
        elbow=shoulder+upper_rotation@body_rotation@upper_vector
        set_segment('upper_arm.'+side,shoulder,elbow)
        fore_vector=Vector(bones['forearm.'+side]['tail']-bones['forearm.'+side]['head'])
        wrist=elbow+Quaternion((1,0,0),-.12+.07*math.sin(2*math.pi*(p-.12)))@upper_rotation@body_rotation@fore_vector
        set_segment('forearm.'+side,elbow,wrist)
        hand_vector=Vector(bones['hand.'+side]['tail']-bones['hand.'+side]['head'])
        hand=wrist+Quaternion((1,0,0),.08*math.sin(2*math.pi*(p-.2)))@upper_rotation@body_rotation@hand_vector
        set_segment('hand.'+side,wrist,hand)
        hip=Vector(bones['thigh.'+side]['head'])+offset
        travel,lift,planted=foot_path(p)
        ankle=Vector((sign*.09,.015+travel,-.445+lift))
        l1=np.linalg.norm(bones['thigh.'+side]['tail']-bones['thigh.'+side]['head'])
        l2=np.linalg.norm(bones['shin.'+side]['tail']-bones['shin.'+side]['head'])
        knee=ik(hip,ankle,l1,l2)
        set_segment('thigh.'+side,hip,knee)
        set_segment('shin.'+side,knee,ankle)
        toe=ankle+Vector(bones['foot.'+side]['tail']-bones['foot.'+side]['head'])
        set_segment('foot.'+side,ankle,toe)
        cloth_head=point(bones['cloth.'+side]['head'])
        cloth_direction=Vector(bones['cloth.'+side]['tail']-bones['cloth.'+side]['head'])
        cloth_rotation=Quaternion((1,0,0),.045*math.sin(2*math.pi*(p-.16)))
        set_segment('cloth.'+side,cloth_head,cloth_head+cloth_rotation@body_rotation@cloth_direction)
        diagnostics.append(dict(frame=frame,side=side,phase=p,stance=planted,
                                ankle=list(ankle),knee=list(knee),hip=list(hip)))

rig.animation_data_create()
walk=bpy.data.actions.new('Hollow_Shamble')
rig.animation_data.action=walk
samples=16
for frame in range(samples+1):
    pose_walk(frame/samples, frame+1)
    for pose in rig.pose.bones:
        pose.keyframe_insert('location',frame=frame+1,group=pose.name)
        pose.keyframe_insert('rotation_quaternion',frame=frame+1,group=pose.name)
        pose.keyframe_insert('scale',frame=frame+1,group=pose.name)
for curve in walk.fcurves:
    for key in curve.keyframe_points:
        key.interpolation='BEZIER'
        key.handle_left_type=key.handle_right_type='AUTO_CLAMPED'
scene=bpy.context.scene
scene.frame_start=1
scene.frame_end=samples
scene.render.fps=12
scene.frame_set(1)
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=False
scene.render.resolution_x=96
scene.render.resolution_y=96
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.view_settings.gamma=1
scene.world=bpy.data.worlds.new('Quiet dark-fantasy fill')
scene.world.color=(.12,.12,.15)
for location,energy,size in [((-2,-3,4),45,2),((2,1,3),18,2)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    lamp=bpy.context.object
    lamp.data.energy=energy
    lamp.data.size=size
    lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.2,-3.2,2.6))
camera=bpy.context.object
target=Vector((0,0,-.03))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=1.55
scene.camera=camera
(out/'gait-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
profile=dict(cell=[96,96],frames=samples,fps=12,cycleSeconds=samples/12,
             stanceFraction=.62,sweepModelUnits=.19,travelModelUnitsPerCycle=.19/.62,
             actorWorldHeight=60,travelWorldUnitsPerCycle=.19/.62*60,
             direction='three-quarter front',pixelSampling='native 96px camera; fixed-palette export',
             ownerAccepted=False,runtimeIntegrated=False)
(out/'export-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'hollow-rigged.blend'))
print('Saved rigged source',len(data.vertices),'vertices',len(bones),'bones',flush=True)
