#!/usr/bin/env python3
"""Hollowed H1 v6 — source anatomy with sculpted torn rib cavity.

Static authored editable-source study only; not a game sprite, attack clip,
universal animation-engine modification, owner approval or asset release.
Reuses the CC0 *human skin only*. Torso wound is a continuous skin depression
with raised torn lip, not detached flat planes or an orange paint decal.
All six bone ribs still must be genuinely ray-attached to the deformed torso.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Missing sculpt module {filename}")
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


def wound_fields(x, y, z):
    """Smooth static tissue displacement in original Blender world units.

    Negative Y faces the front camera. The trough and raised border affect
    connected ORIGINAL human skin vertices, not disconnected props.
    """
    rx = (x + .195) / .29
    rz = (z - 2.16) / .29
    radius = math.sqrt(rx * rx + rz * rz)
    anterior = min(1.0, max(0.0, (-y - .10) / .40))
    body = min(1.0, max(0.0, (1.0 - radius) / .65))
    trough = .116 * body * body * anterior
    torn_lip = .037 * math.exp(-((radius - .90) / .14) ** 2) * anterior
    return trough - torn_lip, body * anterior, radius


def sculpt_torn_cavity(actor, base, metrics):
    import bpy

    material = base.material("H1 charred necrotic tissue cavity — EMISSION OFF", (.105, .095, .083))
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = .99
    actor.data.materials.append(material)
    char_index = len(actor.data.materials) - 1

    changed = 0
    deep = 0
    peak_depth = 0.0
    for vertex in actor.data.vertices:
        displacement, body, radius = wound_fields(*vertex.co)
        if abs(displacement) > .0004:
            vertex.co.y += displacement
            changed += 1
            peak_depth = max(peak_depth, displacement)
            if body > .32:
                deep += 1

    actor.data.update()
    char_faces = 0
    for polygon in actor.data.polygons:
        center = polygon.center
        displacement, body, radius = wound_fields(*center)
        if radius < .76 and body > .10:
            polygon.material_index = char_index
            char_faces += 1

    bpy.context.view_layer.update()
    if changed < 100 or deep < 35 or char_faces < 25 or peak_depth < .045:
        raise ValueError(
            f"Insufficient connected wound sculpture: vertices={changed}, "
            f"deep={deep}, material_faces={char_faces}, depth={peak_depth:.4f}"
        )
    actor["source_wound"] = "Connected sculpted torso depression and raised tissue lip"
    actor["material_emission"] = "DISABLED"
    metrics["sculpted_wound_vertices"] = changed
    metrics["deep_torn_tissue_vertices"] = deep
    metrics["wound_cavity_polygon_faces"] = char_faces
    metrics["true_cavity_depth_m"] = round(peak_depth, 5)


def create(source, output):
    base = module("human_body_only_v1", "sculpt_cc0_anatomy_blender.py")
    feral = module("feral_rest_v2", "sculpt_feral_anatomy_v2_blender.py")
    undead = module("undead_torso_v4", "sculpt_human_undead_v4_blender.py")
    ribs = module("real_ribs_v5", "sculpt_cutaway_ribs_v5_blender.py")
    original = base.sculpt_base
    metrics = {}

    def static_hollow_skin(points):
        return undead.undead_sculpt(feral.feral_rest_shape(original(points)))

    def author_static_anatomy(actor):
        sculpt_torn_cavity(actor, base, metrics)
        ribs.static_rib_sculpt(actor, base, metrics)

    base.sculpt_base = static_hollow_skin
    base.create(source, output, augment_source=author_static_anatomy)
    source_file = output / "hollowed-cc0-anatomy-blockout.blend"
    final = output / "hollowed-torn-ribcage-v6-UNAPPROVED.blend"
    source_file.rename(final)

    import bpy
    bpy.ops.wm.open_mainfile(filepath=str(final))
    if sum(obj.type == "MESH" for obj in bpy.data.objects) != 1:
        raise ValueError("Unexpected detached mesh geometry in H1 study")
    actor = next(obj for obj in bpy.data.objects if obj.type == "MESH")
    if len(actor.data.vertices) != 13380:
        raise ValueError("Source anatomy contains clothing/hair helpers")
    if sum(obj.get("embedded_both_ends", False) for obj in bpy.data.objects) != 6:
        raise ValueError("All six genuinely skin-anchored ribs must survive reopening")
    if actor.get("source_wound") is None:
        raise ValueError("H1 cavity source was not preserved in editable .blend")
    camera = bpy.context.scene.camera
    camera.location = (4.95, -4.95, 5.4)
    base.point_camera(camera, (0, -.20, 1.57))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(final))

    qc_file = output / "source-qc.json"
    qc = json.loads(qc_file.read_text(encoding="utf-8"))
    qc.update({
        "status": "H1 v6 genuine Blender carved/cutaway tissue study, ART UNAPPROVED",
        "source_blend": final.name,
        "human_body_only": True,
        "new_animation_actions": 0,
        "animation_engine_modified": False,
        "emission": "OFF",
        "owner_approved": False,
        "rendered_from_true_3d": True,
        **metrics,
    })
    if qc["embedded_rib_curves"] != 6 or qc["sculpted_wound_vertices"] < 100:
        raise ValueError("Disconnected ribs or unsculpted tissue are not acceptable")
    qc_file.write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.resolve().mkdir(parents=True, exist_ok=True)
    create(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
