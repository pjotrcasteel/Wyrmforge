"""Source-only scorched ground art must not imply lighting or emission acceptance."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_scorched_ground_art_candidates import create
from quilt_ground_material_study import SOURCES

class ScorchedGroundArtTests(unittest.TestCase):
    def test_archive_cannot_be_overwritten(self):
        with self.assertRaises(ValueError):
            create(SOURCES, SOURCES / "export")

    def test_six_painted_studies_with_no_runtime_emission(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            report = create(SOURCES, output)
            self.assertEqual(report["family"], "scorched-ground")
            self.assertEqual(len(list(output.glob("*.png"))), 12)
            self.assertEqual(report["compatibleEdgeMeanRgbGap"], 0)
            self.assertFalse(report["rendererIntegration"])
            self.assertFalse(report["physicalMaterialMapsAuthored"])
            self.assertFalse(report["runtimeUse"])
            self.assertTrue((output / report["independentReview"]).is_file())
            self.assertTrue((output / report["mixedVariantReview"]).is_file())
            self.assertEqual([v["dominantSourceIntent"] for v in report["variants"]], list(range(1, 7)))
