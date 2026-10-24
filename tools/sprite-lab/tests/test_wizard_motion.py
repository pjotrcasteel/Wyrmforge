"""Numerically verify real planted foot intervals and continuously joined swing."""
import math
import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

from wizard_motion import ANKLE_HEIGHT, STANCE_FRACTION, WALK_FRAMES, cast_progress, foot_position, walk_pose


class WizardMotionTests(unittest.TestCase):
    def test_opposite_steps_have_ground_contact(self):
        samples = [walk_pose(f / WALK_FRAMES) for f in range(WALK_FRAMES)]
        assert 5 <= sum(p.left.planted for p in samples) <= 11
        assert 5 <= sum(p.right.planted for p in samples) <= 11
        assert sum(p.left.planted != p.right.planted for p in samples) >= 10
        for pose in samples:
            for foot in [pose.left, pose.right]:
                if foot.planted:
                    self.assertAlmostEqual(foot.z, ANKLE_HEIGHT)
                else:
                    self.assertGreaterEqual(foot.z, ANKLE_HEIGHT)
        self.assertTrue(any(p.left.z > ANKLE_HEIGHT + .14 for p in samples))
        self.assertTrue(any(p.right.z > ANKLE_HEIGHT + .14 for p in samples))

    def test_no_large_seam_at_liftoff_or_touchdown(self):
        for side in ('L', 'R'):
            offset = 0 if side == 'L' else .5
            for boundary in [STANCE_FRACTION, 1.0]:
                a = foot_position(boundary - offset - 1e-5, side)
                b = foot_position(boundary - offset + 1e-5, side)
                self.assertLess(math.dist((a.y, a.z), (b.y, b.z)), .004)

    def test_16_phases_unique_and_repeatable(self):
        steps = [walk_pose(i/16) for i in range(16)]
        self.assertEqual(len({(round(x.left.y, 3), round(x.right.z, 3)) for x in steps}), 16)
        self.assertEqual(walk_pose(0), walk_pose(1))

    def test_cast_staff_and_emission_start_before_release(self):
        early = cast_progress(2)
        peak = cast_progress(11)
        late = cast_progress(19)
        self.assertGreater(early[2], 0)
        self.assertLess(early[2], peak[2])
        self.assertAlmostEqual(peak[2], 1)
        self.assertAlmostEqual(late[2], 0)
        self.assertGreater(peak[1], 0)


if __name__ == '__main__':
    unittest.main()
