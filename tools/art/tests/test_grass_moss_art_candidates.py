"""Tests for seam-safe Grass/Moss artwork candidates (not runtime rendering)."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

PATH = Path(__file__).resolve().parents[1] / "build_grass_moss_art_candidates.py"
sys.path.insert(0, str(PATH.parent))
SPEC = importlib.util.spec_from_file_location("build_grass_moss_art_candidates", PATH)
AUTHOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUTHOR)


class GrassMossArtCandidateTests(unittest.TestCase):
    def test_periodic_correction_exact_boundaries_preserves_interiors_and_inputs(self):
        rng = np.random.default_rng(41)
        src = rng.integers(25, 154, (80, 96, 3), dtype=np.uint8)
        before = src.copy()
        result = AUTHOR.periodic_component(src)
        np.testing.assert_array_equal(src, before)
        self.assertEqual(result.shape, src.shape)
        self.assertEqual(AUTHOR.seam_metrics(result)["meanRgbGapLeftRight"], 0)
        self.assertEqual(AUTHOR.seam_metrics(result)["meanRgbGapTopBottom"], 0)
        self.assertGreater(result.std(), 15)
        self.assertLess(np.abs(result.astype(np.int16) - src.astype(np.int16)).mean(), 5)

        flat = np.full((64, 64, 3), (34, 64, 41), dtype=np.uint8)
        np.testing.assert_array_equal(AUTHOR.periodic_component(flat), flat)
        with self.assertRaises(ValueError):
            AUTHOR.periodic_component(np.zeros((8, 8, 3), dtype=np.uint8))

    def test_repeat_preview_has_correct_pure_art_dimensions(self):
        tile = Image.new("RGB", (48, 48), "#33291f")
        repeat = AUTHOR.repeat2(tile)
        self.assertEqual(repeat.size, (96, 96))
        self.assertEqual(AUTHOR.build_preview([tile] * 6).size, (1410, 950))
        with self.assertRaises(ValueError):
            AUTHOR.build_preview([tile] * 5)

    def test_source_archive_cannot_be_output_destination(self):
        with tempfile.TemporaryDirectory() as location:
            root = Path(location)
            with self.assertRaises(ValueError):
                AUTHOR.build(root, root / "derived")
            self.assertFalse((root / "derived").exists())

    def test_full_six_candidate_build_references_six_verified_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "originals"
            out = Path(tmp) / "qa"
            root.mkdir()
            variants = []
            originals = {}
            for i in range(6):
                rel = f"grass-moss/variant-{i + 1:02d}.webp"
                path = root / rel
                path.parent.mkdir(exist_ok=True)
                rng = np.random.default_rng(74)
                arr = rng.integers(30, 115, (610, 610, 3), dtype=np.uint8)
                arr = np.clip(arr.astype(np.int16) + i, 0, 255).astype(np.uint8)
                Image.fromarray(arr).save(path, "WEBP", quality=92)
                raw = path.read_bytes()
                originals[rel] = raw
                variants.append({
                    "id": f"grass-moss-{i+1:02d}",
                    "file": rel, "size": [610, 610], "sha256": hashlib.sha256(raw).hexdigest(),
                    "approval": "unreviewed",
                })
            (root / "manifest.json").write_text(json.dumps({
                "status": "review-only-not-approved",
                "families": [{"id": "grass-moss", "variants": variants}],
            }), encoding="utf-8")

            report = AUTHOR.build(root, out)
            self.assertEqual(report["candidateCount"], 6)
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["ownerApproved"])
            self.assertEqual(len(report["variants"]), 6)
            self.assertTrue((out / report["preview"]).is_file())
            for variant in report["variants"]:
                self.assertEqual(variant["size"], [900, 900])
                self.assertFalse(variant["productionUse"])
                self.assertFalse(variant["relightableAlbedo"])
                self.assertEqual(set(variant["sourceUsage"]), {f"{i+1:02d}" for i in range(6)})
                self.assertTrue(all(c > 0 for c in variant["sourceUsage"].values()))
                self.assertEqual(variant["metrics"]["meanRgbGapLeftRight"], 0)
                self.assertEqual(variant["metrics"]["meanRgbGapTopBottom"], 0)
                self.assertLessEqual(variant["metrics"]["leftInteriorGradientRatio"], 2)
                self.assertLessEqual(variant["metrics"]["topInteriorGradientRatio"], 2)
                img = out / variant["file"]
                self.assertEqual(variant["sha256"], hashlib.sha256(img.read_bytes()).hexdigest())
            self.assertEqual({r: (root / r).read_bytes() for r in originals}, originals)

            (root / variants[0]["file"]).write_bytes(b"TAMPERED")
            with self.assertRaises(ValueError):
                AUTHOR.build(root, Path(tmp) / "retry")


if __name__ == "__main__":
    unittest.main()
