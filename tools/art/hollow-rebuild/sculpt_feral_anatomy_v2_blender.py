#!/usr/bin/env python3
"""H1 v2 feral anatomical source study — no animation engine or game changes.

Reuses MakeHuman CC0 *topology* only and the isolated H1 clay-render helper.
This is an authored one-time REST SHAPE (no animation actions or keyframes).
No scripts, materials or animation from other creature references are imported.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent
BASE_SCRIPT = HERE / "sculpt_cc0_anatomy_blender.py"


def smoothstep(a: float, b: float, value: float) -> float:
    t = min(1.0, max(0.0, (value - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def bell(value: float, center: float, spread: float) -> float:
    return math.exp(-((value - center) / spread) ** 2)


def feral_rest_shape(points: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
    """Modify a pre-normalized, connected human skin topology, preserving seams.

    X is left/right, negative Y forward, Z up. Smooth full-body fields replace
    disjoint primitive attachments. Parameters are **artist blockout guesses**,
    not medically validated transformations or source-animation bindings.
    """
    result = []
    for x, y, z in points:
        # Twisted chest rests over an off-center braced pelvis. Rotate the real
        # thoracic volume, not an isolated arm pasted to a rigid humanoid.
        upper = smoothstep(1.55, 2.44, z)
        thorax = bell(z, 2.29, .48)
        lumbar = bell(z, 1.42, .38)
        theta = .13 * upper - .042 * lumbar
        rotated_x = x * math.cos(theta) - y * math.sin(theta)
        rotated_y = x * math.sin(theta) + y * math.cos(theta)
        x, y = rotated_x - .035 * thorax + .025 * lumbar, rotated_y - .078 * thorax

        # Wasted rib/flank mass, but preserve *actual* human chest topology.
        side = -1.0 if x < 0 else 1.0
        x *= 1.0 - .085 * bell(z, 1.74, .33)
        # Distinct shoulders from the existing chest instead of bolt-on lumps.
        shoulder = bell(z, 2.39, .35)
        arm_root = smoothstep(.24, .77, abs(x))
        left = 1.0 if x < -.20 else 0.0
        right = 1.0 if x > .20 else 0.0
        x += side * (.050 * shoulder * arm_root)
        z += .073 * shoulder * left * arm_root - .076 * shoulder * right * arm_root

        # Left shoulder is a credible elevated striking shoulder; the right is
        # low and injured. Shift soft shoulder volume *with* its scapular root.
        y -= .098 * shoulder * left * arm_root
        y += .028 * shoulder * right * arm_root

        # Extend damaged left arm's silhouette forward, while chest remains
        # connected. Do not independently rotate a wrist without scapula.
        arm_span = smoothstep(.39, .98, abs(x))
        y -= .155 * arm_span * left * bell(z, 1.90, .63)
        z -= .065 * arm_span * right * bell(z, 1.95, .64)

        # The head leans forward and to one side, retaining actual human face
        # planes/orbits and avoiding the old overlarge cartoon cavities.
        head = smoothstep(2.47, 2.93, z)
        x -= .057 * head
        y -= .091 * head

        # A standing human corpse cannot use a bear stance. Modest asymmetric
        # knees and hips create body weight; both feet stay on the ground.
        knee = bell(z, .77, .33)
        x += .045 * knee * left - .019 * knee * right
        y -= .047 * knee * left
        if z < .10:
            z = max(0.0, z)  # preserve floor while sketching rest proportions

        result.append((x, y, z))
    return result


def create(source: Path, target: Path) -> None:
    spec = importlib.util.spec_from_file_location("cc0_hollow_sculpt", BASE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Missing isolated CC0 Blender source script")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    old_sculpt = module.sculpt_base

    def edited(points):
        return feral_rest_shape(old_sculpt(points))

    module.sculpt_base = edited
    module.create(source, target)
    previous = target / "hollowed-cc0-anatomy-blockout.blend"
    published = target / "hollowed-feral-source-v2-UNAPPROVED.blend"
    previous.rename(published)
    # Save the camera at a useful H1 three-quarter angle as well. The CC0
    # source helper saves its .blend before positioning the review cameras;
    # an independently reopened production source must not open on an empty
    # or origin-mounted camera. This remains a single unanimated rest sculpt.
    import bpy
    bpy.ops.wm.open_mainfile(filepath=str(published))
    camera = bpy.context.scene.camera
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("Source file lost its real Blender camera")
    camera.location = (4.95, -4.95, 5.40)
    module.point_camera(camera, (0, -.20, 1.57))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(published))
    qc_file = target / "source-qc.json"
    qc = json.loads(qc_file.read_text(encoding="utf-8"))
    qc["status"] = "H1 v2 anatomical rest sculpt; REAL Blender model, VISUALLY UNAPPROVED"
    qc["source_blend"] = published.name
    qc["rest_shape"] = "Original feral shape changes to CC0 human topology, no imported motions"
    qc["source_bones"] = False
    qc["attack_animation_created"] = False
    qc["animation_engine_modified"] = False
    qc["owner_approved"] = False
    qc_file.write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")
    # Generated source image names carry H1 CC0 labels by historical renderer;
    # metadata and .blend distinguish this new rest-shape revision.


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    create(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
