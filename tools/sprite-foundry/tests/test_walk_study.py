"""Wizard walk study checks. These do not grant artistic/gameplay approval."""
import importlib.util
import math
import sys
import unittest
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parents[1] / "experiments" / "shared-wizard-master-v001"
SPEC = importlib.util.spec_from_file_location("wizard_walk_study", HERE / "walk_study.py")
study = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = study
SPEC.loader.exec_module(study)


class WizardWalkStudyTests(unittest.TestCase):
    def test_walk_keeps_one_master_and_never_mutates_idle_pose(self):
        original = tuple(study.master.build_master())
        for frame in range(4):
            posed = study.pose(frame)
            self.assertEqual(Counter(f.feature for f in original),
                             Counter(f.feature for f in posed))
            self.assertEqual(len(original), len(posed))
        self.assertEqual(original, tuple(study.master.build_master()))

    def test_staff_right_hand_head_face_and_flame_are_identical_in_all_frames(self):
        fixed = {"right-hand", "right-hand-staff", "staff-flame-base",
                 "staff-fire", "staff-flame-core", "floppy-hat",
                 "beard-lock", "face", "nose"}
        original = tuple(f for f in study.master.build_master() if f.feature in fixed)
        self.assertGreater(len(original), 50)
        for frame in range(16):
            posed = tuple(f for f in study.pose(frame, 16) if f.feature in fixed)
            self.assertEqual(original, posed, frame)

    def test_foot_contact_and_passing_pose_alternate_without_leg_swapping(self):
        original = tuple(study.master.build_master())
        boot_indices = [
            index for index, face in enumerate(original)
            if face.feature == "boot-toe"
        ]
        self.assertTrue(boot_indices)
        for index in boot_indices:
            points = original[index].points
            x = sum(p[0] for p in points) / len(points)
            side = "right" if x < 0 else "left"
            front_contact = study.pose(0)[index].points
            back_contact = study.pose(2)[index].points
            z0 = sum(p[2] for p in front_contact) / len(front_contact)
            z2 = sum(p[2] for p in back_contact) / len(back_contact)
            self.assertGreater(z0, z2, side) if side == "right" else self.assertLess(z0, z2, side)
            # Only the forward-moving leg lifts during its passing pose.
            p1 = study.pose(1)[index].points
            p3 = study.pose(3)[index].points
            y1 = sum(p[1] for p in p1) / len(p1)
            y3 = sum(p[1] for p in p3) / len(p3)
            self.assertGreater(y1, y3, side) if side == "right" else self.assertLess(y1, y3, side)

    def test_native_frames_are_distinct_and_reproducible(self):
        for direction in ("S", "SE", "E"):
            frames = [study.render_frame(direction, i, use_materials=False) for i in range(4)]
            self.assertTrue(all(f.size == (64, 80) and f.mode == "RGBA" for f in frames))
            self.assertEqual(4, len({f.tobytes() for f in frames}), direction)
            self.assertEqual(frames[0].tobytes(),
                             study.render_frame(direction, 0, use_materials=False).tobytes())

    def test_16_frame_loop_returns_to_initial_geometry_without_discontinuity(self):
        first = study.pose(0, 16)
        self.assertEqual(first, study.pose(0, 16))
        # The geometry of the final frame should be closer to first than
        # the half-cycle contact pose is.
        last, half = study.pose(15, 16), study.pose(8, 16)
        index = next(i for i, f in enumerate(first) if f.feature == "boot-toe")
        def distance(a, b):
            return sum(math.dist(p, q) for p, q in zip(a[index].points, b[index].points))
        self.assertLess(distance(first, last), distance(first, half))

    def test_invalid_clip_requests_are_rejected(self):
        for frame, count in ((-1, 4), (4, 4), (0, 3), (0, 5)):
            with self.subTest(frame=frame, count=count), self.assertRaises(ValueError):
                study.pose(frame, count)
        with self.assertRaises(ValueError):
            study.render_frame("BROKEN", 0)
        with self.assertRaises(ValueError):
            study.master.render("S", posed_faces=study.pose(0), presentation_pose=True)


if __name__ == "__main__":
    unittest.main()
