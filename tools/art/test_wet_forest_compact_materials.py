"""Standalone regression tests for the immutable compact Wet Forest image family."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE = Path(__file__).with_name('build_wet_forest_compact_materials.py')
SPEC = importlib.util.spec_from_file_location('wetforest_compact_assets', MODULE)
ART = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ART)


class WetForestCompactMaterialsTests(unittest.TestCase):
    def test_three_256px_flat_color_materials_repeat_without_modifying_source(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / 'output'
            manifest = ART.build(destination)
            self.assertFalse(manifest['ownerApproved'])
            self.assertFalse(manifest['runtimeGeometry'])
            self.assertEqual(manifest['tileSize'], 256)
            self.assertEqual(set(manifest['materials']), {'grass-moss', 'trampled-earth', 'wet-mud'})
            for name, record in manifest['materials'].items():
                path = destination / record['file']
                raw = path.read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), record['sha256'])
                with Image.open(path) as image:
                    self.assertEqual(image.size, (256, 256))
                    self.assertEqual(image.mode, 'RGB')
                    self.assertLessEqual(len(image.getcolors(65536)), 8,
                        'The palette is intentionally small and must not contain baked gradients.')
                    self.assertEqual([image.getpixel((0, y)) for y in range(256)],
                                     [image.getpixel((255, y)) for y in range(256)])
                    self.assertEqual([image.getpixel((x, 0)) for x in range(256)],
                                     [image.getpixel((x, 255)) for x in range(256)])
                self.assertEqual(raw, (ART.build(destination) and path.read_bytes()),
                    'Authored material asset must not depend on level seed or current time.')


if __name__ == '__main__':
    unittest.main()
