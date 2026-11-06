"""Regression checks for v002 larger arm and planted-staff excursion."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

STUDY = (
    Path(__file__).resolve().parent.parent / "studies"
    / "anokolisa-wizard-v001"
)
WORK = STUDY / "staff-walk-side-v002"
MODULE = importlib.util.spec_from_file_location(
    "staff_walk_v002_study", WORK / "staff_walk.py"
)
staff = importlib.util.module_from_spec(MODULE)
MODULE.loader.exec_module(staff)


class StaffContactStudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source_path = STUDY / "run-side-grey-6f-64x80.png"
        cls.source = Image.open(cls.source_path).convert("RGBA")
        cls.original = cls.source.tobytes()
        cls.frames, cls.events = staff.render(cls.source)

    def test_reach_staff_lift_and_root_travel_are_larger_than_v001(self):
        old_path = STUDY / "staff-walk-side-v001" / "staff_walk.py"
        old_spec = importlib.util.spec_from_file_location(
            "wizard_staff_v001_compare", old_path
        )
        previous = importlib.util.module_from_spec(old_spec)
        old_spec.loader.exec_module(previous)
        _, old_events = previous.render(self.source)
        def span(events, key, index):
            return max(event[key][index] for event in events) - min(
                event[key][index] for event in events
            )
        self.assertGreater(
            span(self.events, "hand", 0), span(old_events, "hand", 0) + 5
        )
        self.assertGreater(
            span(self.events, "tip", 0), span(old_events, "tip", 0) + 5
        )
        self.assertGreater(
            self.events[8]["rootTravelPx"],
            old_events[8]["rootTravelPx"] + 5
        )
        self.assertLess(
            min(e["tip"][1] for e in self.events),
            min(e["tip"][1] for e in old_events) - 5
        )
        comparison = staff.compare_motion(self.source)
        self.assertEqual(len(comparison), 12)
        self.assertTrue(all(image.size == (512, 350) for image in comparison))

    def test_artist_source_unchanged_and_twelve_true_native_cells(self):
        self.assertEqual(self.source.tobytes(), self.original)
        self.assertEqual(len(self.frames), 12)
        self.assertEqual(len(self.events), 12)
        for frame in self.frames:
            self.assertEqual(frame.mode, "RGBA")
            self.assertEqual(frame.size, (64, 80))
            self.assertNotEqual(frame.getbbox(), None)

    def test_right_elbow_always_behind_and_below_gripping_hand(self):
        for event in self.events:
            with self.subTest(step=event["frame"]):
                self.assertLess(event["shoulder"][0], event["hand"][0])
                self.assertLess(event["elbow"][0], event["hand"][0])
                self.assertGreater(event["elbow"][1], event["hand"][1])
                top_x, top_y = event["top"]
                hand_x, hand_y = event["hand"]
                tip_x, tip_y = event["tip"]
                shaft_x_at_hand = (
                    top_x + (tip_x - top_x) * (hand_y - top_y)
                    / (tip_y - top_y)
                )
                self.assertLessEqual(abs(shaft_x_at_hand - hand_x), 0.6)

    def test_planted_tip_remains_fixed_in_world_space(self):
        contacts = self.events[2:9]
        self.assertEqual({event["phase"] for event in contacts},
                         {"plant", "support", "passing", "behind"})
        self.assertTrue(all(event["tipGrounded"] for event in contacts))
        self.assertEqual({event["tip"][1] for event in contacts}, {74})
        self.assertEqual({event["worldTipX"] for event in contacts}, {60})
        self.assertEqual(
            [event["rootTravelPx"] for event in contacts],
            sorted(event["rootTravelPx"] for event in contacts)
        )
        for event in self.events[:2] + self.events[9:]:
            self.assertFalse(event["tipGrounded"])

    def test_ground_contact_visual_stays_at_one_screen_coordinate(self):
        for frame, event in zip(
            self.frames[2:9], self.events[2:9], strict=True
        ):
            preview = staff.world_space_frame(frame, event)
            with self.subTest(step=event["frame"]):
                self.assertEqual(
                    preview.getpixel((272, 296)), (137, 197, 142)
                )

    def test_shaft_visible_above_and_below_grip(self):
        shaft_colors = {
            staff.COLORS["woodDark"][:3],
            staff.COLORS["wood"][:3],
            staff.COLORS["woodLight"][:3],
        }
        for frame, event in zip(self.frames, self.events, strict=True):
            for y in (25, min(60, event["tip"][1] - 6)):
                top_x, top_y = event["top"]
                tip_x, tip_y = event["tip"]
                predicted = round(
                    top_x + (tip_x - top_x) * (y - top_y) / (tip_y - top_y)
                )
                with self.subTest(step=event["frame"], y=y):
                    self.assertTrue(any(
                        frame.getpixel((x, y))[:3] in shaft_colors
                        for x in range(max(0, predicted - 2),
                                       min(64, predicted + 3))
                    ))

    def test_committed_review_atlas_and_manifest_reproduce(self):
        atlas = staff.atlas_from_frames(self.frames)
        committed = Image.open(
            WORK / "staff-side-12f-64x80.png"
        ).convert("RGBA")
        self.assertEqual(atlas.tobytes(), committed.tobytes())
        metadata = json.loads((WORK / "manifest.json").read_text(
            encoding="utf-8"
        ))
        self.assertFalse(metadata["approvedForGame"])
        self.assertEqual(metadata["events"], self.events)
        self.assertEqual(metadata["feetAnchor"], [32, 74])
        self.assertIn("NOT a finished walk", metadata["status"])
        self.assertEqual(metadata["comparedTo"], "staff-walk-side-v001")

    def test_regenerate_to_new_dir_without_overwriting(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "staff-study"
            result = staff.write_study(self.source_path, output)
            self.assertFalse(result["approvedForGame"])
            self.assertTrue((output / "staff-side-12-keys.gif").is_file())
            self.assertTrue((output / "staff-ground-contact-once.gif").is_file())
            self.assertTrue((output / "staff-motion-before-after.gif").is_file())
            self.assertTrue((output / "selected-before-after.png").is_file())
            self.assertTrue((output / "staff-contact-12-keys.png").is_file())
            with self.assertRaises(FileExistsError):
                staff.write_study(self.source_path, output)


if __name__ == "__main__":
    unittest.main()
