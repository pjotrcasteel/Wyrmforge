"""Regression checks for the isolated 16-key wizard staff walk study."""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "studies" / "anokolisa-wizard-v001"
STUDY = ROOT / "staff-walk-side-v003" / "staff_walk.py"
SOURCE = ROOT / "run-side-grey-6f-64x80.png"

def load_study():
    spec = importlib.util.spec_from_file_location("staff_side_walk_v003", STUDY)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Could not import {STUDY}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StaffWalkV003Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_study()
        cls.frames, cls.events, cls.sheet, cls.sequence = cls.model.render(SOURCE)

    def test_sixteen_independently_timed_pixel_frames(self):
        self.assertEqual(16, len(self.frames))
        self.assertEqual(16, len(self.events))
        self.assertTrue(all(frame.mode == "RGBA" and frame.size == (64, 80) for frame in self.frames))
        self.assertEqual(16, len(self.sequence))

    def test_staff_tip_is_world_anchored_while_planted(self):
        for event in self.events[4:12]:
            self.assertTrue(event["tipGrounded"], event)
            self.assertEqual(61, event["worldTipX"], event)
            self.assertEqual(74, event["tip"][1], event)

    def test_foot_lift_phases_are_alternating(self):
        far = [i for i, event in enumerate(self.events) if event["farFoot"][2] > 0]
        near = [i for i, event in enumerate(self.events) if event["nearFoot"][2] > 0]
        self.assertTrue(far)
        self.assertTrue(near)
        self.assertLess(max(far), min(near))

    def test_foot_loops_without_pose_or_contact_jump(self):
        first = self.events[0]
        last = self.events[-1]
        self.assertEqual(first["farFoot"], last["farFoot"])
        self.assertEqual(first["nearFoot"], last["nearFoot"])
        self.assertEqual(20, last["rootTravelPx"])

    def test_grounded_far_and_near_boots_do_not_slide_in_world_space(self):
        for indices, name in ((range(8, 16), "farFoot"), (range(0, 8), "nearFoot")):
            world_x = {
                self.events[i][name][0] + self.events[i]["rootTravelPx"]
                for i in indices
            }
            self.assertEqual(1, len(world_x), name)

    def test_elbow_follows_grip_without_unphysical_flip(self):
        for event in self.events:
            self.assertLess(event["elbow"][0], event["hand"][0], event)
            self.assertGreater(event["elbow"][1], event["hand"][1], event)
            self.assertGreater(event["tip"][1], event["hand"][1], event)

    def test_study_preserves_artist_source_and_protects_review(self):
        original = SOURCE.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "test-review"
            manifest = self.model.write_study(target, SOURCE)
            self.assertFalse(manifest["approvedForGame"])
            self.assertFalse(manifest["schoolOverridesEnabled"])
            self.assertTrue((target / "staff-walk-world-space-once.gif").is_file())
            self.assertTrue((target / "staff-walk-16-key-contact.png").is_file())
            self.assertTrue((target / "staff-walk-inplace-loop.gif").is_file())
            with Image.open(target / "staff-assisted-walk-16f-64x80.png") as atlas:
                self.assertEqual((16 * 64, 80), atlas.size)
            with self.assertRaises(FileExistsError):
                self.model.write_study(target, SOURCE)
        self.assertEqual(original, SOURCE.read_bytes())

    def test_invalid_artist_atlas_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            invalid = Path(directory) / "invalid.png"
            Image.new("RGBA", (64, 80)).save(invalid)
            with self.assertRaises(ValueError):
                self.model.render(invalid)


if __name__ == "__main__":
    unittest.main()
