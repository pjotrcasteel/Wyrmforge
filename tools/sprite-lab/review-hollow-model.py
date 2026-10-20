"""Blender: save editable initial model and four neutral identity-review renders."""
import bpy
import math
from mathutils import Vector
from pathlib import Path
import sys

folder = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(folder / 'hollow-initial.glb'))
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
low = Vector([min(point[i] for point in corners) for i in range(3)])
high = Vector([max(point[i] for point in corners) for i in range(3)])
size = high - low
# TRELLIS coordinates use Z up. Trimesh GLB writes raw coordinates, while the
# glTF importer applies its Y-up convention. Restore the original coordinates.
if size.y > size.z:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for obj in objects:
        obj.rotation_euler.x -= math.pi / 2
    bpy.context.view_layer.update()
corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
low = Vector([min(point[i] for point in corners) for i in range(3)])
high = Vector([max(point[i] for point in corners) for i in range(3)])
center = (low + high) / 2
height = high.z - low.z
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.render.resolution_x = 512
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.world.color = (0.3, 0.3, 0.3)
for location, energy, diameter in [((2, -3, 4), 250, 3), ((-3, -1, 2), 100, 3), ((0, 3, 3), 150, 2)]:
    bpy.ops.object.light_add(type='AREA', location=center + Vector(location) * height / 2)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = height * diameter / 2
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = height * 1.2
review = folder / 'review'
review.mkdir(exist_ok=True)
for name, angle in [('front', 0), ('three-quarter', 45), ('side', 90), ('back', 180)]:
    radians = math.radians(angle)
    camera.location = center + Vector((math.sin(radians) * height * 3, -math.cos(radians) * height * 3, height * 0.15))
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(review / (name + '.png'))
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(folder / 'hollow-initial-review.blend'))
