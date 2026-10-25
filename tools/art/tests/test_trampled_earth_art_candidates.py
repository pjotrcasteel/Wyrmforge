"""Source-preserving Trampled Earth art exporter tests (not road or runtime tests)."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_trampled_earth_art_candidates import create
from quilt_ground_material_study import SOURCES


class TrampledEarthArtTests(unittest.TestCase):
    def test_rejects_writing_inside_original_source_archive(self):
        with self.assertRaises(ValueError):
            create(SOURCES, SOURCES / "generated")

    def test_source_family_is_supported(self):
        from build_wet_mud_art_candidates import FAMILY
        self.assertEqual(FAMILY, "wet-mud")

    def test_candidate_output_has_twelve_unapproved_images(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = create(SOURCES, output)
            self.assertEqual(result["family"], "trampled-earth")
            self.assertEqual(result["independentArtCount"], 6)
            self.assertEqual(result["crossCompatibleArtCount"], 6)
            self.assertEqual(result["identicalCrossTileEdgeComparisons"], 72)
            self.assertFalse(result["runtimeUse"])
            self.assertFalse(result["rendererIntegration"])
            self.assertEqual(len(list(output.glob("*.png"))), 12)
            self.assertTrue((output / "trampled-earth-art-candidates.json").is_file())


if __name__ == "__main__":
    unittest.main()
