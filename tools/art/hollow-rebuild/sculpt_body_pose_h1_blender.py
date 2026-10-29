#!/usr/bin/env python3
"""Hollowed H1 body/pose prototype: REAL original 70-bone rig + source skin.

Owner-directed order: body proportions and line of action FIRST; no materials,
hair, cloth, facial details, glow, clips or game integration. This isolated
candidate must be rejected or approved visually before further sculpting.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from PIL import Image, ImageDraw


REVIEW_ROOT = (Path.cwd() / "artifacts/hollow-rebuild").resolve()
FACINGS = ("front", "front-right", "right", "back-right",
           "back", "back-left", "left", "front-left")


def bell(value, mean, spread):
    return math.exp(-((value - mean) / spread) ** 2)


def world_head(rig, name):
    return rig.matrix_world @ rig.pose.bones[name].head


def rotate_existing_bone(rig, name, axis, radians):
    """Compose with existing authored source pose, never replace its rotation."""
    bone = rig.pose.bones.get(name)
    if bone is None:
        raise ValueError(f"Missing original 70-bone source rig joint: {name}")
    frame = (rig.matrix_world.to_3x3() @ bone.bone.matrix_local.to_3x3())
    local = frame.inverted() @ Vector(axis)
    local.normalize()
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion(local, radians)


def proportion_shape(mesh):
    """Large anatomical masses on the ORIGINAL connected skinned source mesh.

    Only broad torso/shoulder/pelvis volumes. No detached overlays, floating
    bone geometry, costume pieces, textures or emission.
    """
    keys = mesh.data.shape_keys.key_blocks if mesh.data.shape_keys else ()
    if len(keys) != 2 or keys[-1].value < .99:
        raise ValueError("Expected genuine existing editable CC0 body source")
    before_verts = len(mesh.data.vertices)
    previous = keys[-1]

    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(deps)
    copy = evaluated.to_mesh()
    try:
        if len(copy.vertices) != before_verts:
            raise ValueError("Evaluated body topology has been altered")
        positions = [(mesh.matrix_world @ v.co,
                      (mesh.matrix_world.to_3x3() @ v.normal).normalized())
                     for v in copy.vertices]
    finally:
        evaluated.to_mesh_clear()

    key = mesh.shape_key_add(name="H1 body FIRST — bony shoulders narrow waist collapsed torso",
                             from_mix=False)
    key.relative_key = previous
    inverse = mesh.matrix_world.inverted().to_3x3()
    changed = 0
    max_deform = 0.0
    group_counts = {"shoulders": 0, "ribcage": 0, "waist": 0, "pelvis": 0}
    for index, (point, normal) in enumerate(positions):
        x, y, z = (float(point[0]), float(point[1]), float(point[2]))
        torso = bell(z, 2.32, .40) * bell(abs(x), .19, .70)
        shoulders = bell(z, 2.52, .19) * bell(abs(x), .45, .27)
        waist = bell(z, 1.91, .24) * bell(abs(x), .21, .34)
        pelvis = bell(z, 1.55, .20) * bell(abs(x), .21, .30)
        ribs = bell(z, 2.24, .23) * bell(abs(x), .29, .25)
        asymmetry = (1 if x >= 0 else -.60)

        # Broad connected shape language: sharp uneven acromion, lean narrow
        # abdomen, somewhat prominent ribs, protective raised scapulae.
        dx = (0.073 * shoulders + .027 * ribs - .082 * waist
              - .045 * pelvis) * (1 if x > 0 else -1)
        dy = (.080 * shoulders * max(0.0, normal.y)
              + .038 * torso * max(0.0, normal.y)
              - .047 * ribs * max(0.0, -normal.y)
              + .011 * asymmetry * shoulders)
        dz = (.022 * shoulders * asymmetry
              - .021 * torso * max(0.0, -normal.y))

        change = Vector((dx, dy, dz))
        if change.length > .0035:
            key.data[index].co = previous.data[index].co + inverse @ change
            max_deform = max(max_deform, change.length)
            changed += 1
            if shoulders > .55:
                group_counts["shoulders"] += 1
            if ribs > .55:
                group_counts["ribcage"] += 1
            if waist > .55:
                group_counts["waist"] += 1
            if pelvis > .55:
                group_counts["pelvis"] += 1
        else:
            key.data[index].co = previous.data[index].co
    key.value = 1.
    bpy.context.view_layer.update()
    if changed < 200 or max_deform > .20 or max_deform < .03:
        raise ValueError(f"Unsafe torso proportion change: {changed}, {max_deform}")
    if len(mesh.data.vertices) != before_verts:
        raise ValueError("Original skin topology was unexpectedly altered")
    return {"changed_connected_skin_vertices": changed,
            "max_world_proportion_adjustment_m": round(max_deform, 5),
            "mass_region_vertices": group_counts,
            "source_shape_keys": len(mesh.data.shape_keys.key_blocks)}


def compose_pose(rig):
    """Physically weighted feral stance from original rig bones, no keyframes."""
    hip_before = world_head(rig, "joint1").copy()
    neck_before = world_head(rig, "joint4").copy()
    wrists_before = (world_head(rig, "joint12").copy(),
                     world_head(rig, "joint12.001").copy())

    # Chest buckles forward at the diaphragm; thoracic spine rounds and
    # head leads ahead of pelvis. +X rotation bends upright Z toward -Y
    # (source front). Unequal scapulae break the mannequin symmetry.
    rotate_existing_bone(rig, "joint2", (1, 0, 0), .23)
    rotate_existing_bone(rig, "joint3", (1, 0, 0), .17)
    rotate_existing_bone(rig, "joint4", (1, 0, 0), -.12)
    rotate_existing_bone(rig, "Clav_L", (0, 0, 1), -.09)
    rotate_existing_bone(rig, "Clav_R", (0, 0, 1), .07)

    # Restrained stagger/bent knees; foot contacts must subsequently be
    # checked as genuine source mesh bounds, not inferred from bone tails.
    rotate_existing_bone(rig, "joint5", (1, 0, 0), .055)
    rotate_existing_bone(rig, "joint64", (1, 0, 0), -.085)
    rotate_existing_bone(rig, "joint6", (1, 0, 0), -.035)
    rotate_existing_bone(rig, "joint6.001", (1, 0, 0), .085)

    bpy.context.view_layer.update()
    hip_after = world_head(rig, "joint1")
    neck_after = world_head(rig, "joint4")
    wrists_after = (world_head(rig, "joint12"),
                    world_head(rig, "joint12.001"))

    relative_before = neck_before - hip_before
    relative_after = neck_after - hip_after
    forward = float(relative_before.y - relative_after.y)
    if not .045 < forward < .60:
        raise ValueError(f"Feral spine must visibly lean forward without folding: {forward:.5f}")
    if not 0.40 < float(relative_after.z) < 1.6:
        raise ValueError(f"Collapsed torso moved head outside plausible body: {tuple(relative_after)}")
    drops = [round(float(b.z-a.z), 5) for a, b in zip(wrists_before, wrists_after)]
    return {"neck_forward_vs_original_m": round(forward, 5),
            "neck_height_from_hip_m": round(float(relative_after.z), 5),
            "wrist_height_changes_m": drops,
            "original_rig_bones": len(rig.data.bones),
            "pose_bones_modified": ["joint2", "joint3", "joint4", "Clav_L",
                                    "Clav_R", "joint5", "joint64",
                                    "joint6", "joint6.001"]}


def evaluated_bounds(mesh):
    graph = bpy.context.evaluated_depsgraph_get()
    obj = mesh.evaluated_get(graph)
    source = obj.to_mesh()
    try:
        points = [obj.matrix_world @ vertex.co for vertex in source.vertices]
        low = Vector(tuple(min(v[k] for v in points) for k in range(3)))
        high = Vector(tuple(max(v[k] for v in points) for k in range(3)))
    finally:
        obj.to_mesh_clear()
    return low, high


def flat_material(name, rgb, silhouette=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    if silhouette:
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        emission = nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (*rgb, 1)
        emission.inputs["Strength"].default_value = 1.
        mat.node_tree.links.new(emission.outputs[0], out.inputs["Surface"])
    else:
        bsdf = nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*rgb, 1)
        bsdf.inputs["Roughness"].default_value = .94
        bsdf.inputs["Metallic"].default_value = 0.
        bsdf.inputs["Emission Strength"].default_value = 0.
    return mat


def real_views(output, body):
    """TRUE Blender views from unchanged evaluated 3D skin; no AI render."""
    lower, upper = evaluated_bounds(body)
    delta = upper - lower
    if not 2.65 < float(delta.z) < 3.8:
        raise ValueError(f"Full-body source height out of expected range: {delta}")
    if not 0.0 <= float(lower.z) <= .4:
        raise ValueError(f"Original feet/legs are displaced off ground: {lower.z:.4f}")
    center = (lower + upper) / 2
    center.z += .05
    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        raise ValueError("Existing source inspection camera absent")
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(1.24 * float(delta.z),
                                  1.26 * float(delta.x) * 400 / 320,
                                  1.26 * float(delta.y) * 400 / 320)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 18
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    color = flat_material("H1 PROPORTIONS ONLY clay / no art materials", (.59, .57, .53))
    silhouette = flat_material("H1 black silhouette ONLY", (.025, .027, .030), True)
    world = scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")

    for variant in ("silhouette", "clay"):
        bpy.context.view_layer.material_override = silhouette if variant == "silhouette" else color
        background.inputs["Color"].default_value = ((.60, .61, .62, 1) if variant == "silhouette"
                                                     else (.075, .080, .092, 1))
        background.inputs["Strength"].default_value = 1.0
        frames = []
        for i, name in enumerate(FACINGS):
            angle = math.tau * i / 8
            camera.location = (float(center.x + 6.0*math.sin(angle)),
                               float(center.y - 6.0*math.cos(angle)),
                               float(center.z + .40))
            direction = center - camera.location
            camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
            dest = output / f"real-body-{variant}-{name}-BLENDER.png"
            scene.render.filepath = str(dest)
            bpy.ops.render.render(write_still=True)
            with Image.open(dest) as source:
                frame = source.convert("RGB")
            ImageDraw.Draw(frame).text((8, 8), f"{name} | BODY/POSE ONLY",
                                       fill=(15, 15, 15) if variant == "silhouette"
                                       else (235, 235, 235))
            frames.append(frame)

        sheet = Image.new("RGB", (1280, 800), (22, 23, 25))
        for index, frame in enumerate(frames):
            sheet.paste(frame, (index%4*320, index//4*400))
        sheet.save(output / f"real-body-{variant}-8views-BLENDER.png")
        native = Image.new("RGB", (96*4, 120*2))
        for i, frame in enumerate(frames):
            native.paste(frame.resize((96, 120), Image.Resampling.BOX),
                         (i%4*96, i//4*120))
        native.save(output / f"real-body-{variant}-native96-BLENDER.png")
        if variant == "clay":
            turn = Image.new("RGB", (960, 400))
            for ix, frame_i in enumerate((0, 2, 4)):
                turn.paste(frames[frame_i], (ix*320, 0))
            turn.save(output/"real-body-clay-FRONT-SIDE-BACK-BLENDER.png")

    bpy.context.view_layer.material_override = None
    return {"source_dimensions_m": [round(float(v), 5) for v in delta],
            "source_foot_min_z": round(float(lower.z), 5),
            "native_96px_views": 8,
            "real_blender_clay_and_silhouette": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output == REVIEW_ROOT or not output.is_relative_to(REVIEW_ROOT):
        raise ValueError("Only isolated Hollowed art output is permitted")
    output.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()), load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    rig = bpy.data.objects.get("Armature.002")
    bodies = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(bodies) != 1 or rig is None or len(rig.data.bones) != 70:
        raise ValueError("Input must be original 70-bone source and one intact skinned body")
    if len(bpy.data.actions) > 0:
        raise ValueError("Animation engine or actions must not enter isolated body sculpt")
    body = bodies[0]
    original_geometry = (len(body.data.vertices), len(body.data.polygons),
                         len(body.vertex_groups))
    proportions = proportion_shape(body)
    pose = compose_pose(rig)
    views = real_views(output, body)
    if original_geometry != (len(body.data.vertices), len(body.data.polygons),
                             len(body.vertex_groups)):
        raise ValueError("Reference source topology and skin weighting must survive")
    if len(bpy.data.actions) > 0:
        raise ValueError("No source motion actions may be generated")
    bpy.context.preferences.filepaths.save_version = 0
    target = output / "Hollowed-H1-body-pose-source-NOT-APPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    report = {
        "status": "Body/pose source iteration, visual review required",
        "visual_target": "Owner-selected 29 October 2026 Wyrmforge Hollowed",
        "stage": "proportions and rest silhouette BEFORE details",
        "original_connected_topology_and_weights_preserved": True,
        "proportions": proportions,
        "pose": pose,
        "views": views,
        "source_blend": target.name,
        "actions": len(bpy.data.actions),
        "animation_engine_modified": False,
        "runtime_modified": False,
        "approved": False
    }
    (output/"body-pose-QC.json").write_text(json.dumps(report, indent=2)+"\n",
                                            encoding="utf-8")
    print("HOLLOWED BODY AND POSE SOURCE QC", json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
