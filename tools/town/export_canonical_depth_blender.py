"""Editable canonical WyrmForge Town: textured, volumetric, fixed-camera 3D.

Blender invocation (from repository root):
    blender --background --factory-startup --python tools/town/export_canonical_depth_blender.py

The pixel colors come ONLY from the approved existing painting. This script
exports real 3D topology and authorable semantic volumes, not new paintings.
The reconstruction is SINGLE-VIEW: arbitrary free-camera inspection exposes
unobserved surfaces. Do not call it an arbitrary-angle photogrammetric scan.
"""
from pathlib import Path
from math import hypot
import ast
import re
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town"
SOURCE = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/js/town/town-canonical-projection.js"
OUTPUT = ASSETS / "geometry"
W, H, PX_PER_METRE = 1672, 941, 94.1
COLS, ROWS = 216, 122


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def rect(x, y, l, t, r, b, softness=22):
    return 1.0 - smooth(0, softness, hypot(max(l - x, 0, x - r), max(t - y, 0, y - b)))


def oval(x, y, cx, cy, rx, ry):
    return 1.0 - smooth(.94, 1.04, hypot((x - cx) / rx, (y - cy) / ry))


def source_depth(x, y):
    depth = -3.8 + 1.7 * smooth(50, 880, y) + 2.5 * smooth(120, 540, y)
    gate = rect(x, y, 605, 32, 1070, 347, 48) * (1 - smooth(315, 360, y))
    turrets = max(rect(x, y, 610, 12, 736, 245, 18),
                  rect(x, y, 955, 12, 1070, 245, 18))
    depth += (.85 * gate + 1.2 * turrets) * (1 - .6 * oval(x, y, 841, 221, 127, 151))
    depth += .95 * oval(x, y, 841, 487, 115, 83) + 1.1 * rect(x, y, 774, 379, 912, 463, 12)
    depth += 1.4 * rect(x, y, 0, 300, 475, 820, 40) * (1 - smooth(480, 650, x))
    depth += 1.4 * rect(x, y, 1250, 290, 1672, 820, 40) * smooth(1080, 1220, x)
    depth += 1.15 * rect(x, y, 0, 0, 440, 290, 55)
    depth += 1.15 * rect(x, y, 1230, 0, 1672, 310, 55)
    return depth + 1.5 * rect(x, y, 0, 810, 1672, 940, 90)


def masks_from_canonical_js():
    source = SOURCE.read_text(encoding="utf-8")
    pattern = r"volume\('([a-z0-9-]+)',([\d.]+),([\d.]+),(\[\[.*?\]\])\)"
    found = [(name, float(depth), float(thick), ast.literal_eval(points))
             for name, depth, thick, points in re.findall(pattern, source)]
    if len(found) != 24:
        raise RuntimeError(f"Expected 24 source-authoritative semantic volumes; got {len(found)}")
    return found


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.resolution_x = 390
scene.render.resolution_y = 844
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
# Headless GitHub runners have no EGL context; use deterministic CPU Cycles.
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
# Ubuntu's apt Blender build is compiled without OpenImageDenoiser.
for layer in scene.view_layers:
    layer.cycles.use_denoising = False

bpy.ops.object.camera_add(location=(8, -12, 12))
camera = bpy.context.object
camera.name = "CANONICAL_FIXED_TOWN_CAMERA"
camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
# Blender ortho_scale measures visible VERTICAL world height, whereas
# LightingEngine.setCamera specifies horizontal half-width. Preserve
# the 941px source height and 390x844 portrait aspect exactly.
camera.data.ortho_scale = H / PX_PER_METRE
scene.camera = camera
bpy.context.view_layer.update()
basis = camera.matrix_world.to_3x3()
right = basis @ Vector((1, 0, 0))
up = basis @ Vector((0, 1, 0))
toward = basis @ Vector((0, 0, 1))


def to_world(x, y, depth):
    return right * ((x - W / 2) / PX_PER_METRE) + \
        up * ((H / 2 - y) / PX_PER_METRE) + toward * depth


