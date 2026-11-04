"""Ensure visual triage never promotes candidates automatically."""
import sys
import json
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ground_art_visual_triage import summarize, FAMILIES

class GroundArtVisualTriageTests(unittest.TestCase):
    def test_rejects_approved_art_and_reports_nearest_neighbors(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for family in FAMILIES:
                folder = root / f"{family}-art-candidates"
                folder.mkdir()
                variants = [{"candidate": i, "approved": False, "visualRoleVerified": False,
                             "dominantSourceActual": i, "dominantSourceIntent": i if family != "wet-mud" else None,
                             "nearestVisualDifferenceRgb": float(i)} for i in range(1, 7)]
                payload = {"family": family, "status": "unapproved-artwork",
                           "runtimeUse": False, "rendererIntegration": False, "variants": variants}
                (folder / f"{family}-art-candidates.json").write_text(json.dumps(payload))
            report = summarize(root)
            self.assertFalse(report["automaticArtApproval"])
            self.assertEqual(len(report["families"]), 5)
            self.assertTrue(all(x["needsHumanArtReview"] for x in report["families"]))
            family = FAMILIES[0]
            path = root / f"{family}-art-candidates" / f"{family}-art-candidates.json"
            payload = json.loads(path.read_text())
            payload["variants"][0]["approved"] = True
            path.write_text(json.dumps(payload))
            with self.assertRaises(ValueError):
                summarize(root)
