"""Art-only Wet Mud authoring: six originals → twelve visual variants; no renderer."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location("build_wet_mud_art_candidates", ROOT / "build_wet_mud_art_candidates.py")
ART = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ART)


class WetMudCandidateTests(unittest.TestCase):
    @staticmethod
    def fixture(base: Path) -> tuple[Path, dict[str, bytes]]:
        root = base / "sources"
        (root / "wet-mud").mkdir(parents=True)
        rng = np.random.default_rng(21)
        foundation = rng.integers(38, 109, (130, 130, 3), dtype=np.uint8)
        variants, originals = [], {}
        for i in range(6):
            rel = f"wet-mud/variant-{i + 1:02d}.webp"
            file = root / rel
            painting = np.clip(foundation.astype(np.int16) + i * 2, 0, 255).astype(np.uint8)
            Image.fromarray(painting).save(file, "WEBP", quality=92)
            raw = file.read_bytes()
            originals[rel] = raw
            variants.append({
                "id": f"wet-mud-{i+1:02d}",
                "file": rel,
                "size": [130, 130],
                "sha256": hashlib.sha256(raw).hexdigest(),
                "approval": "unreviewed",
            })
        (root / "manifest.json").write_text(json.dumps({
            "status": "review-only-not-approved", "families": [{"id": "wet-mud", "variants": variants}],
        }), encoding="utf-8")
        return root, originals

    def test_generate_all_twelve_visual_assets_and_verify_mutual_edges(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            root, originals = self.fixture(base)
            report = ART.create(
                root, base / "review", side=120, source_px=120,
                patch_size=40, overlap=10, candidates=18, border=8,
            )
            self.assertEqual(report["independentArtCount"], 6)
            self.assertEqual(report["crossCompatibleArtCount"], 6)
            self.assertEqual(report["identicalCrossTileEdgeComparisons"], 72)
            self.assertEqual(report["compatibleEdgeMeanRgbGap"], 0)
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["waterGeometryAuthored"])
            self.assertFalse(report["neutralDiffuseAuthored"])
            self.assertFalse(report["lightingEngineTouched"])
            self.assertEqual(len(report["variants"]), 6)
            self.assertTrue((base / "review" / report["independentReview"]).exists())
            self.assertTrue((base / "review" / report["mixedVariantReview"]).exists())
            for record in report["variants"]:
                self.assertEqual(set(record["sourceUsage"]), {f"{i+1:02d}" for i in range(6)})
                self.assertTrue(all(n > 0 for n in record["sourceUsage"].values()))
                for kind in ("independent", "compatible"):
                    asset = record[kind]
                    f = base / "review" / asset["file"]
                    self.assertTrue(f.is_file())
                    self.assertEqual(asset["sha256"], hashlib.sha256(f.read_bytes()).hexdigest())
                    with Image.open(f) as image:
                        self.assertEqual(image.size, (120, 120))
            self.assertEqual(originals, {k: (root / k).read_bytes() for k in originals})

    def test_archive_output_protected_and_hash_failures_are_fatal(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            root, originals = self.fixture(base)
            with self.assertRaises(ValueError):
                ART.create(root, root / "export", side=120, source_px=120,
                           patch_size=40, overlap=10, candidates=18, border=8)
            self.assertFalse((root / "export").exists())
            with self.assertRaises(ValueError):
                ART.create(root, base / "wrong", side=120, source_px=120,
                           patch_size=40, overlap=10, candidates=18, border=20)
            (root / "wet-mud/variant-01.webp").write_bytes(b"tampered")
            with self.assertRaises(ValueError):
                ART.create(root, base / "failed", side=120, source_px=120,
                           patch_size=40, overlap=10, candidates=18, border=8)
            self.assertFalse((base / "failed").exists())


if __name__ == "__main__":
    unittest.main()