def calibrated_depth(x, y):
    base = source_depth(x, y)
    px, py = (x - W / 2) / PX_PER_METRE, (H / 2 - y) / PX_PER_METRE
    if abs(toward.z) < .001:
        raise RuntimeError("Town camera cannot resolve level 3D paving")
    ground_depth = -(right.z * px + up.z * py) / toward.z
    left_building = rect(x, y, 0, 300, 475, 820, 38) * (1 - smooth(475, 600, x))
    right_building = rect(x, y, 1250, 280, 1672, 820, 38) * smooth(1050, 1250, x)
    weight = smooth(250, 620, y) * (1 - .96 * left_building) * (1 - .96 * right_building)
    return base * (1 - weight) + ground_depth * weight


painting = bpy.data.images.load(str(ASSETS / "night-active.webp"), check_existing=True)
material = bpy.data.materials.new("APPROVED_TOWN_NIGHT_CANONICAL_PIXELS")
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
image_node = nodes.new("ShaderNodeTexImage")
image_node.image = painting
image_node.interpolation = "Linear"
emission = nodes.new("ShaderNodeEmission")
emission.inputs["Strength"].default_value = 1
output = nodes.new("ShaderNodeOutputMaterial")
material.node_tree.links.new(image_node.outputs["Color"], emission.inputs["Color"])
material.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])


def make_object(name, vertices, faces, pixel_for_vertex):
    mesh = bpy.data.meshes.new(name + ".mesh")
    mesh.from_pydata([tuple(point) for point in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    uv_layer = mesh.uv_layers.new(name="Approved painting projection")
    for polygon in mesh.polygons:
        for loop_id in polygon.loop_indices:
            uv = pixel_for_vertex[mesh.loops[loop_id].vertex_index]
            uv_layer.data[loop_id].uv = (uv[0] / W, 1 - uv[1] / H)
    obj["town.schemaVersion"] = 1
    obj["town.singleView"] = True
    obj["town.previewOnly"] = True
    return obj


vertices = []
source_pixels = []
for row in range(ROWS + 1):
    for column in range(COLS + 1):
        x, y = W * column / COLS, H * row / ROWS
        vertices.append(to_world(x, y, calibrated_depth(x, y)))
        source_pixels.append((x, y))
faces = []
for row in range(ROWS):
    for column in range(COLS):
        a = row * (COLS + 1) + column
        faces.append((a, a + COLS + 1, a + COLS + 2, a + 1))
ground = make_object("Town_3D_Canonical_Continuous_Depth", vertices, faces, source_pixels)
ground["town.paintedDepthMin"] = -3.8
ground["town.cameraMatchesApprovedSource"] = True

for name, depth, thickness, points in masks_from_canonical_js():
    n = len(points)
    vertices = [to_world(x, y, depth) for x, y in points]
    vertices += [to_world(x, y, depth - thickness) for x, y in points]
    source_pixels = list(points) + list(points)
    # Blender mesh faces reference vertex INDICES; tessellate_polygon returns
    # Vector coordinates and cannot be used directly as from_pydata indices.
    # Preserve authored concave perimeter as an ngon; Blender triangulates it.
    faces = [tuple(range(n)), tuple(i + n for i in reversed(range(n)))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    obj = make_object("Town_3D_" + name, vertices, faces, source_pixels)
    obj["town.semanticId"] = "town." + name
    obj["town.solidDepthMetres"] = thickness

scene.view_settings.view_transform = "Standard"
scene.render.filepath = str(OUTPUT / "t2-canonical-projected-3d.png")
OUTPUT.mkdir(parents=True, exist_ok=True)
blend = OUTPUT / "t2-canonical-projected-3d.blend"
glb = OUTPUT / "t2-canonical-projected-3d.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", export_yup=True)
bpy.ops.render.render(write_still=True)
for path in [blend, glb, Path(scene.render.filepath)]:
    if not path.is_file() or path.stat().st_size < 100:
        raise RuntimeError(f"Missing exported canonical 3D artifact: {path}")
print(f"Canonical fixed-camera 3D export complete: {blend}, {glb}, {scene.render.filepath}")
