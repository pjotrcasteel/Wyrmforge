"""Eight true orthographic directions with fixed density/pivot, alpha, and per-frame VFX landmarks."""
import argparse,json,math,sys,time,hashlib
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--motions',required=True);p.add_argument('--clips',default='all');p.add_argument('--directions',default='E,SE,S,SW,W,NW,N,NE');p.add_argument('--size',type=int,default=512);p.add_argument('--samples',type=int,default=24);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True);motions=json.loads(Path(a.motions).read_text());rig=bpy.data.objects['Zahmatorah_Skeleton'];rig.data.pose_position='POSE';scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=a.samples;scene.cycles.use_denoising=True;scene.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices();assert any(d.type=='OPTIX' for d in prefs.devices)
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';scene.render.resolution_x=a.size;scene.render.resolution_y=a.size;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Animation neutral studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.18,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
center=Vector((3.8,0,2.4))
def aim(ob):ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
for name,offset,power,size in [('Key',(-6,-8,12),2700,8),('Fill',(4,6,8),1900,7),('Rim',(8,-2,6),2200,6)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=center+Vector(offset);aim(ob)
cam=bpy.data.objects.new('Sprite camera',bpy.data.cameras.new('Sprite camera'));scene.collection.objects.link(cam);scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=22
angles={'E':0,'SE':45,'S':90,'SW':135,'W':180,'NW':225,'N':270,'NE':315};clips=list(motions['clips']) if a.clips=='all' else a.clips.split(',');dirs=a.directions.split(',');manifest={'schema':'wyrmforge-directional-source/1','source':bpy.data.filepath,'sourceSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'fps':12,'cell':a.size,'orthoScale':22,'cameraElevation':35.26438968,'directions':dirs,'directionAngles':angles,'sourceForward':'-X','up':'+Z','rig':'Zahmatorah_Skeleton','clips':{},'runtimeIntegrated':False};start=time.time()
def pixel(pos):
 q=world_to_camera_view(scene,cam,pos);return [round(q.x*a.size,4),round((1-q.y)*a.size,4)]
for name in clips:
 spec=motions['clips'][name];action=bpy.data.actions[spec['action']];rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];clip={'frames':[],'fps':12,'loop':spec['loop'],'duration':spec['duration'],'travelPerCycle':spec['travelPerCycle'],'events':spec['events'],'directions':{}};frames=list(range(1,spec['intervals']+1,2))
 if not spec['loop']:frames.append(spec['intervals']+1)
 clip['frameCount']=len(frames);clip['sourceFrames']=frames
 for direction in dirs:
  angle=math.radians(90+angles[direction]);cam.location=center+Vector((math.cos(angle)*40,math.sin(angle)*40,40/math.sqrt(2)));aim(cam);bpy.context.view_layer.update();pivot=pixel(Vector((2.19,0,0)));records=[];folder=out/name/direction;folder.mkdir(parents=True,exist_ok=True)
  for index,frame in enumerate(frames):
   path=folder/('%03d.png'%index);scene.frame_set(frame);bpy.context.view_layer.update()
   if not path.exists():scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
   b=rig.pose.bones;mouth=(b['UpperHead'].tail+b['LowerHead'].tail)*.5;fwd=(b['UpperHead'].tail-b['UpperHead'].head).normalized();mouth+=fwd*.2
   attachments={'mouth':pixel(mouth),'head':pixel(b['Head'].head),'chest':pixel(b['Spine01'].head),'pelvis':pixel(b['Spine03'].head),'foreLeft':pixel(b['Arm_l'].tail),'foreRight':pixel(b['Arm_r'].tail),'hindLeft':pixel(b['Feet_l'].head),'hindRight':pixel(b['Feet_r'].head),'tailTip':pixel(b['Tail10'].tail)}
   records.append({'frame':index,'sourceFrame':frame,'path':str(path.relative_to(out)).replace('\\','/'),'pivot':pivot,'attachments':attachments,'mouthDirection':[round(x,5) for x in fwd]})
  clip['directions'][direction]=records
 manifest['clips'][name]=clip;(out/'render-manifest.json').write_text(json.dumps(manifest,indent=2));print('CLIP_RENDERED',name,len(frames)*len(dirs),'elapsed',round(time.time()-start,1),flush=True)
manifest['elapsedSeconds']=time.time()-start;(out/'render-manifest.json').write_text(json.dumps(manifest,indent=2));print('ALL_RENDERED',manifest['elapsedSeconds'],flush=True)
