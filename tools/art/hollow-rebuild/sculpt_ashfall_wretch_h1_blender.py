#!/usr/bin/env python3
"""H1 new WyrmForge Hollowed / Ashfall Wretch: asymmetric source sculpt.

Original starting topology: Rosswet Mobile, "Thin Zombie [Awake Zombie Asset]",
CC BY 3.0, https://opengameart.org/content/thin-zombie-awake-zombie-asset

IMPORTANT: This file creates a STATIC ORIGINAL DERIVATIVE SOURCE ART STUDY,
not runtime art or a rig/controller/animation clip. The already imported .blend
is created by evaluate_free_character_blender.py with actions cleared. This
script edits only that file's *new copy* and never edits PR #387 / animation
engine. Retain artist attribution in .blend properties, source JSON and any
future distributed production asset.

The first artistic goal is a damaged, feral HUMAN silhouette at 96px; no
emission, accessories, clothing, extra disjoint bones or GPU VFX.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
EVALUATOR = HERE / "evaluate_free_character_blender.py"


def evaluator_module():
    spec = importlib.util.spec_from_file_location("source_evaluator", EVALUATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError("Isolated Blender source evaluator was not found")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def bump(value, center, width):
    return math.exp(-((value-center)/width)**2)


def ease(a, b, value):
    t = min(1.0, max(0.0, (value-a)/(b-a)))
    return t*t*(3.0-2.0*t)


def original_human_to_hollowed(point):
    """Original asymmetrical infected HUMAN rest-body sculpt, real Blender m.

    Inputs are normalized world coordinates with Z=0 on floor and body height
    3.1. This is a single rest shape, NEVER a keyed attack or posing animation.
    All fields fade smoothly from existing human anatomy. Different shoulder
    chains have their own rest mechanics, inspired by weight-bearing bear
    swipes and predatory reach rather than copied animal anatomy.
    """
    x, y, z = point
    original = Vector(point)
    thorax = bump(z, 2.20, .49)
    high = ease(1.70, 2.58, z)
    hip = bump(z, 1.45, .42)
    shoulder = bump(z, 2.41, .31)
    left = ease(.25, .65, -x)
    right = ease(.25, .65, x)
    distal = ease(.38, .74, abs(x))
    skull = ease(2.55, 2.83, z)

    # True thoracic twist *including* shoulder/arm chain; no pivoting only
    # the wrist around a frozen elbow. Offsets fade through the pelvis.
    twist = .11 * thorax
    cx = -.025 * thorax
    cy = -.052 * thorax
    dx, dy = x-cx, y-cy
    x = cx + dx*math.cos(twist)-dy*math.sin(twist)
    y = cy + dx*math.sin(twist)+dy*math.cos(twist)

    # Wasted, collapsed right scapula versus a forward/high left strike
    # shoulder. This is a visual mass correction; no bone animations.
    x += -.032*high - .015*hip
    z += .10*shoulder*left - .085*shoulder*right
    y -= .085*shoulder*left
    y += .044*shoulder*right
    x -= .055*shoulder*left
    x += .025*shoulder*right

    # Body weight shifts over the supported right foot. A tiny forward bend
    # is not enough: the skull leads the shoulder, opposite hip counteracts.
    y -= .115*high + .045*skull
    x -= .065*skull
    x += .033*hip

    # Wretched reaching hand on the elevated shoulder side, opposite limb
    # crooked, narrower, with a visible asymmetric claw envelope.
    x -= .065 * left * distal * bump(z, 1.75, .62)
    y -= .074 * left * distal * bump(z, 1.75, .62)
    x -= .018 * right * distal * bump(z, 1.65, .65)
    z -= .045 * right * distal * bump(z, 1.85, .67)

    # Uneven knee and ankle support, feet planted. The knees share volume
    # with their thighs/shins, no disjoint add-on pieces or impossible bends.
    knee = bump(z, .85, .27)
    y -= .040*knee*left
    x += .025*knee*right - .022*knee*left
    if z < .075:
        z = max(0.0, z)
    return Vector((x, y, z)), (Vector((x,y,z)) - original).length


def sculpt_visible_skin(mesh, helper):
    """Deform original vertex coordinates, preserving topology and groups."""
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    eval_data = evaluated.to_mesh()
    try:
        if len(eval_data.vertices) != len(mesh.data.vertices):
            raise ValueError("Mesh modifiers changed vertex topology; no safe source sculpt")
        inv = mesh.matrix_world.inverted().to_3x3()
        delta_count, maximum_delta, total_delta = 0, 0.0, 0.0
        for i, vertex in enumerate(mesh.data.vertices):
            world = evaluated.matrix_world @ eval_data.vertices[i].co
            wanted, distance = original_human_to_hollowed(world)
            # Source is in a rest bind pose; inverse the original vertex's
            # world transform, not a non-existent engine skeleton API.
            displacement = inv @ (wanted-world)
            vertex.co += displacement
            if distance > .002:
                delta_count += 1
            maximum_delta = max(maximum_delta, distance)
            total_delta += distance
        mesh.data.update()
    finally:
        evaluated.to_mesh_clear()
    bpy.context.view_layer.update()
    if not 0.06 < maximum_delta < .40:
        raise ValueError(f"Feral source anatomy deformation outside safe H1 range: {maximum_delta:.4f}")
    if delta_count < 200:
        raise ValueError(f"Feral sculpt did not deform enough anatomical source vertices: {delta_count}")
    return {
        "modified_vertices": delta_count,
        "maximum_visible_rest_deformation_m": round(maximum_delta, 6),
        "mean_rest_deformation_m": round(total_delta/len(mesh.data.vertices), 6),
        "original_topology_preserved": True,
        "original_vertex_groups_preserved": True,
    }


def create(source: Path, output: Path) -> None:
    helper = evaluator_module()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    rigs = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if len(meshes) != 1 or len(rigs) != 1 or len(bpy.data.actions) != 0:
        raise ValueError("Source must be exactly one static rigged source mesh, no animation actions")
    mesh = meshes[0]
    before_vertices = len(mesh.data.vertices)
    before_faces = len(mesh.data.polygons)
    before_groups = len(mesh.vertex_groups)
    before_bones = len(rigs[0].data.bones)
    metrics = sculpt_visible_skin(mesh, helper)
    if (len(mesh.data.vertices), len(mesh.data.polygons), len(mesh.vertex_groups),
        len(rigs[0].data.bones)) != (before_vertices, before_faces, before_groups, before_bones):
        raise ValueError("A source sculpt must not change rig-binding topology")
    mesh.name = "WyrmForge Hollowed H1 / Ashfall Wretch / anatomy UNAPPROVED"
    mesh["original_creator"] = "Rosswet Mobile"
    mesh["original_url"] = "https://opengameart.org/content/thin-zombie-awake-zombie-asset"
    mesh["original_license"] = "CC BY 3.0 Unported"
    mesh["modifications"] = "Original body twist, uneven scapulae, skull reach, claw mass, braced lower body"
    mesh["animation_actions"] = 0
    mesh["owner_approval"] = False

    output.mkdir(parents=True, exist_ok=True)
    camera = bpy.context.scene.camera
    clay = bpy.data.materials.get("H1 material neutral clay — emission OFF")
    if camera is None or clay is None:
        raise ValueError("No genuine Blender inspection camera or clay material in source")
    low, high = helper.evaluated_mesh_bounds(meshes)
    center = tuple((low+high)/2)
    dims = high-low
    camera.data.ortho_scale = max(1.20*dims.z, 1.25*dims.x*400/320,
                                  1.25*dims.y*400/320)
    helper.render_study(output, camera, clay, "clay", center)
    helper.render_study(output, camera, clay, "material", center)
    camera.location = (center[0]+4.95, center[1]-4.95, center[2]+3.35)
    helper.look_at(camera, center)
    bpy.context.preferences.filepaths.save_version = 0
    final = output / "hollowed-ashfall-wretch-source-h1-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(final))
    summary = {
        "status": "UNAPPROVED editable original static Hollowed source sculpt",
        "authored_derivative": True,
        "origin": "Rosswet Mobile, Thin Zombie, CC BY 3.0",
        "source_url": mesh["original_url"],
        "author_modifications": mesh["modifications"],
        "saved_source": final.name,
        "body_meshes": len(meshes),
        "skin_source_triangles": sum(len(m.data.polygons) for m in meshes),
        "armature_source_bones": before_bones,
        "actions": len(bpy.data.actions),
        "source_rig_weights_preserved": before_groups > 0,
        "engine_or_runtime_changed": False,
        "owner_approved": False,
        "render_angles": helper.LABELS,
        **metrics,
    }
    if len(bpy.data.actions) != 0:
        raise ValueError("Original source-derivative must NOT contain actions")
    (output/"h1-sculpt-review.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    expected = (Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not args.output.resolve().is_relative_to(expected):
        raise ValueError("No exports outside isolated art-review artifacts")
    create(args.input.resolve(),args.output.resolve())


if __name__ == "__main__":
    main()
