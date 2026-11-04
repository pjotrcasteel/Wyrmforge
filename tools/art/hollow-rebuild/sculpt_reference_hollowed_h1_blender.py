#!/usr/bin/env python3
"""Reference-led Hollowed H1 art study. ORIGINAL editable Blender geometry only.

Owner reference 29 Oct: feral undead with tangled hair, wounded face, long claws,
short torn waist wrap, fragmented back and ember fissures. This is a silhouette
exploration, not a completed sculpt, animation, approval, or gameplay asset.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


def source_renderer():
    source = Path(__file__).with_name("evaluate_free_character_blender.py")
    spec = importlib.util.spec_from_file_location("reference_h1_renderer", source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def matte(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = .95
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Emission Strength"].default_value = 0
    return material


def bind_mesh(name, vertices, faces, body, rig, bone_name, material):
    """Convert authored posed WORLD vertices to original armature rest coords."""
    bone = rig.pose.bones.get(bone_name)
    if bone is None:
        raise ValueError("Original source armature bone missing: " + bone_name)
    transform = (
        body.matrix_world.inverted()
        @ rig.matrix_world
        @ bone.bone.matrix_local
        @ bone.matrix.inverted()
        @ rig.matrix_world.inverted()
    )
    mesh = bpy.data.meshes.new(name + " source")
    mesh.from_pydata([tuple(transform @ Vector(point)) for point in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world = body.matrix_world.copy()
    obj.data.materials.append(material)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("EXISTING source rig only", "ARMATURE")
    modifier.object = rig
    obj["owner_approved"] = False
    obj["source_only"] = True
    obj["animation_actions_added"] = 0
    return obj


def tube(samples, radius, sides=4):
    points = [Vector(p) for p in samples]
    vertices, faces = [], []
    if len(points) < 3:
        raise ValueError("Anatomical strand requires at least three points")
    for i, point in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] -
                   points[max(0, i - 1)]).normalized()
        normal = tangent.cross(Vector((0, 1, 0)))
        if normal.length < .01:
            normal = tangent.cross(Vector((1, 0, 0)))
        normal.normalize()
        other = tangent.cross(normal).normalized()
        thickness = max(.08, (1 - i / (len(points) - 1)) ** .70)
        for k in range(sides):
            angle = math.tau * k / sides
            offset = normal * math.cos(angle) + other * math.sin(angle)
            vertices.append(tuple(point + radius * thickness * offset))
        if i:
            for k in range(sides):
                j = (k + 1) % sides
                faces.append(((i - 1) * sides + k, (i - 1) * sides + j,
                              i * sides + j, i * sides + k))
    return vertices, faces


def append_piece(vertices, faces, new_vertices, new_faces):
    offset = len(vertices)
    vertices.extend(new_vertices)
    faces.extend(tuple(index + offset for index in face) for face in new_faces)


def bounds_of(obj):
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(graph)
    mesh = evaluated.to_mesh()
    try:
        vertices = [evaluated.matrix_world @ v.co for v in mesh.vertices]
        lower = Vector(tuple(min(p[i] for p in vertices) for i in range(3)))
        upper = Vector(tuple(max(p[i] for p in vertices) for i in range(3)))
        return lower, upper
    finally:
        evaluated.to_mesh_clear()


def tangled_hair(skull, body, rig):
    """True 3D head-bound matted strands, rooted inside the measured skull."""
    rng = random.Random(29102026)
    lower, upper = bounds_of(skull)
    center = (lower + upper) / 2
    radius_x = min(.22, max(.10, (upper.x - lower.x) * .57))
    radius_y = min(.19, max(.09, (upper.y - lower.y) * .55))
    vertices, faces = [], []
    front_count = 0
    strands = 104
    for index in range(strands):
        angle = math.tau * (index + rng.uniform(-.3, .3)) / strands
        dx, dy = math.cos(angle), math.sin(angle)
        front = dy < -.25
        front_count += int(front)
        root = Vector((center.x + radius_x * .82 * dx,
                       center.y + radius_y * .76 * dy,
                       upper.z - .052 - rng.random() * .13))
        length = (.21 + rng.random() * .29) if front else (.40 + rng.random() * .37)
        if front and abs(dx) < .35:
            length *= .7  # retain recognisable brow, eye and mouth
        wave = .028 + .06 * rng.random()
        samples = []
        for step in range(9):
            t = step / 8
            samples.append((
                root.x + dx * (.01 + .092 * t) + wave * math.sin(8*t + 5*angle) * t,
                root.y + dy * (.01 + .06 * t) + .027 * math.sin(5*t + 2*angle) * t,
                root.z - length * t
            ))
        v, f = tube(samples, .011 + rng.random() * .009)
        append_piece(vertices, faces, v, f)
    if front_count < 20 or len(vertices) > 5000:
        raise ValueError("Hair source exceeds bounded native-scale coverage")
    bind_mesh("H1 tangled ash hair SOURCE", vertices, faces, body, rig, "joint4",
              matte("H1 matted ash hair", (.091, .075, .065)))
    return {"strands": strands, "front_strands": front_count, "vertices": len(vertices)}


def torn_belt_and_waist_panels(body, rig):
    """Original short leather waist-wrap, not the rejected long coat/cape."""
    rng = random.Random(12343)
    bone = "joint2" if rig.pose.bones.get("joint2") else "joint3"
    vertices, faces = [], []
    count = 0
    for index in range(22):
        if index % 7 == 5:
            continue
        angle = math.tau * index / 22
        base_z = 1.42 + .018 * math.sin(index * 2.8)
        length = .22 + .30 * rng.random()
        if math.sin(angle) < -.40:
            length += .12
        half_span = .11 + (.06 if index % 4 == 0 else .027)
        panel = []
        for row in range(5):
            t = row / 4
            for sign in (-1, 1):
                a = angle + sign * half_span * (.53 + .23*t)
                edge = .035 * math.sin(index*2.3 + sign*1.8) if row == 4 else 0
                radial = 1 + .11*t + .028*math.sin(t*math.pi)
                panel.append((.26*radial*math.cos(a), .19*radial*math.sin(a),
                              base_z - length*t + edge))
        quads = [(2*j, 2*j+1, 2*j+3, 2*j+2) for j in range(4)]
        append_piece(vertices, faces, panel, quads)
        count += 1
    bind_mesh("H1 short ripped waist wrap SOURCE", vertices, faces, body, rig, bone,
              matte("H1 weathered soot leather", (.085, .066, .052)))
    return {"panels": count, "vertices": len(vertices), "bound_existing_bone": bone}


def measured_back_spines(body, rig):
    """Place anatomy on the evaluated skin, not arbitrary floating coordinates."""
    graph = bpy.context.evaluated_depsgraph_get()
    evaluation = body.evaluated_get(graph)
    mesh = evaluation.to_mesh()
    try:
        world = [evaluation.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluation.to_mesh_clear()
    rng = random.Random(16455)
    vertices, faces = [], []
    count = 0
    for row, z in enumerate((2.12, 2.24, 2.36, 2.48)):
        for side in (-1, 1):
            for slot in range(3):
                x = side * (.105 + slot * .091)
                candidates = [p for p in world if abs(p.x - x) < .072
                              and abs(p.z - z) < .10 and p.y > 0]
                if not candidates:
                    continue
                root = max(candidates, key=lambda point: point.y)
                outward = side * (.024 + .018*slot)
                points = (root - Vector((0, .019, .015)),
                          root + Vector((outward * .36, .03, 0)),
                          root + Vector((outward, .07+slot*.01, .025+row*.008)))
                v, f = tube(points, .028 + rng.random()*.013, 5)
                append_piece(vertices, faces, v, f)
                count += 1
    if count < 10:
        raise ValueError("Back plates must be rooted in original evaluated skin")
    bind_mesh("H1 riven back bony spines SOURCE", vertices, faces, body, rig,
              "joint3", matte("H1 matte volcanic char shards", (.061, .051, .046)))
    return {"embedded_spines": count, "vertices": len(vertices)}


def matte_ash_skin(body):
    """Nonemissive char/flesh study. Universal lighting integration stays locked."""
    material = matte("H1 owner-reference rotting ash skin", (.16, .13, .105))
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes.get("Principled BSDF")
    coords = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 13
    noise.inputs["Detail"].default_value = 4
    links.new(coords.outputs["Generated"], noise.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .23
    ramp.color_ramp.elements[0].color = (.052, .042, .039, 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (.235, .166, .132, 1)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    body.data.materials.clear()
    body.data.materials.append(material)
    return material.name


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    root = (Path.cwd() / "artifacts/hollow-rebuild").resolve()
    if output == root or not output.is_relative_to(root):
        raise ValueError("Source review may only write into isolated art artifacts")
    output.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()), load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    rig = bpy.data.objects.get("Armature.002")
    body = next((o for o in bpy.data.objects if o.type == "MESH" and
                 o.name.startswith("WyrmForge Hollowed H1 true body")), None)
    skull = next((o for o in bpy.data.objects if o.type == "MESH" and
                  "actual CC0 SKULL" in o.name), None)
    if rig is None or len(rig.data.bones) != 70 or body is None or skull is None:
        raise ValueError("Expected existing 70-bone source and grafted real skull")
    if len(bpy.data.actions):
        raise ValueError("Animation clips must not enter the new Hollowed source")
    shape_keys = len(body.data.shape_keys.key_blocks) if body.data.shape_keys else 0
    ash = matte_ash_skin(body)
    hair = tangled_hair(skull, body, rig)
    wrap = torn_belt_and_waist_panels(body, rig)
    plates = measured_back_spines(body, rig)
    renderer = source_renderer()
    live = [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render]
    lower, upper = renderer.evaluated_mesh_bounds(live)
    size = upper - lower
    if not 2.9 < float(size.z) < 3.6:
        raise ValueError(f"Bad character framing, likely stray anatomy: {tuple(size)}")
    center = tuple((lower + upper) / 2)
    camera = bpy.context.scene.camera
    if camera is None:
        raise ValueError("Source Blender camera missing")
    camera.data.ortho_scale = max(1.20*float(size.z),
                                  1.27*float(size.x)*400/320,
                                  1.27*float(size.y)*400/320)
    clay = matte("H1 neutral clay, anatomy without glow", (.59, .55, .51))
    renderer.render_study(output, camera, clay, "clay", center)
    renderer.render_study(output, camera, clay, "material", center)
    if len(bpy.data.actions) or len(rig.data.bones) != 70:
        raise ValueError("Animation or original source rig was modified")
    current_shape_keys = len(body.data.shape_keys.key_blocks) if body.data.shape_keys else 0
    if current_shape_keys != shape_keys:
        raise ValueError("Previously authored connected skin shape keys changed")
    bpy.context.preferences.filepaths.save_version = 0
    destination = output / "hollowed-H1-owner-reference-SOURCE-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(destination))
    report = {
        "status": "FIRST SOURCE SILHOUETTE STUDY, NOT APPROVED",
        "owner_reference": "29 October 2026 front/side/back Hollowed image",
        "existing_bones": len(rig.data.bones),
        "existing_shape_keys_preserved": True,
        "hair": hair, "waist_wrap": wrap, "char_back": plates,
        "skin_material": ash,
        "animation_actions": len(bpy.data.actions),
        "animation_engine_modified": False,
        "gameplay_modified": False,
        "owner_approved": False,
        "visual_parity_not_claimed": True,
        "native_96px_review_generated": True,
        "source_blend": destination.name
    }
    (output / "owner-reference-source-qc.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("H1 OWNER-REFERENCE SOURCE:", json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
