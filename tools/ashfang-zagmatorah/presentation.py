"""Physical presentation light/camera scene; explicitly not the gameplay camera."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Review already exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath).resolve();scene=bpy.context.scene
missing=[im.name for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).is_file()]
if missing:raise RuntimeError('Missing textures '+str(missing))
scene.render.engine='CYCLES';scene.cycles.samples=80;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
if not any(d.type=='OPTIX' for d in prefs.devices):raise RuntimeError('No OptiX')
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world=bpy.data.worlds.new('Charcoal studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.05,.065,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.3
scene.view_settings.exposure=.6
target=Vector((-.5,0,2.6))
def aim(o,point):o.rotation_euler=(point-o.location).to_track_quat('-Z','Y').to_euler()
for name,offset,power,size,color in [('Softbox',(-6,-8,10),11000,7,(.84,.89,1)),('Warm rim',(4,5,9),12000,5,(1,.37,.11)),('Fill',(-4,7,5),4000,6,(.65,.75,1))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=target+Vector(offset);aim(obj,target)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.08));floor=bpy.context.object;floor.name='Presentation floor, not creature geometry';mat=bpy.data.materials.new('Neutral dark floor');mat.diffuse_color=(.018,.017,.016,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.018,.017,.016,1);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85;floor.data.materials.append(mat)
cam=bpy.data.objects.new('Hero presentation camera',bpy.data.cameras.new('Hero presentation camera'));scene.collection.objects.link(cam);cam.location=(-13,-16,7);cam.data.lens=48;aim(cam,target);scene.camera=cam
# Rebase source texture links exactly once for this deeper review folder.
for im in bpy.data.images:
    if im.source=='FILE' and im.filepath and not im.packed_file:
        absolute=bpy.path.abspath(im.filepath);im.filepath=bpy.path.relpath(absolute,start=str(out))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-presentation.blend'),compress=True,relative_remap=False)
scene.render.filepath=str(out/'hero.png');bpy.ops.render.render(write_still=True)
(out/'presentation.json').write_text(json.dumps({'source':str(source),'camera':'Perspective 48mm static hero presentation; not gameplay camera','renderer':'Cycles OptiX','samples':80,'completed':True,'ownerAccepted':False,'missingDependencies':missing},indent=2))
