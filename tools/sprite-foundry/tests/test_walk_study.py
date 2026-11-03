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

    def test_walking_staff_shaft_is_nearly_straight_without_master_changes(self):
        before = tuple(study.master.build_master())
        changed = 0
        for face in before:
            posed_rest = study.straightened_walk_staff_face(face)
            if face.feature not in study.RIGHT_STAFF_FEATURES or face.feature == "right-hand":
                self.assertIs(face, posed_rest)
                continue
            self.assertEqual(face.feature, posed_rest.feature)
            self.assertEqual(face.color, posed_rest.color)
            self.assertEqual(len(face.points), len(posed_rest.points))
            for original, point in zip(face.points, posed_rest.points):
                self.assertAlmostEqual(original[1], point[1])
                if original[1] <= study.RIGHT_GRIP[1]:
                    self.assertEqual(original, point)
                elif original[1] >= study.STAFF_CROOK_TOP_Y:
                    changed += 1
                    self.assertAlmostEqual(study.STAFF_CROOK_CORRECTION_X, point[0] - original[0])
                    self.assertAlmostEqual(study.STAFF_CROOK_CORRECTION_Z, point[2] - original[2])
        self.assertGreater(changed, 20)
        upper = (-.91 + study.STAFF_CROOK_CORRECTION_X,
                 3.26,
                 -.34 + study.STAFF_CROOK_CORRECTION_Z)
        horizontal_offset = math.hypot(upper[0] - study.RIGHT_GRIP[0],
                                       upper[2] - study.RIGHT_GRIP[2])
        self.assertLess(horizontal_offset / (upper[1] - study.RIGHT_GRIP[1]), 0.05)
        self.assertEqual(before, tuple(study.master.build_master()))

    def test_staff_plants_lifts_and_remains_rigid_in_right_hand(self):
        tracked = {"right-hand", "right-hand-staff", "staff-flame-base",
                   "staff-fire", "staff-flame-core"}
        original_faces = tuple(study.straightened_walk_staff_face(f)
                               for f in study.master.build_master() if f.feature in tracked)
        original = [p for f in original_faces for p in f.points]
        self.assertGreater(len(original), 200)
        for frame in range(16):
            phase = frame * 2.0 * math.pi / 16
            current_faces = tuple(f for f in study.pose(frame, 16) if f.feature in tracked)
            current = [p for f in current_faces for p in f.points]
            self.assertEqual(len(original), len(current))
            self.assertEqual([f.feature for f in original_faces],
                             [f.feature for f in current_faces])
            # Staff and right grip form one rigid instrument (no floating hand).
            for anchor in (0, len(original) // 2, len(original) - 1):
                for before, after in zip(original, current):
                    self.assertAlmostEqual(math.dist(original[anchor], before),
                                           math.dist(current[anchor], after), places=6)
            tip_z, tip_y = study.staff_tip_trajectory(phase)
            if 8 <= frame < 16:
                self.assertAlmostEqual(study.STAFF_CONTACT_HEIGHT_METRES, tip_y, places=6)
            else:
                self.assertGreaterEqual(tip_y, study.STAFF_CONTACT_HEIGHT_METRES)
            # Original lower pole center is (-.78,.10,.20) in immutable master.
            grip, pitch = study.staff_grip_and_pitch(phase)
            planted_y = grip[1] - study.STAFF_LOWER_SEGMENT_METRES * math.cos(pitch)
            planted_z = grip[2] - study.STAFF_LOWER_SEGMENT_METRES * math.sin(pitch)
            self.assertAlmostEqual(tip_y, planted_y, places=6)
            self.assertAlmostEqual(tip_z, planted_z, places=6)

    def test_planted_staff_tip_is_world_locked_until_next_swing(self):
        # Exactly like planted feet: actor moves forward, staff tip must remain.
        stride_per_frame = study.travel_per_cycle_metres() / 16
        contact_world_z = None
        for frame in range(8, 17):
            phase = 2.0 * math.pi * frame / 16
            tip_z, tip_y = study.staff_tip_trajectory(phase)
            world_z = frame * stride_per_frame + tip_z
            if contact_world_z is None:
                contact_world_z = world_z
            self.assertAlmostEqual(contact_world_z, world_z, places=6)
            self.assertAlmostEqual(study.STAFF_CONTACT_HEIGHT_METRES, tip_y, places=6)
        swing_start = study.staff_tip_trajectory(0.0)[1]
        swing_peak = study.staff_tip_trajectory(math.pi / 2)[1]
        swing_end = study.staff_tip_trajectory(math.pi)[1]
        self.assertGreater(swing_peak - swing_start, 0.20)
        self.assertAlmostEqual(swing_start, swing_end, places=6)

    def test_wizard_leans_into_staff_during_support(self):
        swing = study.root_motion(math.pi / 2)
        supported = study.root_motion(3.0 * math.pi / 2)
        self.assertLess(supported[0], swing[0])  # rightward shoulder/hip lean
        self.assertLess(supported[1], swing[1])  # slight weight-bearing dip
        self.assertGreater(study.staff_support_weight(3.0 * math.pi / 2), .99)
        self.assertEqual(0.0, study.staff_support_weight(math.pi / 2))

    def test_head_beard_and_hat_remain_a_single_rigid_assembly(self):
        tracked = study.HEAD_ASSEMBLY_FEATURES
        reference = [p for f in study.master.build_master()
                     if f.feature in tracked for p in f.points]
        self.assertGreater(len(reference), 100)
        for frame in range(16):
            moved = [p for f in study.pose(frame, 16)
                     if f.feature in tracked for p in f.points]
            self.assertEqual(len(reference), len(moved))
            for index in (0, len(reference) // 2, len(reference) - 1):
                self.assertAlmostEqual(
                    math.dist(reference[0], reference[index]),
                    math.dist(moved[0], moved[index]), places=6)

    def test_shoulder_counterrotation_and_opposed_arm_swing(self):
        left_shoulder = study.LEFT_SHOULDER
        right_shoulder = study.RIGHT_SHOULDER
        left_front = study.upper_body_point(left_shoulder, 0.0)
        right_front = study.upper_body_point(right_shoulder, 0.0)
        left_back = study.upper_body_point(left_shoulder, math.pi)
        right_back = study.upper_body_point(right_shoulder, math.pi)
        self.assertGreater(left_front[2], left_shoulder[2])
        self.assertLess(right_front[2], right_shoulder[2])
        self.assertLess(left_back[2], left_shoulder[2])
        self.assertGreater(right_back[2], right_shoulder[2])

        def hand_center(frame, feature):
            points = [p for f in study.pose(frame, 16)
                      if f.feature == feature for p in f.points]
            return tuple(sum(p[axis] for p in points) / len(points) for axis in range(3))

        left_0 = hand_center(0, "left-hand")
        left_8 = hand_center(8, "left-hand")
        right_0 = hand_center(0, "right-hand")
        right_8 = hand_center(8, "right-hand")
        self.assertGreater(left_0[2], left_8[2])
        self.assertLess(right_0[2], right_8[2])
        self.assertGreater(right_0[1], 1.30)
        self.assertLess(right_0[1], 1.70)

    def test_no_image_edge_clipping_in_any_direction_or_gait_frame(self):
        for direction in study.CANONICAL_DIRECTIONS:
            for index in range(16):
                image = study.render_frame(direction, index, 16, use_materials=False)
                bounds = image.getbbox()
                self.assertIsNotNone(bounds)
                left, top, right, bottom = bounds
                self.assertGreaterEqual(left, 3, (direction, index, bounds))
                self.assertGreaterEqual(top, 3, (direction, index, bounds))
                self.assertLessEqual(right, 61, (direction, index, bounds))
                self.assertLessEqual(bottom, 77, (direction, index, bounds))

    def test_planted_staff_visible_without_new_stray_pixel_types(self):
        for direction in study.CANONICAL_DIRECTIONS:
            for frame in range(16):
                image, labels = study.master.render(
                    direction, posed_faces=study.pose(frame, 16), feature_map=True)
                visible = [feature for row in labels for feature in row]
                self.assertGreaterEqual(visible.count("right-hand-staff"), 16, (direction, frame))
                flame = sum(f in {"staff-fire", "staff-flame-base", "staff-flame-core"}
                            for f in visible)
                self.assertGreaterEqual(flame, 20, (direction, frame))
                if direction not in {"E", "W"}:
                    continue
                rgba = image.load()
                remaining = {(x, y) for y in range(image.height)
                             for x in range(image.width) if rgba[x, y][3]}
                tiny_fragments = 0
                while remaining:
                    stack = [remaining.pop()]
                    component = []
                    while stack:
                        x, y = stack.pop()
                        component.append((x, y))
                        for dx in (-1, 0, 1):
                            for dy in (-1, 0, 1):
                                adjacent = (x + dx, y + dy)
                                if adjacent in remaining:
                                    remaining.remove(adjacent)
                                    stack.append(adjacent)
                    if len(component) <= 2:
                        tiny_fragments += 1
                        self.assertEqual({"beard-lock"}, {labels[y][x] for x, y in component},
                                         (direction, frame, component))
                self.assertLessEqual(tiny_fragments, 5, (direction, frame))

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

    def test_fire_remains_visible_through_all_sixteen_frames_and_eight_directions(self):
        for direction in study.CANONICAL_DIRECTIONS:
            for index in range(16):
                frame = study.render_frame(direction, index, 16, use_materials=False)
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
        all_eight = study.animated_review_frames(
            16, zoom=2, use_materials=False,
            directions=study.CANONICAL_DIRECTIONS)
        self.assertEqual(16, len(all_eight))
        self.assertTrue(all(image.size == (572, 374) for image in all_eight))
        self.assertEqual(16, len({image.tobytes() for image in all_eight}))
        with self.assertRaises(ValueError):
            study.animated_review_frames(4, use_materials=False, directions=("S", "S"))
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
