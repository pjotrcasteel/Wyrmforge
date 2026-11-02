"""Wizard gait proof: structural and native-pixel checks, never art approval."""
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
    def test_walk_keeps_master_and_all_fixed_garment_damage(self):
        original = tuple(study.master.build_master())
        original_features = Counter(f.feature for f in original)
        for frame in range(16):
            posed = study.pose(frame, 16)
            features = Counter(f.feature for f in posed)
            for feature, count in original_features.items():
                if feature == "trouser":
                    self.assertEqual(count * 2, features[feature])
                else:
                    self.assertEqual(count, features[feature], (frame, feature))
            # There are no additional features or independently redrawn tears.
            self.assertEqual(set(original_features), set(features))
        self.assertEqual(original, tuple(study.master.build_master()))

    def test_knee_bones_keep_constant_lengths_and_reachable_ankle(self):
        for frame in range(16):
            phase = 2.0 * math.pi * frame / 16
            for side in (-1, 1):
                hip, knee, ankle = study.leg_joint_positions(side, phase)
                self.assertAlmostEqual(.56, math.dist(hip, knee), places=6)
                self.assertAlmostEqual(.55, math.dist(knee, ankle), places=6)
                self.assertGreater(knee[2], min(hip[2], ankle[2]) - .01)
                self.assertEqual(side, -1 if hip[0] < 0 else 1)

    def test_staff_grip_head_hat_and_flame_use_one_rigid_root_motion(self):
        fixed = {"right-hand", "right-hand-staff", "staff-flame-base",
                 "staff-fire", "staff-flame-core", "floppy-hat",
                 "beard-lock", "face", "nose"}
        reference = tuple(f for f in study.master.build_master() if f.feature in fixed)
        self.assertGreater(len(reference), 50)
        for frame in range(16):
            phase = 2.0 * math.pi * frame / 16
            delta = study.root_motion(phase)
            actual = tuple(f for f in study.pose(frame, 16) if f.feature in fixed)
            self.assertEqual(len(reference), len(actual))
            for base, moved in zip(reference, actual):
                self.assertEqual(base.feature, moved.feature)
                self.assertEqual(base.color, moved.color)
                for a, b in zip(base.points, moved.points):
                    for axis in range(3):
                        self.assertAlmostEqual(delta[axis], b[axis] - a[axis], places=6)

    def test_contact_and_passing_poses_alternate_without_leg_swap(self):
        poses = [study.pose(i) for i in range(4)]

        def boot_center(frame, side):
            points = [
                vertex for face in poses[frame] if face.feature == "boot-toe"
                and (-1 if sum(p[0] for p in face.points) < 0 else 1) == side
                for vertex in face.points
            ]
            self.assertTrue(points)
            return tuple(sum(p[k] for p in points) / len(points) for k in range(3))

        for side in (-1, 1):
            contact_0 = boot_center(0, side)
            contact_2 = boot_center(2, side)
            passing_1 = boot_center(1, side)
            passing_3 = boot_center(3, side)
            if side == -1:
                self.assertGreater(contact_0[2], contact_2[2])
                self.assertLess(passing_1[1], passing_3[1])
            else:
                self.assertLess(contact_0[2], contact_2[2])
                self.assertGreater(passing_1[1], passing_3[1])
            self.assertAlmostEqual(contact_0[1], contact_2[1], places=6)

    def test_lifted_foot_always_sweeps_forward_not_backward(self):
        # Regression: v008 raised the foot during its REARWARD sweep,
        # creating exactly the backwards gait observed by the owner.
        for side in (-1, 1):
            for index in range(16):
                phase = 2.0 * math.pi * index / 16
                next_phase = 2.0 * math.pi * (index + 1) / 16
                _, _, ankle = study.leg_joint_positions(side, phase)
                _, _, next_ankle = study.leg_joint_positions(side, next_phase)
                lift = ankle[1] - .25
                next_lift = next_ankle[1] - .25
                if lift > .01:
                    self.assertGreater(
                        next_ankle[2], ankle[2],
                        f"side={side} frame={index}: lifted foot moved backward",
                    )
                if lift < 1e-7 and next_lift < 1e-7:
                    self.assertLess(
                        next_ankle[2], ankle[2],
                        f"side={side} frame={index}: planted foot moved forward",
                    )

    def test_support_foot_does_not_skate_at_matching_world_speed(self):
        # If the game's movement speed advances one full gait distance per
        # cycle, the support foot's *world* Z must remain exactly planted.
        frame_count = 16
        distance_per_frame = study.travel_per_cycle_metres() / frame_count
        self.assertAlmostEqual(1.6, study.travel_per_cycle_metres(), places=6)
        for side, stance_start in ((-1, 0), (1, frame_count // 2)):
            contact_z = None
            for frame in range(stance_start, stance_start + frame_count // 2 + 1):
                phase = 2.0 * math.pi * frame / frame_count
                foot_z, lift = study.foot_trajectory(side, phase)
                self.assertAlmostEqual(0.0, lift, places=6)
                world_z = distance_per_frame * frame + foot_z
                if contact_z is None:
                    contact_z = world_z
                self.assertAlmostEqual(
                    contact_z, world_z, places=6,
                    msg=f"skating foot {side} at frame {frame}",
                )

    def test_compass_direction_uses_correct_local_forward_axis(self):
        # The master defines local +Z as forward. The right-hand staff and
        # physical feet rotate with this camera, never screen-space flipped.
        expected = {
            "N": (0, -1), "NE": (1, -1), "E": (1, 0),
            "SE": (1, 1), "S": (0, 1), "SW": (-1, 1),
            "W": (-1, 0), "NW": (-1, -1),
        }
        for direction, (expected_x, expected_y) in expected.items():
            yaw = study.master.DIRECTIONS[direction]
            origin = study.master.project((0, 0, 0), yaw)
            ahead = study.master.project((0, 0, 1), yaw)
            delta = (ahead[0] - origin[0], ahead[1] - origin[1])
            for axis, expected_sign in enumerate((expected_x, expected_y)):
                if expected_sign == 0:
                    self.assertAlmostEqual(0, delta[axis], places=6)
                elif expected_sign > 0:
                    self.assertGreater(delta[axis], 0, direction)
                else:
                    self.assertLess(delta[axis], 0, direction)

    def test_native_frames_are_distinct_reproducible_and_directional(self):
        for direction in ("N", "SE", "S", "W"):
            frames = [study.render_frame(direction, i, use_materials=False) for i in range(4)]
            self.assertTrue(all(f.size == (64, 80) and f.mode == "RGBA" for f in frames))
            self.assertEqual(4, len({f.tobytes() for f in frames}), direction)
            self.assertEqual(frames[0].tobytes(),
                             study.render_frame(direction, 0, use_materials=False).tobytes())

    def test_fire_remains_visible_through_all_four_poses_and_eight_directions(self):
        for direction in study.CANONICAL_DIRECTIONS:
            for index in range(4):
                frame = study.render_frame(direction, index, use_materials=False)
                rgba = frame.tobytes()
                fire_count = sum(
                    1 for offset in range(0, len(rgba), 4)
                    if rgba[offset+3] and rgba[offset] >= 170
                    and rgba[offset+1] >= 55 and rgba[offset+2] <= 90
                )
                self.assertGreaterEqual(fire_count, 8, (direction, index))

    def test_16_frame_loop_is_continuous(self):
        first, last, half = study.pose(0, 16), study.pose(15, 16), study.pose(8, 16)
        index = next(i for i, f in enumerate(first) if f.feature == "boot-toe")

        def distance(a, b):
            return sum(math.dist(p, q) for p, q in zip(a[index].points, b[index].points))

        self.assertLess(distance(first, last), distance(first, half))
        self.assertEqual(first, study.pose(0, 16))

    def test_motion_review_is_native_nearest_neighbour_and_frame_complete(self):
        images = study.animated_review_frames(4, zoom=2, use_materials=False)
        self.assertEqual(4, len(images))
        self.assertTrue(all(image.mode == "RGBA" and image.size == (432, 202) for image in images))
        self.assertEqual(4, len({image.tobytes() for image in images}))
        with self.assertRaises(ValueError):
            study.animated_review_frames(5, use_materials=False)
        with self.assertRaises(ValueError):
            study.animated_review_frames(4, zoom=11, use_materials=False)

    def test_invalid_clip_requests_are_rejected(self):
        for frame, count in ((-1, 4), (4, 4), (0, 3), (0, 5)):
            with self.subTest(frame=frame, count=count), self.assertRaises(ValueError):
                study.pose(frame, count)
        with self.assertRaises(ValueError):
            study.leg_joint_positions(0, 0.0)
        with self.assertRaises(ValueError):
            study.render_frame("BROKEN", 0)
        with self.assertRaises(ValueError):
            study.master.render("S", posed_faces=study.pose(0), presentation_pose=True)


if __name__ == "__main__":
    unittest.main()
