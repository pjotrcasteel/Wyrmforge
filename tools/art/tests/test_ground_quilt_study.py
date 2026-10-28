"""Deterministic, deliberately unapproved seam-cut research checks."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image


SCRIPT = Path(__file__).resolve().parents[1] / "quilt_ground_material_study.py"
SPEC = importlib.util.spec_from_file_location("quilt_ground_material_study", SCRIPT)
STUDY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(STUDY)


class SourceQuiltTests(unittest.TestCase):
    def test_boundary_finds_lowest_cost_adjacent_path(self):
        error = np.full((7, 15), 100.0, dtype=np.float32)
        error[3, :] = 0
        seam = STUDY.min_error_boundary(error)
        self.assertTrue(np.array_equal(seam, np.full(15, 3, dtype=seam.dtype)))
        self.assertTrue(np.all(np.abs(np.diff(seam)) <= 1))

    def test_seed_deterministic_and_source_arrays_immutable(self):
        sources = [
            np.random.default_rng(i).integers(0, 256, (90, 90, 3), dtype=np.uint8)
            for i in range(6)
        ]
        before = [x.copy() for x in sources]
        image_a, variants_a = STUDY.patch_quilt(
            sources, seed=9, width=96, patch_size=40, overlap=10, candidates=6
        )
        image_b, variants_b = STUDY.patch_quilt(
            sources, seed=9, width=96, patch_size=40, overlap=10, candidates=6
        )
        self.assertTrue(np.array_equal(image_a, image_b))
        self.assertEqual(variants_a, variants_b)
        self.assertEqual(image_a.shape, (96, 96, 3))
        self.assertTrue(np.any(image_a != 0))
        for old, new in zip(before, sources):
            self.assertTrue(np.array_equal(old, new))

    def test_balances_all_six_when_sources_have_comparable_overlap(self):
        # Six equally compatible source textures should not silently collapse to one.
        base = np.random.default_rng(23).integers(30, 80, (96, 96, 3), dtype=np.uint8)
        samples = [np.clip(base.astype(np.int16) + i, 0, 255).astype(np.uint8) for i in range(6)]
        quilt, variants = STUDY.patch_quilt(
            samples, seed=17, width=96, patch_size=40, overlap=10, candidates=12
        )
        self.assertEqual(quilt.shape, (96, 96, 3))
        self.assertEqual(set(variants), set(range(6)))
        self.assertLessEqual(max(variants.count(i) for i in range(6)) -
                             min(variants.count(i) for i in range(6)), 3)

    def test_preferred_source_anchors_first_patch(self):
        sources = [np.full((90, 90, 3), 40 + i * 15, dtype=np.uint8) for i in range(6)]
        for preferred in range(6):
            _, chosen = STUDY.patch_quilt(sources, seed=11, width=96, patch_size=40,
                                          overlap=10, candidates=12, preferred_source=preferred,
                                          preference_weight=.75)
            self.assertEqual(chosen[0], preferred)

    def test_source_preference_changes_selection_without_mutating_inputs(self):
        sources = [np.full((90, 90, 3), 60 + i, dtype=np.uint8) for i in range(6)]
        before = [a.copy() for a in sources]
        _, first = STUDY.patch_quilt(sources, seed=17, width=96, patch_size=40, overlap=10,
                                     candidates=12, diversity_strength=0, preferred_source=0, preference_weight=1)
        _, last = STUDY.patch_quilt(sources, seed=17, width=96, patch_size=40, overlap=10,
                                    candidates=12, diversity_strength=0, preferred_source=5, preference_weight=1)
        self.assertGreater(first.count(0), last.count(0))
        self.assertGreater(last.count(5), first.count(5))
        self.assertTrue(all(np.array_equal(a, b) for a, b in zip(before, sources)))

    def test_diversity_strength_range_and_candidate_floor(self):
        samples = [np.zeros((80, 80, 3), dtype=np.uint8) for _ in range(6)]
        with self.assertRaises(ValueError):
            STUDY.patch_quilt(samples, width=80, patch_size=30, overlap=8, candidates=5)
        with self.assertRaises(ValueError):
            STUDY.patch_quilt(samples, width=80, patch_size=30, overlap=8, diversity_strength=-0.1)
        with self.assertRaises(ValueError):
            STUDY.patch_quilt(samples, width=80, patch_size=30, overlap=8, diversity_strength=1.1)

    def test_synthetic_manifest_and_all_art_originals_remain_untouched(self):
        with tempfile.TemporaryDirectory() as path:
            root = Path(path) / "sources"
            output = Path(path) / "review"
            root.mkdir()
            all_families = []
            old_data = {}
            for family in STUDY.FAMILIES:
                items = []
                for index in range(1, 7):
                    rel = f"{family}/variant-{index:02d}.webp"
                    source_file = root / rel
                    source_file.parent.mkdir(exist_ok=True)
                    Image.new("RGB", (192, 192), (index * 20, index * 11, 30)).save(
                        source_file, "WEBP", quality=92
                    )
                    data = source_file.read_bytes()
                    old_data[rel] = data
                    items.append({
                        "id": f"{family}-{index:02d}",
                        "file": rel,
                        "size": [192, 192],
                        "sha256": hashlib.sha256(data).hexdigest(),
                        "approval": "unreviewed",
                    })
                all_families.append({"id": family, "variants": items})
            (root / "manifest.json").write_text(json.dumps({
                "status": "review-only-not-approved",
                "families": all_families,
            }), encoding="utf-8")
            with self.assertRaises(ValueError):
                STUDY.create(root, root / "study")
            first = STUDY.load_family(root, "grass-moss", source_px=192)
            self.assertEqual(len(first), 6)
            sample, variants = STUDY.patch_quilt(
                first, seed=17, width=160, patch_size=64, overlap=12, candidates=6
            )
            self.assertEqual(sample.shape, (160, 160, 3))
            self.assertGreater(len(variants), 2)
            self.assertTrue(all(0 <= idx < 6 for idx in variants))
            self.assertEqual(old_data, {k: (root / k).read_bytes() for k in old_data})
            damaged = root / "grass-moss" / "variant-01.webp"
            damaged.write_bytes(b"BROKEN")
            with self.assertRaises(ValueError):
                STUDY.load_family(root, "grass-moss", source_px=192)

    def test_reject_invalid_sources_and_patch_settings(self):
        a = np.zeros((80, 80, 3), dtype=np.uint8)
        with self.assertRaises(ValueError):
            STUDY.patch_quilt([a] * 5)
        with self.assertRaises(ValueError):
            STUDY.patch_quilt([a] * 6, width=80, patch_size=30, overlap=17)
        with self.assertRaises(ValueError):
            STUDY.patch_quilt([a] * 6, width=80, patch_size=30, overlap=8, candidates=0)


if __name__ == "__main__":
    unittest.main()
