"""Structural regression for WyrmForge Arcane Nexus Step 6 greybox.

Tests only real geometry/output; visual likeness remains a manual approval gate.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import trimesh
import numpy as np

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / 'arcane_nexus_step6_greybox.py'

class TestStep6Greybox(unittest.TestCase):
    def test_export_contains_full_3d_architecture_without_painted_projection(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = subprocess.run([sys.executable,str(SCRIPT),str(tmp)],capture_output=True,text=True,check=True)
            self.assertIn('semantic meshes',run.stdout)
            model=Path(tmp)/'arcane-nexus-step6-greybox.glb'
            self.assertTrue(model.exists())
            scene=trimesh.load(model,force='scene')
            names=list(scene.graph.nodes_geometry)
            for prefix in ('hall.crosswing.gothic-cross-gable','hall.pitched-roof.individual-slates',
                           'observatory.orrery.front-meridians','observatory.slate-segmented-shell',
                           'portal.frame.front-jambs','portal.passage.inward-vault'):
                self.assertTrue(any(x.startswith(prefix) for x in names),prefix)
            bounds=scene.bounds
            self.assertGreater(bounds[1,0]-bounds[0,0],9)
            self.assertGreater(bounds[1,1]-bounds[0,1],7)
            self.assertGreater(bounds[1,2]-bounds[0,2],8)
            self.assertGreater(len(names),110)
            for geom in scene.geometry.values():
                self.assertTrue(np.isfinite(geom.vertices).all())
                self.assertGreaterEqual(len(geom.faces),2)
            # New entrance blocks deliberately leave the opening itself free.
            self.assertNotIn('portal.frame.front-facade',names)
            self.assertNotIn('portal.frame.recess',names)
            self.assertNotIn('hall.porch.lower',names)

if __name__=='__main__':
    unittest.main()