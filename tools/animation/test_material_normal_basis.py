"""Independent analytic-plane render checks of the real source normal exporter.

blender -b --python-exit-code 1 --python tools/animation/test_material_normal_basis.py
Synthetic geometry only; not character art or visual acceptance.
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Euler,Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from source_material_normals import camera_normal_colour
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=4;s.render.resolution_x=s.render.resolution_y=16;s.render.resolution_percentage=100;s.view_settings.view_transform='Raw';s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
bpy.ops.mesh.primitive_plane_add(size=4);plane=bpy.context.object
m=bpy.data.materials.new('analytic normal');m.use_nodes=True;tree=m.node_tree;tree.nodes.clear();geometry=tree.nodes.new('ShaderNodeNewGeometry');emission=tree.nodes.new('ShaderNodeEmission');output=tree.nodes.new('ShaderNodeOutputMaterial');tree.links.new(camera_normal_colour(tree,geometry.outputs['Normal']),emission.inputs['Color']);tree.links.new(emission.outputs[0],output.inputs['Surface']);plane.data.materials.append(m)
camera=bpy.data.cameras.new('analytic camera');camera.type='ORTHO';camera.ortho_scale=2;ob=bpy.data.objects.new('camera',camera);s.collection.objects.link(ob);s.camera=ob
folder=Path(__file__).resolve().parents[2]/'artifacts/an-normal-basis-qc';folder.mkdir(parents=True,exist_ok=True);results=[]
for cam_angles in [(0,0,0),(.2,.3,.1)]:
 ob.rotation_euler=cam_angles;rotation=Euler(cam_angles).to_matrix();ob.location=rotation@Vector((0,0,3))
 for angles in [(0,0,0),(.3,-.4,.1),(-.2,.25,-.1)]:
  plane.rotation_euler=angles;bpy.context.view_layer.update();normal=rotation.transposed()@(Euler(angles).to_matrix()@Vector((0,0,1)));expected=[(v+1)*.5 for v in normal]
  file=folder/f'{len(results)}.png';s.render.filepath=str(file);bpy.ops.render.render(write_still=True);image=bpy.data.images.load(str(file),check_existing=False);image.colorspace_settings.name='Non-Color';measured=list(image.pixels[(8*16+8)*4:(8*16+8)*4+3]);error=max(abs(a-b) for a,b in zip(measured,expected));assert error<2/255,(angles,cam_angles,measured,expected,error);results.append({'cameraEuler':cam_angles,'planeEuler':angles,'expected':expected,'measured':measured,'maximumChannelError':error});bpy.data.images.remove(image)
(folder/'normal-basis-qc.json').write_text(json.dumps({'measurement':'analytic plane normals projected independently through camera world rotation','normalBasis':'camera-right/up/toward','results':results},indent=2)+'\n');print('NORMAL_BASIS_PASS',len(results),'independent plane/camera combinations')
