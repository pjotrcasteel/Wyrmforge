"""Regressions for the unapproved full foot pass staff-walk v004."""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

STUDY_ROOT = Path(__file__).resolve().parent.parent / "studies" / "anokolisa-wizard-v001"
WORK = STUDY_ROOT / "staff-walk-side-v004" / "staff_walk.py"
SOURCE = STUDY_ROOT / "run-side-grey-6f-64x80.png"


def import_study():
    spec = importlib.util.spec_from_file_location("staff_walk_v004", WORK)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Cannot import {WORK}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StaffWalkV004Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.study = import_study()
        cls.frames, cls.events, cls.sheet, cls.world = cls.study.render(SOURCE)

    def test_sixteen_native_frames_and_world_proof(self):
        self.assertEqual(16, len(self.frames))
        self.assertEqual(16, len(self.events))
        self.assertEqual(16, len(self.world))
        self.assertTrue(all(f.mode == "RGBA" and f.size == (64, 80) for f in self.frames))

    def test_staff_world_tip_is_stationary_for_full_support(self):
        grounded = self.events[4:13]
        self.assertEqual(9, len(grounded))
        self.assertTrue(all(event["tipGrounded"] for event in grounded))
        self.assertEqual({61}, {event["worldTipX"] for event in grounded})
        self.assertEqual({74}, {event["tip"][1] for event in grounded})
        self.assertFalse(self.events[13]["tipGrounded"])

    def test_nearest_foot_passes_staff_before_release(self):
        contact = self.events[12]
        near_foot_world_x = contact["nearFoot"][0] + contact["rootTravelPx"]
        self.assertGreater(near_foot_world_x, contact["worldTipX"])
        self.assertEqual(68, near_foot_world_x)
        self.assertEqual(61, contact["worldTipX"])

    def test_alternating_far_and_near_foot_lifts(self):
        far = [i for i, event in enumerate(self.events) if event["farFoot"][2] > 0]
        near = [i for i, event in enumerate(self.events) if event["nearFoot"][2] > 0]
        self.assertTrue(far)
        self.assertTrue(near)
        self.assertLess(max(far), min(near))

    def test_grounded_boots_stay_world_anchored(self):
        for name, indices in (("farFoot", range(8, 16)), ("nearFoot", range(0, 8))):
            fixed = {
                self.events[i][name][0] + self.events[i]["rootTravelPx"]
                for i in indices
            }
            self.assertEqual(1, len(fixed), name)

    def test_seam_pose_matches_and_root_advances(self):
        for foot in ("farFoot", "nearFoot"):
            self.assertEqual(self.events[0][foot], self.events[-1][foot])
        self.assertEqual(26, self.events[-1]["rootTravelPx"])

    def test_right_elbow_and_straight_shaft_remain_valid(self):
        for e in self.events:
            self.assertLess(e["elbow"][0], e["hand"][0], e)
            self.assertGreater(e["elbow"][1], e["hand"][1], e)
            self.assertGreater(e["tip"][1], e["hand"][1], e)
        sweep = [event["tip"][0] for event in self.events]
        self.assertGreaterEqual(max(sweep) - min(sweep), 24)

    def test_reproducible_artifacts_and_immutable_source(self):
        original = SOURCE.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "review-v004"
            manifest = self.study.write_study(out, SOURCE)
            self.assertFalse(manifest["approvedForGame"])
            self.assertFalse(manifest["schoolOverridesEnabled"])
            for name in (
                "staff-walk-inplace-loop.gif",
                "staff-walk-world-space-once.gif",
                "staff-walk-selected-before-after.png",
                "staff-walk-v003-v004-comparison.gif",
                "staff-walk-16-key-contact.png",
                "staff-assisted-walk-16f-64x80.png",
                "manifest.json",
            ):
                self.assertTrue((out / name).is_file(), name)
            with Image.open(out / "staff-assisted-walk-16f-64x80.png") as atlas:
                self.assertEqual((1024, 80), atlas.size)
            with self.assertRaises(FileExistsError):
                self.study.write_study(out, SOURCE)
        self.assertEqual(original, SOURCE.read_bytes())


if __name__ == "__main__":
    unittest.main()
