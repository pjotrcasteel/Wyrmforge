"""Deterministic art-only organic Trampled Earth transition tests."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

location = Path(__file__).resolve().parents[1] / "build_trampled_organic_transitions.py"
spec = importlib.util.spec_from_file_location("organic_transitions", location)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class OrganicTransitionTests(unittest.TestCase):
    def test_six_transitions_are_source_exact_outside_boundary_and_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            bank = home / "bank"
            bank.mkdir()
            rows = []
            for number, role in enumerate(tool.ROLES, 1):
                yy, xx = np.indices((300, 128))
                pixels = np.stack(((xx + number*11)%256, (yy + number*19)%256,
                                   (xx + yy + number*7)%256), axis=-1).astype("uint8")
                name = f"{number:02d}-{role}-three-segment-strip.png"
                Image.fromarray(pixels).save(bank / name)
                rows.append({"role": role, "strip": name, "sha256": hashlib.sha256((bank / name).read_bytes()).hexdigest(), "approved": False, "gameIntegration": False})
            (bank / "manifest.json").write_text(json.dumps({"status": "unapproved-art-study", "variants": rows}))
            receipt = tool.build(bank, home / "first")
            self.assertEqual(len(receipt["transitions"]), 6)
            self.assertFalse(receipt["runtimeUse"])
            self.assertFalse(receipt["worldGeometryAuthored"])
            for i, item in enumerate(receipt["transitions"]):
                result = np.asarray(Image.open(home / "first" / item["file"]))
                start = np.asarray(Image.open(bank / rows[i]["strip"]))
                end = np.asarray(Image.open(bank / rows[(i+1)%6]["strip"]))
                self.assertTrue(np.array_equal(result[:60], start[:60]))
                self.assertTrue(np.array_equal(result[240:], end[240:]))
                self.assertLess(item["antialiasFraction"], .01)
                self.assertFalse(item["approved"])
                self.assertFalse(item["outputIsTileable"])
            tool.build(bank, home / "second")
            for item in receipt["transitions"]:
                self.assertEqual((home/"first"/item["file"]).read_bytes(), (home/"second"/item["file"]).read_bytes())
            with self.assertRaises(ValueError):
                tool.build(bank, bank / "illegal")
            filename = bank / rows[0]["strip"]
            unchanged = filename.read_bytes()
            filename.write_bytes(unchanged + b"altered")
            with self.assertRaises(ValueError):
                tool.build(bank, home / "tampered")
            filename.write_bytes(unchanged)
            rows[0]["approved"] = True
            (bank/"manifest.json").write_text(json.dumps({"status": "unapproved-art-study", "variants": rows}))
            with self.assertRaises(ValueError):
                tool.build(bank, home / "illegal")

    def test_boundaries_are_contiguous_and_broad(self):
        for seed in range(1,7):
            curve = tool.boundary(640,1600,seed)
            self.assertLess(np.max(np.abs(np.diff(curve))), 10)
            self.assertGreater(np.ptp(curve), 150)


if __name__ == "__main__":
    unittest.main()
