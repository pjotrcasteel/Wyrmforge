"""Preserve an editable neutral-review snapshot and render four real views.

blender --background --disable-autoexec INPUT --python SCRIPT -- --output-dir NEW_DIR
No geometry, weights or actions are rewritten. Original input remains untouched.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument("--output-dir", required=True)
p.add_argument("--resolution", type=int, default=512)
p.add_argument("--samples", type=int, default=32)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:])
out = Path(a.output_dir).resolve()
if out.exists():
    raise RuntimeError("Output must be a new revision directory")
source = Path(bpy.data.filepath).resolve()
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
body = bpy.data.objects.get("Ashfang skinned character")
if body is None or body.type != "MESH":
    raise RuntimeError("Expected recovered Ashfang skinned mesh")
out.mkdir(parents=True)
scene = bpy.context.scene
scene.frame_set(1)
for ob in bpy.data.objects:
    if ob.type == "ARMATURE":
        ob.data.pose_position = "REST"
    if ob.type == "MESH":
        ob.hide_render = ob != body
points = [body.matrix_world @ Vector(c) for c in body.bound_box]
low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
center = (low + high) / 2
span = max(high - low)
mat = bpy.data.materials.new("Recovery neutral clay (review override)")
mat.diffuse_color = (0.4, 0.4, 0.4, 1)
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.4, 0.4, 0.4, 1)
bsdf.inputs["Roughness"].default_value = 0.75
bpy.context.view_layer.material_override = mat
world = bpy.data.worlds.new("Recovery neutral world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.12, 0.12, 0.12, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
scene.world = world
for ob in scene.objects:
    if ob.type == "LIGHT":
        ob.hide_render = True
for name, delta, power in [("Key", (1, -1, 2), 1200), ("Fill", (-1, 1, 1), 650)]:
    data = bpy.data.lights.new("Recovery " + name, "AREA")
    data.energy = power * span * span / 25
    data.shape = "DISK"
    data.size = span
    ob = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(ob)
    ob.location = center + Vector(delta) * span
    ob.rotation_euler = (center - ob.location).to_track_quat("-Z", "Y").to_euler()
cam_data = bpy.data.cameras.new("Recovery orthographic camera")
cam = bpy.data.objects.new(cam_data.name, cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.type = "ORTHO"
cam_data.ortho_scale = span * 1.35
cam_data.clip_end = span * 20
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"
prefs.get_devices()
for device in prefs.devices:
    device.use = device.type == "OPTIX" and "5090" in device.name
if not any(d.use for d in prefs.devices):
    raise RuntimeError("RTX 5090 OptiX device unavailable; no silent fallback")
scene.cycles.device = "GPU"
scene.cycles.samples = a.samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = a.resolution
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
results = []
for label, degrees in [("front", 0), ("side", 90), ("rear", 180), ("three-quarter", 45)]:
    theta = math.radians(degrees)
    cam.location = center + Vector((math.sin(theta), -math.cos(theta), 0.32)) * span * 3
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(out / (label + ".png"))
    # Save before rendering, retaining original actions, materials and packed images.
    if not results:
        bpy.ops.wm.save_as_mainfile(filepath=str(out / "ashfang-neutral-review.blend"))
    start = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    results.append({"view": label, "azimuthDegrees": degrees,
                    "elapsedSeconds": time.perf_counter() - start})
report = {"source": str(source), "sourceSha256": source_hash,
          "snapshotSha256": hashlib.sha256((out / "ashfang-neutral-review.blend").read_bytes()).hexdigest(),
          "blender": bpy.app.version_string, "device": "RTX 5090 OptiX",
          "samples": a.samples, "resolution": a.resolution, "views": results,
          "axisNotice": "Front assumes legacy -Y; verify skull orientation visually.",
          "ownerApproved": False, "geometryChanged": False,
          "status": "Recovered legacy rest-pose review; not a new completed M1 model."}
if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
    raise RuntimeError("Original source changed")
(out / "review.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
