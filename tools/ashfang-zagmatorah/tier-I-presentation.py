"""Reproducible neutral stage; presentation geometry never changes the character master."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--samples',type=int,default=96);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene;rig=bpy.data.objects['Zahmatorah_Skeleton'];rig.data.pose_position='REST';bpy.context.view_layer.material_override=None
scene.render.engine='CYCLES';scene.cycles.samples=a.samples;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices();assert any(d.type=='OPTIX' for d in prefs.devices)
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('Neutral charcoal studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.06,.075,.1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
stage=bpy.data.collections.new('Review stage only');scene.collection.children.link(stage)
def stage_only(ob):
 for c in list(ob.users_collection):c.objects.unlink(ob)
 stage.objects.link(ob)
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.42));floor=bpy.context.object;floor.name='Review floor';stage_only(floor);mat=bpy.data.materials.new('Matte slate review floor');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.022,.028,.038,1);bs.inputs['Roughness'].default_value=.92;floor.data.materials.append(mat)
for name,pos,power,size,color in [('Soft key',(-5,-7,11),2200,7,(1,.94,.88)),('Cool fill',(-2,7,8),1600,6,(.75,.84,1)),('Silhouette rim',(6,3,10),2800,6,(1,.86,.7))]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=color;ob=bpy.data.objects.new(name,light);stage.objects.link(ob);ob.location=pos;aim(ob,(0,0,2))
cam=bpy.data.objects.new('Review camera',bpy.data.cameras.new('Review camera'));stage.objects.link(cam);scene.camera=cam;cam.data.type='ORTHO'
views=[('hero',(-6,-17,9),(3.6,0,1.65),18.5),('portrait',(-10,-12,7),(-1.55,0,2.4),8.6),('side',(3,-20,6),(3.8,0,1.6),19.5),('head',(-8,-8,5),(-3.05,0,3.05),4.4)]
for name,pos,target,scale in views:
 cam.location=pos;aim(cam,target);cam.data.ortho_scale=scale;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
(out/'presentation.json').write_text(json.dumps({'source':bpy.data.filepath,'device':'OPTIX','samples':a.samples,'views':[v[0] for v in views],'masterAnatomyChanged':False,'stageSavedIntoMaster':False},indent=2))
