import unittest
import tempfile
from pathlib import Path
from cmu_bvh_walk_review import load_bvh,pose,render

class MotionTests(unittest.TestCase):
    def test_invalid_source_fails(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"bad.bvh";p.write_text("fake")
            with self.assertRaises(ValueError):load_bvh(p)
    def test_synthetic_hierarchy(self):
        parts=["HIERARCHY","ROOT Hips","{","OFFSET 0 0 0","CHANNELS 6 Xposition Yposition Zposition Zrotation Yrotation Xrotation"]
        names=("LeftUpLeg","LeftLeg","LeftFoot","RightUpLeg","RightLeg","RightFoot","Head")
        for name in names:
            parts+=["JOINT "+name,"{","OFFSET 1 -2 0","CHANNELS 3 Zrotation Yrotation Xrotation","}"]
        parts+=["}","MOTION","Frames: 50","Frame Time: 0.025"]
        parts+=["0 20 0 0 0 0 "+("0 0 0 "*len(names)) for _ in range(50)]
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"valid.bvh";p.write_text("\n".join(parts))
            motion=load_bvh(p)
            self.assertEqual(len(motion.frames),50)
            self.assertEqual(len(motion.joints),8)
            self.assertIn("LeftFoot",pose(motion,2))

if __name__=="__main__":unittest.main()
