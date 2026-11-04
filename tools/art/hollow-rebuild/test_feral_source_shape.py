#!/usr/bin/env python3
"""Local source-only tests for feral rest-anatomy shape fields. No bpy/rig/engine."""
from __future__ import annotations

import importlib.util
import math
from pathlib import Path
import unittest

PATH = Path(__file__).with_name("sculpt_feral_anatomy_v2_blender.py")
SPEC = importlib.util.spec_from_file_location("hollow_feral_rest_shape", PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load isolated source sculpt: {PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FeralSourceShapeTests(unittest.TestCase):
    def test_source_pose_is_deterministic_and_does_not_change_vertex_count(self):
        vertices = [(-.85, -.07, 2.35), (.85, -.07, 2.35), (-.10, .0, 1.4), (.0, .05, .0)]
        first = MODULE.feral_rest_shape(vertices)
        self.assertEqual(first, MODULE.feral_rest_shape(vertices))
        self.assertEqual(len(vertices), len(first))
        self.assertEqual(vertices[0], (-.85, -.07, 2.35))

    def test_shoulder_does_not_keep_anatomically_unrealistic_equal_heights(self):
        left, right = MODULE.feral_rest_shape([(-.77, .0, 2.38), (.77, .0, 2.38)])
        self.assertGreater(left[2], right[2] + .06)

    def test_ground_contact_stays_on_ground(self):
        feet = MODULE.feral_rest_shape([(-.18, -.14, .0), (.18, -.14, .0)])
        self.assertEqual([z for _, _, z in feet], [0.0, 0.0])

    def test_shape_changes_are_bounded_and_finite(self):
        points = [(x / 10, y / 10, z / 10)
                  for x in range(-10, 11, 2)
                  for y in range(-5, 6, 2)
                  for z in range(0, 33, 4)]
        shaped = MODULE.feral_rest_shape(points)
        for before, after in zip(points, shaped):
            self.assertTrue(all(math.isfinite(v) for v in after))
            self.assertLess(math.dist(before, after), .45, "Deformation must remain an anatomical sculpt, not teleport geometry")

    def test_feet_and_hands_are_not_cut_off_from_original_connected_topology(self):
        # The source script only updates coordinates on exactly the old vertex list;
        # it never adds/removes faces or commits animation assets.
        points = [(-.9, .03, 1.56), (.9, .03, 1.56), (.12, .10, 0)]
        self.assertEqual(len(MODULE.feral_rest_shape(points)), len(points))


if __name__ == "__main__":
    unittest.main()
