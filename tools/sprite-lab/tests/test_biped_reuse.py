"""The same gait solver can animate a wizard and differently sized humanoid."""
import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from character_pipeline.biped import BipedGait,sample_foot
from wizard_motion import foot_position as wizard_foot_position

class BipedReuseTests(unittest.TestCase):
    def test_defaults_exactly_preserve_wizard(self):
        for i in range(160):
            for side in ('L','R'):
                self.assertEqual(vars(sample_foot(i/160,side,BipedGait())),
                                 vars(wizard_foot_position(i/160,side)))

    def test_different_body_proportions_do_not_change_wizard(self):
        enemy=BipedGait(stride=.92,ankle_height=.09,swing_clearance=.27,
                        left_x=-.3,right_x=.3,stance_fraction=.57)
        tall=sample_foot(.4,'L',enemy)
        wizard=wizard_foot_position(.4,'L')
        self.assertNotEqual(tall.x,wizard.x)
        self.assertNotEqual(tall.y,wizard.y)
        self.assertTrue(sample_foot(.05,'R',enemy).planted)
        for side in ('L','R'):
            offset=0 if side=='L' else .5
            for boundary in (enemy.stance_fraction,1):
                a=sample_foot(boundary-offset-1e-6,side,enemy)
                b=sample_foot(boundary-offset+1e-6,side,enemy)
                self.assertLess(math.dist((a.y,a.z),(b.y,b.z)),.004)

    def test_reject_bad_authoring_dimensions(self):
        for dims in ({'stride':0},{'stance_fraction':1},
                     {'swing_clearance':-1},{'opposite_offset':0}):
            with self.assertRaises(ValueError): BipedGait(**dims)
        with self.assertRaises(ValueError): sample_foot(float('nan'),'L',BipedGait())

if __name__=='__main__': unittest.main()
