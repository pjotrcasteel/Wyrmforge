"""Blender 4.x authoring entrypoint for T1 sample mesh.

Run from repository root:
    blender --background --factory-startup --python tools/town/t1_import_export_blender.py

Generates an editable .blend, glTF .glb and PNG from the checked-in OBJ/MTL geometry.
Set TOWN_GEOMETRY_VARIANT=t2 for the detailed Gothic Town preview.
Both outputs are NONPRODUCTION and require owner visual approval.
"""
from pathlib import Path
import os
import bpy

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town/geometry"
VARIANTS = {"t1": "t1-central-square-preview", "t2": "t2-central-square-gothic"}
VARIANT = os.environ.get("TOWN_GEOMETRY_VARIANT", "t1")
if VARIANT not in VARIANTS:
    raise ValueError("TOWN_GEOMETRY_VARIANT must be t1 or t2")
PREFIX = VARIANTS[VARIANT]
SOURCE = ASSETS / f"{PREFIX}.obj"
BLEND = ASSETS / f"{PREFIX}.blend"
GLB = ASSETS / f"{PREFIX}.glb"
PREVIEW = ASSETS / f"{PREFIX}.png"

if not SOURCE.is_file():
    raise FileNotFoundError(SOURCE)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(SOURCE), forward_axis='Y', up_axis='Z',
                      use_split_objects=True, use_split_groups=True)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError(f"{VARIANT} OBJ importer returned no 3D mesh")
if len(meshes) < 5:
    raise RuntimeError(f"{VARIANT} OBJ groups were not preserved as separate semantic meshes")

# Mesh stays in real metric coordinates. Blender Z-up is converted to glTF Y-up
# by the glTF exporter, leaving the game's scene-schema axes as documented.
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
for obj in meshes:
    obj["town.schemaVersion"] = 1
    obj["town.previewOnly"] = True
    obj["town.semanticGroup"] = obj.name if obj.name.startswith("town.") else "town.center"

# Nonproduction reference camera and lights for mesh-quality review only.
# The actual game uses the universal LightingEngine, NOT Blender lights.
from mathutils import Vector

bpy.ops.object.camera_add(location=(7.5, -10, 8.8))
camera = bpy.context.object
camera.name = f"{VARIANT.upper()}_REFERENCE_CAMERA_NONPRODUCTION"
direction = Vector((0, 0, 1.0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 11
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(1.5, -1.4, 8.5))
source_light = bpy.context.object
source_light.name = f"{VARIANT.upper()}_REVIEW_LIGHT_NOT_GAME_LIGHT"
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
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
# Ubuntu's apt Blender build is compiled without OpenImageDenoiser.
scene.cycles.use_denoising = False
for layer in scene.view_layers:
    layer.cycles.use_denoising = False
scene.render.film_transparent = False

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
# Render independent visual QC first; a broken glTF exporter must not suppress the PNG.
bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB",
                           export_yup=True, export_apply=True)
if not all(p.is_file() and p.stat().st_size > 100 for p in (BLEND, GLB, PREVIEW)):
    raise RuntimeError(f"{VARIANT} export did not generate the .blend, .glb and PNG outputs")
print(f"{VARIANT.upper()} exported {len(meshes)} mesh groups: {BLEND}, {GLB}, {PREVIEW}")
