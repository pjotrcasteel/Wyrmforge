#!/usr/bin/env python3
"""H1 v4 — real editable human-undead anatomy sculpt, NO animation.

Uses only the **skin** topology from the original CC0 MakeHuman hm08 base,
never the authoring helpers. The shape corrections are continuous vertex
deformations; no coat, cape, new frame action, armature playback or runtime
atlas is created. The result is a deliberately UNAPPROVED anatomy study.

This is a source-art sculpt, not a generic animation or gameplay system.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE_SCRIPT = HERE / "sculpt_cc0_anatomy_blender.py"
FERAL_SCRIPT = HERE / "sculpt_feral_anatomy_v2_blender.py"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Missing isolated Hollowed sculpt module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def bell(x, center, width):
    return math.exp(-((x - center) / width) ** 2)


def smoothstep(a, b, value):
    t = min(1.0, max(0.0, (value - a) / (b - a)))
    return t * t * (3 - 2 * t)


def undead_sculpt(points):
    """Original continuous sculpt fields over the existing complete skin.

    All dimensions are authored in Blender world meters: X lateral,
    -Y forward, Z up. Anatomy shifts stay attached to the same base skin
    vertices/faces; no free-floating pieces are generated.

    Not an animation, no joint rotations or motion clips.
    """
    result = []
    for x, y, z in points:
        left = 1.0 if x < 0.0 else 0.0
        right = 1.0 - left

        # Unbalanced skeletal trunk: twisted clavicles/scapulae, very hollow
        # left flank and a markedly different right latissimus silhouette.
        chest = bell(z, 2.21, .44)
        flank = bell(z, 1.93, .33)
        stomach = bell(z, 1.58, .42)
        shoulder = bell(z, 2.43, .24)

        # Normal human symmetry is not allowed: the striking shoulder sits
        # high and forward; the opposite one caves toward the ribcage.
        side_factor = 1.0 + (.13 * left - .085 * right) * shoulder
        x = x * side_factor
        y += .065 * right * shoulder - .10 * left * shoulder
        z += .044 * left * shoulder - .035 * right * shoulder

        # Wasted lower torso, one bulging rib-bank, and a genuine concavity
        # under the right scapula: displacement, not a fake soot decal.
        x *= 1.0 - .13 * stomach - .058 * flank
        chest_outer = smoothstep(.08, .27, abs(x)) * (1.0 - smoothstep(.58, .82, abs(x)))
        if chest_outer > .0:
            x += math.copysign(.025 * chest * chest_outer * (1.0 + .7 * left), x)

        # Exposed rib landmarks are subtle corrugations of *existing skin*.
        # Six nonuniform levels; anterior chest only, away from shoulders.
        # This produces real normal/depth changes visible under later lighting.
        chest_front = 1.0 - smoothstep(-.14, .02, y)
        rib_lateral = smoothstep(.055, .17, abs(x)) * (1.0 - smoothstep(.37, .56, abs(x)))
        ribs = 0.0
        for index, level in enumerate((1.82, 1.94, 2.035, 2.135, 2.24, 2.345)):
            skewed_level = level + (x * (.048 if index % 2 else -.035))
            ribs += bell(z, skewed_level, .016 + .002 * (index % 3))
        y -= .018 * ribs * chest_front * rib_lateral

        # One crushed lower anterior chest region leaves a visibly deeper
        # depression between ribs without introducing a disconnected hole.
        wound = bell(x, .16, .18) * bell(z, 2.08, .21)
        y += .052 * wound * chest_front * right

        # Ragged human head: a slight cranial flatten and asymmetric zygoma,
        # never the round-eyed, huge-jawed procedural skull of rejected v5-7.
        upper_skull = smoothstep(2.73, 3.06, z)
        x = x * (1.0 - .038 * upper_skull)
        x -= .028 * upper_skull
        y -= .027 * upper_skull
        # Crooked jaw, but retained the actual human mandible topology.
        chin = bell(z, 2.66, .13) * (1.0 - smoothstep(.14, .32, abs(x)))
        y -= .023 * chin
        x += .021 * chin

        # Differing leg loading with subtle kneecap shifts; feet pinned.
        knee = bell(z, .78, .22)
        if z > .12:
            x -= .026 * knee * left
            y += .028 * knee * right

        if not all(math.isfinite(v) for v in (x, y, z)):
            raise ValueError("Nonfinite source sculpt coordinate")
        result.append((x, y, z))
    return result


def produce(source, out):
    base = load_module("body_only_cc0_blender", BASE_SCRIPT)
    v2 = load_module("feral_cc0_v2_blender", FERAL_SCRIPT)
    old_sculpt = base.sculpt_base

    def compound(points):
        shaped = old_sculpt(points)
        shaped = v2.feral_rest_shape(shaped)
        return undead_sculpt(shaped)

    base.sculpt_base = compound
    base.create(source, out)

    original_blend = out / "hollowed-cc0-anatomy-blockout.blend"
    finished_blend = out / "hollowed-human-undead-v4-UNAPPROVED.blend"
    original_blend.rename(finished_blend)

    import bpy
    bpy.ops.wm.open_mainfile(filepath=str(finished_blend))
    actor = next(o for o in bpy.data.objects if o.type == "MESH")
    if len(actor.data.vertices) != 13380:
        raise ValueError(f"Expected body-only 13,380 vertices: {len(actor.data.vertices)}")
    actor.name = "Hollowed H1 v4 — damaged HUMAN source skin — UNAPPROVED"
    actor["human_undead_rest_sculpt"] = True
    actor["source_animation_actions"] = False
    camera = bpy.context.scene.camera
    camera.location = (4.95, -4.95, 5.40)
    base.point_camera(camera, (0, -.20, 1.57))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(finished_blend))

    qc = out / "source-qc.json"
    data = json.loads(qc.read_text(encoding="utf-8"))
    if data["mesh_vertices"] != 13380 or data["rendered_helpers"] is not False:
        raise ValueError("Reject helper geometry: capes/skirts/hair may not enter Hollowed")
    data.update({
        "status": "H1 v4 source-human-undead anatomical study, VISUALLY UNAPPROVED",
        "source_blend": finished_blend.name,
        "original_shape": "asymmetric scapulae, narrow torso, damaged chest and human mandible",
        "rib_sculpt": "six connected original-skin anterior corrugations, source geometry, not texture",
        "separate_bone_meshes": 0,
        "skirt_or_hair_helpers": False,
        "animation_actions_added": 0,
        "owner_approved": False,
    })
    qc.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    a = parser.parse_args()
    a.output.resolve().mkdir(parents=True, exist_ok=True)
    produce(a.input.resolve(), a.output.resolve())


if __name__ == "__main__":
    main()
