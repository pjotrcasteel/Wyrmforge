"""Geometry-level smoke validation for the unapproved WyrmForge Nexus Step 4.

Run: python tools/town/test_arcane_nexus_step4_geometry.py
The test intentionally verifies actual exported triangles and semantic 3D objects,
NOT artistic approval or integration with production lighting.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
import trimesh


SCRIPT = Path(__file__).with_name('arcane_nexus_step4_greybox.py')
EXPECTED = {
    'hall.primary-steep-slate',
    'hall.porch.pointed-arch',
    'observatory.round-masonry',
    'observatory.slate-segmented-shell',
    'observatory.open-canopy.ribs',
    'observatory.armillary.great-rings',
    'portal.gallery.stone-deck',
    'portal.gallery.front-balustrade',
    'portal.pointed-recess.arches',
    'portal.stairs',
    'terrace.second-armillary.rings',
}


class ArcaneNexusStep4GeometryTests(unittest.TestCase):
    def test_real_3d_export(self):
        with tempfile.TemporaryDirectory() as directory:
            subprocess.run([sys.executable, str(SCRIPT), directory], check=True, capture_output=True, text=True)
            result = Path(directory) / 'arcane-nexus-step4-greybox.glb'
            self.assertTrue(result.exists())
            scene = trimesh.load(result, force='scene')
            self.assertGreater(len(scene.geometry), 100)
            self.assertTrue(EXPECTED.issubset(scene.geometry))
            self.assertGreater(sum(len(mesh.faces) for mesh in scene.geometry.values()), 45_000)
            extents = scene.bounds[1] - scene.bounds[0]
            self.assertTrue(np.all(extents > 8.0), 'Mesh must occupy meaningful X/Y/Z space')
            self.assertTrue(np.all(np.isfinite(scene.bounds)))
            # A painting projected onto a plane would typically have UV-backed image materials.
            # The greybox should have face colours only; no image textures in any exported group.
            for name, mesh in scene.geometry.items():
                self.assertEqual(len(mesh.vertices[0]), 3, name)
                self.assertNotEqual(mesh.visual.kind, 'texture', f'{name} should have no projected image')


if __name__ == '__main__':
    unittest.main()