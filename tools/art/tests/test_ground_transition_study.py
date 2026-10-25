"""Source-only portrait material-transition review tests; no game renderer or C# authority."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "ground_transition_study.py"
sys.path.insert(0, str(SCRIPT.parent))
SPEC = importlib.util.spec_from_file_location("ground_transition_study", SCRIPT)
STUDY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(STUDY)


class GroundTransitionStudyTests(unittest.TestCase):
    def test_mask_is_seeded_bounded_and_not_all_one_material(self):
        same = STUDY.material_fraction(320, 568, 17)
        self.assertTrue(np.array_equal(same, STUDY.material_fraction(320, 568, 17)))
        self.assertFalse(np.array_equal(same, STUDY.material_fraction(320, 568, 47)))
        self.assertEqual(same.shape, (568, 320))
        self.assertEqual(float(same.min()), 0)
        self.assertEqual(float(same.max()), 1)
        self.assertGreater(np.count_nonzero((same > 0) & (same < 1)), 150)
        with self.assertRaises(ValueError):
            STUDY.material_fraction(10, 10, 0)
        with self.assertRaises(ValueError):
            STUDY.material_fraction(320, 568, 0, feather_pixels=0)

    def test_dithering_uses_exact_source_pixels_without_muddy_blur(self):
        grass = np.full((16, 16, 3), [12, 56, 21], dtype=np.uint8)
        mud = np.full((16, 16, 3), [95, 44, 28], dtype=np.uint8)
        fraction = np.full((16, 16), .5, dtype=np.float32)
        original = grass.copy(), mud.copy()
        hard = STUDY.combine(grass, mud, fraction, "hard")
        soft = STUDY.combine(grass, mud, fraction, "soft")
        dither = STUDY.combine(grass, mud, fraction, "pixel-dither")
        self.assertTrue(np.all(hard == mud))
        self.assertEqual(int(np.count_nonzero(np.all(dither == mud, axis=2))), 128)
        self.assertTrue(np.all(np.logical_or(np.all(dither == grass, axis=2), np.all(dither == mud, axis=2))))
        self.assertTrue(np.any(np.logical_not(np.all(soft == mud, axis=2))))
        np.testing.assert_array_equal(original[0], grass)
        np.testing.assert_array_equal(original[1], mud)
        for mode in ("hard", "soft", "pixel-dither"):
            np.testing.assert_array_equal(STUDY.combine(grass, mud, np.zeros((16, 16), np.float32), mode), grass)
            np.testing.assert_array_equal(STUDY.combine(grass, mud, np.ones((16, 16), np.float32), mode), mud)

    def test_invalid_shapes_fractions_and_modes_rejected(self):
        color = np.zeros((32, 32, 3), dtype=np.uint8)
        fraction = np.full((32, 32), .5, dtype=np.float32)
        for wrong in (color[:, 1:], color[:, :, 1:]):
            with self.assertRaises(ValueError):
                STUDY.combine(color, wrong, fraction, "soft")
        for wrong in (np.ones((31, 32)), np.full((32, 32), np.nan),
                      np.full((32, 32), 2.0), np.full((32, 32), -0.1)):
            with self.assertRaises(ValueError):
                STUDY.combine(color, color, wrong, "soft")
        with self.assertRaises(ValueError):
            STUDY.combine(color, color, fraction, "glowing-moon-filter")

    def test_portrait_comparison_is_deterministic_and_explicitly_unlit(self):
        grass = np.full((900, 900, 3), [21, 45, 18], dtype=np.uint8)
        mud = np.full((900, 900, 3), [75, 45, 27], dtype=np.uint8)
        for width, height in STUDY.PHONE_SIZES:
            image, report = STUDY.create_preview(grass, mud, 17, width, height)
            again, same = STUDY.create_preview(grass, mud, 17, width, height)
            self.assertEqual(image.tobytes(), again.tobytes())
            self.assertEqual(report, same)
            self.assertEqual(len(report["sha256ByMode"]), 3)
            self.assertEqual(image.height, height + 44 + 36)
            self.assertFalse(report["gpuLightingUsed"])
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["ownerApproved"])
        self.assertTrue(np.all(grass == [21, 45, 18]))
        self.assertTrue(np.all(mud == [75, 45, 27]))
        with self.assertRaises(ValueError):
            STUDY.create_preview(grass, mud, 17, 400, 844)
        with self.assertRaises(ValueError):
            STUDY.create_preview(grass[:100], mud[:100], 17, 320, 568)

    def test_output_guard_stops_before_manifest_and_rejects_duplicate_seed(self):
        with tempfile.TemporaryDirectory() as location:
            root = Path(location)
            with self.assertRaises(ValueError):
                STUDY.build(root, root / "diagnostics")
            with self.assertRaises(ValueError):
                STUDY.build(root, root.parent / "some-other-dir", seeds=(17, 17))


if __name__ == "__main__":
    unittest.main()
