#!/usr/bin/env python3
"""CC0 anatomical topology -> original Hollowed H1 static sculpt blockout.

READ ONLY on the original CC0 reference. Everything created is isolated under
artifacts/hollow-rebuild/. No animation engine, rig, action, runtime asset, C#
gameplay or existing WyrmForge asset is loaded or modified.

This is a proportion/material-neutral anatomical authoring experiment, NOT an
approved original creature or an animation/production candidate. The creative
source is the edited .blend and its traceable reference, not a generated image.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw


# MakeHuman's hm08 `base.obj` contains 19,158 vertices, but the only
# visible naked human *skin* is 0..13,379. Everything after that is hidden
# authoring geometry for clothes/hair, teeth, joints and the ground.
# Official documentation: https://static.makehumancommunity.org/about/concepts/basemesh.html
# Importing all vertices is the root cause of the REJECTED v2 dress/hair render.
BODY_VERTEX_COUNT = 13380
FULL_VERTEX_COUNT = 19158
FULL_FACE_COUNT = 18486


def read_cc0_obj(path):
    points = []
    faces = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("v "):
            x, y, z = (float(v) for v in line.split()[1:4])
            points.append((x, y, z))
        elif line.startswith("f "):
            faces.append(tuple(int(p.split("/")[0]) - 1 for p in line.split()[1:]))
    if len(points) != FULL_VERTEX_COUNT or len(faces) != FULL_FACE_COUNT:
        raise ValueError(f"Unexpected MakeHuman core reference: {len(points)} verts / {len(faces)} faces")
    body_faces = [face for face in faces if all(0 <= index < BODY_VERTEX_COUNT for index in face)]
    excluded = len(faces) - len(body_faces)
    if len(body_faces) < 10000 or excluded < 1000:
        raise ValueError(f"Unexpected MakeHuman body/auxiliary split: {len(body_faces)} body faces, {excluded} helpers")
    return points[:BODY_VERTEX_COUNT], body_faces

def sculpt_base(points):
    """One-time authoring-space transformation; no animation or frame posing.

    Keep the CC0 human facial/limb topology, restore grounded legs, deform only
    upper-body mass/proportions. The eye/mouth/hand geometry is real source
    anatomy, rather than the smooth SDF cavities which visually failed.
    """
    floor = -8.4488
    factor = 3.12 / (8.4967 - floor)
    transformed = []
    for x, y, z in points:
        height = (y - floor) * factor
        side = x * factor
        depth = -z * factor
        t = max(0.0, min(1.0, (height - 1.05) / 1.75))
        center = t * t * (3 - 2 * t)
        # Exaggerated broken spine; bodily weight forward and to the left.
        side -= 0.22 * center
        depth -= 0.43 * center
        # Wasted torso, collapsed right shoulder and projecting left scapula.
        waist = math.exp(-((height - 1.55) / 0.40) ** 2)
        side *= 1.0 - 0.14 * waist
        shoulder = math.exp(-((height - 2.36) / 0.28) ** 2)
        if side < -0.24:
            height += 0.095 * shoulder
            side *= 1.0 + 0.13 * shoulder
        elif side > 0.20:
            height -= 0.10 * shoulder
        # Spinal torsion without breaking mesh/UV topology.
        side += 0.055 * center * math.sin(3.2 * height)
        transformed.append((side, depth, height))
    return transformed


def point_camera(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def material(name, rgba, emissive=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgba, 1)
    b.inputs["Roughness"].default_value = 0.91
    if emissive:
        b.inputs["Emission Color"].default_value = (*rgba, 1)
        b.inputs["Emission Strength"].default_value = 1.0
    return m


def create(source, out, augment_source=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    points, faces = read_cc0_obj(source)
    verts = sculpt_base(points)
    mesh = bpy.data.meshes.new("H1 biological anatomy (CC0 reference topology)")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    actor = bpy.data.objects.new("Hollowed H1 anatomical sculpt base — NOT approved", mesh)
    bpy.context.scene.collection.objects.link(actor)
    for poly in mesh.polygons:
        poly.use_smooth = True
    actor.data.materials.append(material("Neutral anatomy — no emissive fire", (.51, .49, .45)))
    actor["source_license"] = "CC0-1.0 (MakeHuman core asset)"
    actor["source_ref"] = "makehumancommunity/makehuman:makehuman/data/3dobjs/base.obj"
    actor["source_blob_sha"] = "d26635e9326e3cca30778fd7b9c00062b03cce09"
    actor["status"] = "H1 BODY-ONLY BLOCKOUT, NOT OWNER APPROVED OR RUNTIME INTEGRATED"
    actor["makehuman_body_only"] = True
    actor["excluded_helpers"] = "hair, skirt, tights, bones/joints, eyes and teeth, ground"
    # Optional static source-anatomy authoring only. This callback runs before
    # the eight proof renders. It cannot create runtime or animation clips.
    if augment_source is not None:
        augment_source(actor)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("H1 neutral material studio")
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (.09, .095, .105, 1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .45
    scene.world = world
    for label, position, energy, size in (
        ("Source clay key", (-4, -5, 7), 690, 4),
        ("Source clay rim", (3, 4, 7), 410, 4),
    ):
        light = bpy.data.lights.new(label, "AREA")
        obj = bpy.data.objects.new(label, light)
        scene.collection.objects.link(obj)
        obj.location = position
        light.energy = energy
        light.shape = "DISK"
        light.size = size
        point_camera(obj, (0, -.10, 1.65))
    camera = bpy.data.cameras.new("H1 eight-facing ORTHO — 28 degrees")
    cam = bpy.data.objects.new("H1 camera", camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    camera.type = "ORTHO"
    camera.ortho_scale = 4.05
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    # Save untextured editable source, no runtime assets or old animation files.
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "hollowed-cc0-anatomy-blockout.blend"))
    rendered = []
    labels = ("S", "SW", "W", "NW", "N", "NE", "E", "SE")
    for i, label in enumerate(labels):
        azimuth = 2 * math.pi * i / len(labels)
        cam.location = (7 * math.sin(azimuth), -7 * math.cos(azimuth), 5.4)
        point_camera(cam, (0, -.20, 1.57))
        path = out / f"cc0-anatomy-{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        image = Image.open(path).convert("RGB")
        ImageDraw.Draw(image).text((8, 8), f"{label} / BLENDER 3D H1 SOURCE / NOT APPROVED", fill=(233, 231, 221))
        rendered.append(image)
    sheet = Image.new("RGB", (320 * 4, 400 * 2))
    for i, image in enumerate(rendered):
        sheet.paste(image, ((i % 4) * 320, (i // 4) * 400))
    sheet.save(out / "cc0-source-8views-BLENDER.png")
    sheet.resize((96 * 4, 120 * 2), Image.Resampling.BOX).save(out / "cc0-source-native96-BLENDER.png")
    (out / "source-qc.json").write_text(json.dumps({
        "status": "H1 genuine Blender anatomical topology study, NOT visual approval",
        "source": str(source.name), "source_sha256": source_sha,
        "source_git_blob_sha": actor["source_blob_sha"],
        "source_license": "CC0-1.0", "license_url": "https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md",
        "mesh_vertices": len(mesh.vertices), "mesh_faces": len(mesh.polygons),
        "body_only": True, "rendered_helpers": False,
        "excluded_authoring_helper_vertices": FULL_VERTEX_COUNT - BODY_VERTEX_COUNT,
        "correction": "MakeHuman hm08 hair/skirt/tights helpers excluded by canonical vertex boundary",
        "render_angles": labels, "blender_version": bpy.app.version_string,
        "animation_engine_modified": False, "runtime_modified": False,
        "source_rigged": False, "owner_approved": False,
    }, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source = args.input.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    create(source, out)


if __name__ == "__main__":
    main()
