"""Geometry regression for the WyrmForge Arcane Nexus Step 10 prototype.

Automated structural checks cannot replace actual owner visual acceptance.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
import trimesh

SOURCE = Path(__file__).with_name("arcane_nexus_step10_refit.py")


class TestStep10Greybox(unittest.TestCase):
    def test_real_geometry_and_reference_driven_transformations(self):
        with tempfile.TemporaryDirectory() as temp:
            run = subprocess.run([sys.executable, str(SOURCE), temp],
                                 capture_output=True, text=True, check=True)
            self.assertIn("3D semantic groups", run.stdout)
            root = Path(temp)
            result = trimesh.load(root / "arcane-nexus-step10-greybox.glb", force="scene")
            baseline = trimesh.load(root / "source-stage/arcane-nexus-step7-greybox.glb", force="scene")
            self.assertGreater(len(result.geometry), 195)
            for semantic_id in ("observatory.slate-segmented-shell", "hall.porch.double-doors",
                                "market.arcane-bookstall.shelves", "connector.east-wing.support-piers",
                                "portal.side-elevation.window-recess", "portal.glyph-rings"):
                self.assertIn(semantic_id, result.geometry)
            for mesh in result.geometry.values():
                self.assertTrue(np.isfinite(mesh.vertices).all())
                self.assertGreaterEqual(len(mesh.faces), 2)
            center = lambda scene, key: scene.geometry[key].bounds.mean(axis=0)
            self.assertGreater(center(result, "hall.porch.double-doors")[0] -
                               center(baseline, "hall.porch.double-doors")[0], 2)
            self.assertGreater(center(result, "portal.center-stone")[0] -
                               center(baseline, "portal.center-stone")[0], 1.4)
            self.assertLess(center(result, "terrace.second-armillary.center")[0] -
                            center(baseline, "terrace.second-armillary.center")[0], 0)
            span = result.bounds[1] - result.bounds[0]
            self.assertGreater(span[0], 11)
            self.assertGreater(span[1], 7)
            self.assertGreater(span[2], 8)


if __name__ == "__main__":
    unittest.main()
