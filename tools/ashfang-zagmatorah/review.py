"""Fresh-process reopen validation and fixed-camera source reviews."""
import argparse, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).parent))
from import_source import inventory, sha
p=argparse.ArgumentParser(); p.add_argument('--output',required=True); p.add_argument('--render',action='store_true'); a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
r=inventory(); r['source']=bpy.data.filepath; r['sourceSha256']=sha(Path(bpy.data.filepath))
r['missingDependencies']=[i['name'] for i in r['images'] if not i['packed'] and not i['exists']]
r['packedDependencies'] = sum(i['packed'] for i in r['images'])
r['animationSamples']=[]
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.data.objects if o.type=='MESH')
old=rig.animation_data.action if rig.animation_data else None
for action in bpy.data.actions:
    rig.animation_data_create(); rig.animation_data.action=action
    poses=[]
    for f in (action.frame_range[0],sum(action.frame_range)/2,action.frame_range[1]):
        bpy.context.scene.frame_set(int(f)); bpy.context.view_layer.update()
        evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        coords=[evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
        poses.append(coords)
    movement=max((v-poses[0][i]).length for pose in poses[1:] for i,v in enumerate(pose))
    r['animationSamples'].append({'name':action.name,'maxSampledVertexTravel':movement,'sampleFrames':[action.frame_range[0],sum(action.frame_range)/2,action.frame_range[1]]})
rig.animation_data.action=old
rig.data.pose_position='REST'; bpy.context.view_layer.update()
(out/'validation.json').write_text(json.dumps(r,indent=2))
if not a.render: raise SystemExit()
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX'; prefs.get_devices()
devices=[{'name':d.name,'type':d.type} for d in prefs.devices]
gpu=[d for d in prefs.devices if d.type=='OPTIX']
if not gpu: raise RuntimeError('OptiX unavailable; explicit render-profile decision required')
for d in prefs.devices: d.use=d.type=='OPTIX'
scene.cycles.device='GPU'; scene.cycles.use_denoising=True
scene.render.resolution_x=900; scene.render.resolution_y=650; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Review world'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.18,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
points=[mesh.matrix_world@Vector(c) for c in mesh.bound_box]
center=sum(points,Vector())/8
radius=max((v-center).length for v in points)
def aim(ob,target): ob.rotation_euler=(target-ob.location).to_track_quat('-Z','Y').to_euler()
for name,offset,power,size in [('Key',(-6,-8,12),2500,8),('Fill',(4,6,8),1800,7),('Rim',(8,-2,6),2200,6)]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.location=center+Vector(offset); aim(ob,center)
cam=bpy.data.objects.new('Review camera',bpy.data.cameras.new('Review camera')); scene.collection.objects.link(cam); scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=radius*2.15
views={'three-quarter':(-1.1,-1.8,1.0),'side':(0,-2,.65),'front':(-2,0,.65)}
for name,direction in views.items():
    cam.location=center+Vector(direction).normalized()*radius*3; aim(cam,center)
    scene.render.filepath=str(out/(name+'.png')); bpy.ops.render.render(write_still=True)
(out/'render-device.json').write_text(json.dumps({'devices':devices,'selected':'OPTIX','completedViews':list(views)},indent=2))
print('ASHFANG_REVIEW_COMPLETE',str(out))
