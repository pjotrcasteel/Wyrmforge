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

if not SOURCE.is_file():
    raise FileNotFoundError(SOURCE)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(SOURCE))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("T1 OBJ importer returned no 3D mesh")

# Mesh stays in real metric coordinates. Blender Z-up is converted to glTF Y-up
# by the glTF exporter, leaving the game's scene-schema axes as documented.
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0
for obj in meshes:
    obj["town.schemaVersion"] = 1
    obj["town.previewOnly"] = True
    obj["town.semanticGroup"] = "town.center"

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB",
                           export_yup=True, export_apply=True)
print(f"T1 sample mesh exported: {len(meshes)} objects, {BLEND}, {GLB}")
