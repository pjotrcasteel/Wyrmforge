"""Marsh/Wet Bank art candidates remain nonphysical and source-preserving."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_marsh_wet_bank_art_candidates import create
from quilt_ground_material_study import SOURCES

class MarshWetBankArtTests(unittest.TestCase):
    def test_archive_protected(self):
        with self.assertRaises(ValueError):
            create(SOURCES, SOURCES / "derived")

    def test_bank_studies_are_review_only_not_water_geometry(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            report = create(SOURCES, output)
            self.assertEqual(report["family"], "marsh-wet-bank")
            self.assertEqual(len(list(output.glob("*.png"))), 12)
            self.assertEqual(report["compatibleEdgeMeanRgbGap"], 0)
            self.assertFalse(report["waterGeometryAuthored"])
            self.assertFalse(report["physicalMaterialMapsAuthored"])
            self.assertFalse(report["runtimeUse"])
            self.assertTrue((output / report["independentReview"]).is_file())
            self.assertTrue((output / report["mixedVariantReview"]).is_file())
            self.assertEqual([v["dominantSourceIntent"] for v in report["variants"]], list(range(1, 7)))
