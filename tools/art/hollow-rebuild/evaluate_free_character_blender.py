#!/usr/bin/env python3
"""Isolated editable-source evaluation of a legally obtained free creature asset.

Run via Blender 4.5 LTS in background with --disable-autoexec. Does NOT edit
animations or gameplay, invoke an engine, export runtime atlases, or download
third-party assets. A matching license record must be provided explicitly.

Example:
  blender --background --factory-startup --disable-autoexec --python \
    tools/art/hollow-rebuild/evaluate_free_character_blender.py -- \
    --input /local/downloads/zombie.glb \
    --license-file /local/downloads/LICENSE.txt \
    --license CC-BY-4.0 --author 'Original artist' \
    --source-url https://example.org/artist/model \
    --output artifacts/hollow-rebuild/free-source-evaluation
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw


LABELS = ("S", "SW", "W", "NW", "N", "NE", "E", "SE")
RECOGNIZED_LICENSES = ("CC0-1.0", "CC-BY-4.0", "GAME-USE-ONLY")


def arguments():
    # Blender CLI passes script args after '--'; standalone bpy Python uses
    # normal argv without that separator. Both are supported deliberately.
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--license-file", type=Path, required=True)
    parser.add_argument("--license", choices=RECOGNIZED_LICENSES, required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--author", required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args(argv)


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1048576), b""):
            digest.update(block)
    return digest.hexdigest()


def load_source(path):
    extension = path.suffix.lower()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if extension == ".glb" or extension == ".gltf":
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif extension == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    elif extension == ".blend":
        with bpy.data.libraries.load(str(path), link=False) as (src, dest):
            dest.objects = list(src.objects)
        for obj in dest.objects:
            if obj is not None and obj.name not in bpy.context.scene.objects:
                bpy.context.scene.collection.objects.link(obj)
    else:
        raise ValueError("Only original .blend, .glb/.gltf or .fbx is accepted")

    # Preserve the static asset/armature/weights, but discard imported
    # animation actions and tracks in this *new* scene. Source stays untouched.
    for obj in bpy.data.objects:
        obj.animation_data_clear()
        if obj.type == "ARMATURE" and obj.pose is not None:
            for bone in obj.pose.bones:
                bone.location = (0.0, 0.0, 0.0)
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
                bone.scale = (1.0, 1.0, 1.0)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action, do_unlink=True)
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if not meshes:
        raise ValueError("No mesh was imported")
    if len(meshes) > 100:
        raise ValueError("Unexpected large source scene; select one character")
    return meshes


def normalize(meshes, target_height=3.1):
    points = []
    for obj in meshes:
        if len(obj.data.vertices) == 0:
            continue
        sample_stride = max(1, len(obj.data.vertices) // 25000)
        # bpy_prop_collection is not a Python list: Blender 4.5 rejects
        # stepped slices. Index by integer so large mesh samples remain valid.
        points.extend(obj.matrix_world @ obj.data.vertices[i].co
                      for i in range(0, len(obj.data.vertices), sample_stride))
    if not points:
        raise ValueError("All imported meshes were empty")
    xs, ys, zs = ([float(p[i]) for p in points] for i in range(3))
    low = Vector((min(xs), min(ys), min(zs)))
    high = Vector((max(xs), max(ys), max(zs)))
    dimensions = high - low
    if dimensions.z <= .01 or dimensions.z > 100000:
        raise ValueError(f"Invalid source character height: {dimensions.z}")
    if max(dimensions.x, dimensions.y) > 4 * dimensions.z:
        raise ValueError("A large floor/scene is included in the character asset")
    root = bpy.data.objects.new("Hollowed candidate static source root — NOT APPROVED", None)
    bpy.context.scene.collection.objects.link(root)
    original = {obj: obj.matrix_world.copy() for obj in bpy.context.scene.objects
                if obj != root and obj.parent is None}
    for obj, matrix in original.items():
        obj.parent = root
        obj.matrix_world = matrix
    ratio = target_height / dimensions.z
    root.scale = (ratio,) * 3
    root.location = (-ratio * (low.x + high.x) / 2,
                     -ratio * (low.y + high.y) / 2,
                     -ratio * low.z)
    return dict(source_height=round(dimensions.z, 6),
                normalized_height=target_height, uniform_scale=round(ratio, 6))


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def studio():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("Neutral grey H1 art review")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.045, .05, .06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .6
    scene.world = world
    for name, position, power in (
        ("H1 neutral key", (-4, -5, 6), 550),
        ("H1 neutral rim", (3, 3, 5), 350),
    ):
        data = bpy.data.lights.new(name, "AREA")
        lamp = bpy.data.objects.new(name, data)
        scene.collection.objects.link(lamp)
        lamp.location = position
        data.energy = power
        data.shape = "DISK"
        data.size = 4
        look_at(lamp, (0, 0, 1.5))
    data = bpy.data.cameras.new("H1 source inspection orthographic")
    camera = bpy.data.objects.new("H1 camera", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    data.type = "ORTHO"
    data.ortho_scale = 3.95
    clay = bpy.data.materials.new("H1 material neutral clay — emission OFF")
    clay.use_nodes = True
    bsdf = clay.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (.57, .54, .49, 1)
    bsdf.inputs["Roughness"].default_value = .95
    return camera, clay


def render_study(out, camera, clay, surface):
    bpy.context.view_layer.material_override = clay if surface == "clay" else None
    sheet = Image.new("RGB", (320 * 4, 400 * 2), (15, 16, 19))
    for i, facing in enumerate(LABELS):
        angle = math.tau * i / 8.0
        camera.location = (7 * math.sin(angle), -7 * math.cos(angle), 5.0)
        look_at(camera, (0, 0, 1.55))
        path = out / f"source-{surface}-{facing}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        with Image.open(path) as frame:
            img = frame.convert("RGB")
        ImageDraw.Draw(img).text((6, 6), f"{facing} | BLENDER | UNAPPROVED", fill=(240, 239, 237))
        sheet.paste(img, (320 * (i % 4), 400 * (i // 4)))
    sheet.save(out / f"source-{surface}-8views-BLENDER.png")
    sheet.resize((96 * 4, 120 * 2), Image.Resampling.BOX).save(
        out / f"source-{surface}-native96-BLENDER.png")
    bpy.context.view_layer.material_override = None


def main():
    a = arguments()
    source = a.input.resolve()
    license_file = a.license_file.resolve()
    if not source.is_file() or not license_file.is_file():
        raise FileNotFoundError("Both the original source file and its license record are required")
    if not a.source_url.startswith("https://") or not a.author.strip():
        raise ValueError("A real source URL and artist credit are mandatory")
    if a.license == "GAME-USE-ONLY":
        raise ValueError("Do not repackage restricted assets in public GitHub/CI artifacts")
    out = a.output.resolve()
    allowed_output = (Path.cwd() / "artifacts" / "hollow-rebuild").resolve()
    if not out.is_relative_to(allowed_output) or out == allowed_output:
        raise ValueError("Evaluation output must remain inside artifacts/hollow-rebuild only")
    out.mkdir(parents=True, exist_ok=True)
    meshes = load_source(source)
    scale = normalize(meshes)
    camera, clay = studio()
    render_study(out, camera, clay, "clay")
    render_study(out, camera, clay, "material")
    bpy.ops.file.pack_all()
    result = {
        "status": "THIRD-PARTY SOURCE EVALUATION — NO ART APPROVAL",
        "source_name": source.name, "sha256": file_sha256(source),
        "license": a.license, "license_text_sha256": file_sha256(license_file),
        "author": a.author, "source_url": a.source_url,
        "blender": bpy.app.version_string, "meshes": len(meshes),
        "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
        "uv_meshes": sum(bool(obj.data.uv_layers) for obj in meshes),
        "armature_objects": len([o for o in bpy.data.objects if o.type == "ARMATURE"]),
        "actions_remaining": len(bpy.data.actions),
        "base_animations_imported_into_evaluation": False,
        "animation_engine_modified": False, "runtime_modified": False,
        "owner_approved": False, "scale": scale,
    }
    if result["actions_remaining"] != 0:
        raise RuntimeError("Source still contains animation actions; refuse to save")
    (out / "source-review.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    bpy.context.scene.render.filepath = ""
    camera.location = (4.95, -4.95, 5.0)
    look_at(camera, (0, 0, 1.55))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "imported-hollowed-source-UNAPPROVED.blend"))


if __name__ == "__main__":
    main()
