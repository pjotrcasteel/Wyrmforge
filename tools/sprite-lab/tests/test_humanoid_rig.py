"""Pure-Python regression for reusable humanoid Blender armature definitions."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from character_pipeline.humanoid_rig import humanoid_bones

class HumanoidTemplateTests(unittest.TestCase):
    def test_wizard_names_and_positions_preserved(self):
        rig=humanoid_bones(include_beard=True)
        self.assertEqual(len(rig),22)
        self.assertEqual(rig['root'],((0.,0.,0.),(0.,0.,.14),None))
        self.assertEqual(rig['beard.tip'][2],'beard.root')
        self.assertEqual(rig['hand.R'][0],(.50,-.29,1.16))
        self.assertEqual(rig['foot.L'][2],'shin.L')
        for name,(start,end,parent) in rig.items():
            self.assertNotEqual(start,end,name)
            if parent is not None:self.assertIn(parent,rig)

    def test_other_humanoids_can_scale_independently_and_drop_beard(self):
        base=humanoid_bones()
        heavy=humanoid_bones(height_scale=1.2,width_scale=1.5,depth_scale=1.1)
        self.assertEqual(len(base),20)
        self.assertNotIn('beard.root',base)
        self.assertAlmostEqual(heavy['head'][1][2],base['head'][1][2]*1.2)
        self.assertAlmostEqual(heavy['hand.R'][0][0],base['hand.R'][0][0]*1.5)
        self.assertEqual(humanoid_bones(include_beard=True)['head'][0][2],1.70)

    def test_reject_invalid_dimensions(self):
        for dims in ({'height_scale':0},{'width_scale':float('inf')},{'depth_scale':-2}):
            with self.assertRaises(ValueError):humanoid_bones(**dims)

if __name__=='__main__':unittest.main()
