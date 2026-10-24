"""Blender render prerequisite only; the sphere is not character art."""
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add()
bpy.ops.object.camera_add(location=(0, -5, 0))
camera = bpy.context.object
camera.rotation_euler = (1.57079632679, 0, 0)
bpy.context.scene.camera = camera
bpy.ops.object.light_add(type='AREA', location=(0, -3, 3))
bpy.context.object.data.energy = 500
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
scene.cycles.use_denoising = False
scene.render.resolution_x = 64
scene.render.resolution_y = 64
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = '/tmp/wyrmforge-render-smoke.png'
bpy.ops.render.render(write_still=True)
