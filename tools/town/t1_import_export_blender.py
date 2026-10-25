"""Blender 4.x authoring entrypoint for T1 sample mesh.

Run from repository root:
    blender --background --factory-startup --python tools/town/t1_import_export_blender.py

Generates an editable .blend and a portable glTF .glb from the checked-in
OBJ/MTL geometry. This is a NONPRODUCTION calibration sample, never baked Town art.
"""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town/geometry"
SOURCE = ASSETS / "t1-central-square-preview.obj"
BLEND = ASSETS / "t1-central-square-preview.blend"
GLB = ASSETS / "t1-central-square-preview.glb"
PREVIEW = ASSETS / "t1-central-square-preview.png"

if not SOURCE.is_file():
    raise FileNotFoundError(SOURCE)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(SOURCE), forward_axis='Y', up_axis='Z',
                      use_split_objects=True, use_split_groups=True)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("T1 OBJ importer returned no 3D mesh")
if len(meshes) < 5:
    raise RuntimeError("T1 OBJ groups were not preserved as separate semantic meshes")

# Mesh stays in real metric coordinates. Blender Z-up is converted to glTF Y-up
# by the glTF exporter, leaving the game's scene-schema axes as documented.
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
for obj in meshes:
    obj["town.schemaVersion"] = 1
    obj["town.previewOnly"] = True
    obj["town.semanticGroup"] = "town.center"

# Nonproduction reference camera and lights for mesh-quality review only.
# The actual game uses the universal LightingEngine, NOT Blender lights.
from mathutils import Vector

bpy.ops.object.camera_add(location=(7.5, -10, 8.8))
camera = bpy.context.object
camera.name = "T1_REFERENCE_CAMERA_NONPRODUCTION"
direction = Vector((0, 0, 1.0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 11
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(1.5, -1.4, 8.5))
source_light = bpy.context.object
source_light.name = "T1_MESH_REVIEW_LIGHT_NOT_GAME_LIGHT"
source_light.data.energy = 800
source_light.data.shape = "DISK"
source_light.data.size = 8

world = bpy.context.scene.world
world.color = (0.13, 0.13, 0.16)
scene = bpy.context.scene
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW)
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in     bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys() else "BLENDER_EEVEE"
scene.render.film_transparent = False

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB",
                           export_yup=True, export_apply=True)
bpy.ops.render.render(write_still=True)
if not all(p.is_file() and p.stat().st_size > 100 for p in (BLEND, GLB, PREVIEW)):
    raise RuntimeError("T1 export did not generate the .blend, .glb and PNG outputs")
print(f"T1 exported {len(meshes)} mesh groups: {BLEND}, {GLB}, {PREVIEW}")
