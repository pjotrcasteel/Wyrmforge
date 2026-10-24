"""Audit source invariants when Blender is absent; does not validate runtime bpy."""
import ast
from pathlib import Path
import unittest

SOURCE=Path(__file__).resolve().parents[1]/'build_wizard_blender.py'
class BlenderSourceContractTests(unittest.TestCase):
    def test_parser_and_required_source_modules(self):
        source=SOURCE.read_text()
        ast.parse(source)
        for feature in ['WizardRig','Armature','CLOTH','IK','vertex_group_mass',
                        'use_self_collision','source actions','bpy.ops.wm.save_as_mainfile',
                        'Same camera / all 8 directions','Six school staffs',
                        'World-anchored','Weighty coat','head','beard.root','beard.tip']:
            self.assertIn(feature.lower(),source.lower(),feature)
    def test_never_stand_alone_mage_renderer(self):
        source=SOURCE.read_text()
        for forbidden in ['drawmage(', 'draw_fireball_on_wizard', 'ctx.drawImage', 'css brightness']:
            self.assertNotIn(forbidden,source)

if __name__=='__main__':unittest.main()
