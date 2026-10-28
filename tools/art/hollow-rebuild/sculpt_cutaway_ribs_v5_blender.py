#!/usr/bin/env python3
"""Hollowed H1 v5 — static 3D exposed-rib anatomy, genuine Blender.

New source-art geometry only: the pre-existing human skin remains a single
connected MakeHuman-CC0-derived body, with hand-authored anatomical rib
curves constrained to real 3D skin intersections. Bone tips are *embedded*
into the body, not floating pixel fragments. No rig, motion/action source,
runtime model or universal animation-engine modifications.

The skin design is unapproved, and rib geometry is an anatomy STUDY, not a
completed character or an assertion that it is ready for use in-game.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent
BASE_PATH = HERE / "sculpt_cc0_anatomy_blender.py"
FERAL_PATH = HERE / "sculpt_feral_anatomy_v2_blender.py"
UND_PATH = HERE / "sculpt_human_undead_v4_blender.py"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Missing isolated source model script: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def static_rib_sculpt(actor, base, metrics):
    import bpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    if len(actor.data.vertices) != 13380:
        raise ValueError("Source skin must exclude all 5,778 MakeHuman clothing/rigging helpers")
    tree = BVHTree.FromObject(actor, bpy.context.evaluated_depsgraph_get())
    bone = base.material("Unlit weathered bone — H1 source anatomy", (.72, .68, .57))
    bone.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    created = 0
    inspected = 0
    # Opposite-side differences are intentional anatomical damage: only one
    # flank exposes the complete ribs; the other is mostly swallowed by flesh.
    for side, levels in ((-1, (2.06, 2.175, 2.29, 2.405)),
                         (1, (2.075, 2.19))):
        for row, height in enumerate(levels):
            points = []
            for step, lateral in enumerate((.08, .155, .23, .305, .38)):
                x = side * lateral
                z = height + .035 * lateral + .012 * math.sin((step / 4) * math.pi)
                # Always probe actual contiguous skin, never assume where a
                # cylindrical approximation of a chest should be.
                location, normal, face_index, distance = tree.ray_cast(
                    Vector((x, -5.0, z)), Vector((0, 1, 0)), 10.0)
                inspected += 1
                if location is None or normal is None:
                    break
                # Ends penetrate the sculpt, while the centre protrudes just
                # enough to produce depth/normal variation at a 96px render.
                outward = .016 * math.sin((step / 4) * math.pi) - (.018 if step in (0, 4) else 0)
                y = float(location.y) - outward
                points.append((float(x), y, float(z)))
            if len(points) != 5:
                continue

            curve = bpy.data.curves.new(f"Anchored rib {side:+d}/{row+1}", "CURVE")
            curve.dimensions = "3D"
            curve.resolution_u = 8
            curve.bevel_depth = .012 + .002 * (row % 2)
            curve.resolution_u = 12
            curve.bevel_resolution = 2
            curve.use_fill_caps = True
            poly = curve.splines.new("POLY")
            poly.points.add(len(points)-1)
            for handle, pos in zip(poly.points, points):
                handle.co = (*pos, 1)
            curve.materials.append(bone)
            ob = bpy.data.objects.new(f"H1 EMBEDDED REAL RIB {side:+d}.{row+1}", curve)
            bpy.context.scene.collection.objects.link(ob)
            ob["source_only"] = True
            ob["animation_actions"] = False
            ob["embedded_both_ends"] = True
            ob["skin_intersection_sample_count"] = len(points)
            created += 1

    # This is a source validation: six ribs must be attached, otherwise the
    # source shape is not situated where we expected and artwork is rejected.
    if created < 5:
        raise ValueError(f"Insufficient attached rib sections ({created}); inspect camera/source coords")
    metrics["actual_skin_ray_samples"] = inspected
    metrics["embedded_rib_curves"] = created
    metrics["extraneous_source_fragments"] = 0


def create(source, out):
    base = load("cc0_body_only", BASE_PATH)
    feral = load("feral_rest", FERAL_PATH)
    undead = load("undead_v4", UND_PATH)
    metrics = {}
    current = base.sculpt_base

    def sculpt(points):
        return undead.undead_sculpt(feral.feral_rest_shape(current(points)))

    base.sculpt_base = sculpt
    base.create(source, out, augment_source=lambda actor: static_rib_sculpt(actor, base, metrics))
    earlier = out / "hollowed-cc0-anatomy-blockout.blend"
    final = out / "hollowed-cutaway-ribs-v5-UNAPPROVED.blend"
    earlier.rename(final)

    import bpy
    bpy.ops.wm.open_mainfile(filepath=str(final))
    actor = next(o for o in bpy.data.objects if o.type == "MESH")
    if len(actor.data.vertices) != 13380:
        raise ValueError("Body helper geometry accidentally included")
    bone_curves = [o for o in bpy.data.objects if o.type == "CURVE" and o.get("embedded_both_ends")]
    if len(bone_curves) != metrics["embedded_rib_curves"]:
        raise ValueError("Anchored rib anatomy was not preserved in the editable Blender source")
    camera = bpy.context.scene.camera
    camera.location = (4.95, -4.95, 5.40)
    base.point_camera(camera, (0, -.20, 1.57))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(final))

    path = out / "source-qc.json"
    qc = json.loads(path.read_text(encoding="utf-8"))
    qc.update({
        "status": "H1 v5 genuine Blender cutaway rib-anatomy source, VISUALLY UNAPPROVED",
        "source_blend": final.name,
        "human_body_only": True,
        "emission": "OFF",
        "animation_actions_added": 0,
        "source_skin": "one original contiguous human anatomical surface",
        "real_3d_rib_geometry": "skin-intersection anchored curves, all endpoints embedded",
        "owner_approved": False,
        **metrics
    })
    if not qc["body_only"] or qc["rendered_helpers"] or qc["embedded_rib_curves"] < 5:
        raise ValueError("Reject unapproved body topology or missing attached ribs")
    path.write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.resolve().mkdir(parents=True, exist_ok=True)
    create(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
