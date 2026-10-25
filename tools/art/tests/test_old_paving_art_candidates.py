"""Old Paving review exports must remain source-preserving and unapproved."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_old_paving_art_candidates import create
from quilt_ground_material_study import SOURCES

class OldPavingArtTests(unittest.TestCase):
    def test_source_archive_is_protected(self):
        with self.assertRaises(ValueError):
            create(SOURCES, SOURCES / "derived")

    def test_six_source_dominant_paving_studies(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            report = create(SOURCES, output)
            self.assertEqual(report["family"], "old-paving")
            self.assertEqual(len(list(output.glob("*.png"))), 12)
            self.assertEqual(report["compatibleEdgeMeanRgbGap"], 0)
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["rendererIntegration"])
            self.assertEqual([x["dominantSourceIntent"] for x in report["variants"]], list(range(1, 7)))
            self.assertTrue(all(x["approved"] is False for x in report["variants"]))
