"""Run in Blender: blender -b --python tools/animation/test_kinematics.py."""
import sys,unittest,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import two_bone_points,support_margin
from mathutils import Vector
class KinematicsTests(unittest.TestCase):
    def test_fixed_lengths_and_pole_continuity(self):
        last=None
        for i in range(100):
            target=Vector((.1+i*.001,-.4,.1));mid,flex=two_bone_points((0,0,0),target,(1,0,0),.3,.3)
            self.assertAlmostEqual(mid.length,.3,places=6)
            self.assertAlmostEqual((target-mid).length,.3,places=6)
            self.assertTrue(0<flex<180)
            if last is not None:self.assertLess((mid-last).length,.01)
            last=mid
    def test_unreachable_and_singular_fail(self):
        for args in [((0,0,0),(2,0,0),(0,1,0),.3,.3),((0,0,0),(.4,0,0),(.2,0,0),.3,.3),((0,0,0),(0,0,0),(1,0,0),.3,.3)]:
            with self.assertRaises(ValueError):two_bone_points(*args)
    def test_support_polygon_signed_margin(self):
        square=[(-1,-1),(-1,1),(1,1),(1,-1)]
        self.assertAlmostEqual(support_margin((0,0),square),1)
        self.assertLess(support_margin((2,0),square),0)
        with self.assertRaises(ValueError):support_margin((0,0),[(0,0),(1,0)])
r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(KinematicsTests))
if not r.wasSuccessful():sys.exit(1)
